const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildCatalog,
  buildCatalogFromData,
  collectPaginated,
  flattenEvolutionPaths,
  requestJsonWithRetry,
  writeCatalogAtomically,
} = require('../scripts/catalog-builder.cjs');
const { loadAnimatedSpriteOverrides } = require('../scripts/build-pokemon-catalog.cjs');

const ROOT = path.resolve(__dirname, '..');
const SPRITE_REVISION = 'fixture-sprites-revision';

function species(id, generation, name, captureRate, varieties = [{ is_default: true, pokemon: { url: `https://pokeapi.co/api/v2/pokemon/${id}/` } }]) {
  return {
    id,
    generation: { name: `generation-${['zero', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][generation] || generation}` },
    names: [
      { name, language: { name: 'en' } },
      { name, language: { name: 'it' } },
    ],
    capture_rate: captureRate,
    is_legendary: false,
    is_mythical: false,
    varieties,
  };
}

function pokemon(id, name, sprites = {}) {
  return {
    id,
    name,
    is_default: true,
    sprites: {
      front_default: sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/fixture/${id}.png`,
      front_shiny: sprites.front_shiny || null,
      other: sprites.other || {},
      versions: sprites.versions || {},
    },
  };
}

function urlId(value) {
  return Number(String(value).split('/').filter(Boolean).at(-1));
}

function fixtureData() {
  const speciesRows = [
    species(1, 1, 'Bulbasaur', 45),
    species(56, 1, 'Mankey', 190),
    species(57, 1, 'Primeape', 75),
    species(979, 9, 'Annihilape', 45),
    species(133, 1, 'Eevee', 45, [
      { is_default: true, pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/133/' } },
      { is_default: false, pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/10001/' } },
    ]),
    species(134, 1, 'Vaporeon', 45),
    species(135, 1, 'Jolteon', 45),
    species(501, 5, 'Oshawott', 45),
    species(906, 9, 'Sprigatito', 45),
    species(132, 1, 'Ditto', 35),
    species(2000, 10, 'Futuremon', 255),
  ];
  const evolutionChains = [
    {
      id: 1,
      chain: {
        species: { url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
        evolves_to: [],
      },
    },
    {
      id: 56,
      chain: {
        species: { url: 'https://pokeapi.co/api/v2/pokemon-species/56/' },
        evolves_to: [{
          species: { url: 'https://pokeapi.co/api/v2/pokemon-species/57/' },
          evolves_to: [{ species: { url: 'https://pokeapi.co/api/v2/pokemon-species/979/' }, evolves_to: [] }],
        }],
      },
    },
    {
      id: 133,
      chain: {
        species: { url: 'https://pokeapi.co/api/v2/pokemon-species/133/' },
        evolves_to: [
          { species: { url: 'https://pokeapi.co/api/v2/pokemon-species/134/' }, evolves_to: [] },
          { species: { url: 'https://pokeapi.co/api/v2/pokemon-species/135/' }, evolves_to: [] },
        ],
      },
    },
    {
      id: 132,
      chain: {
        species: { url: 'https://pokeapi.co/api/v2/pokemon-species/132/' },
        evolves_to: [],
      },
    },
  ];
  const pokemonRows = new Map([
    [1, pokemon(1, 'bulbasaur', { front_shiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/shiny/1.png' })],
    [56, pokemon(56, 'mankey', { versions: { 'generation-v': { 'black-white': { front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/56.png', front_shiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/shiny/56.png', animated: { front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/animated/56.gif', front_shiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/animated/shiny/56.gif' } } } } })],
    [57, pokemon(57, 'primeape')],
    [979, pokemon(979, 'annihilape')],
    [133, pokemon(133, 'eevee')],
    [10001, pokemon(10001, 'eevee-alternate', { front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/forms/10001.png' })],
    [134, pokemon(134, 'vaporeon')],
    [135, pokemon(135, 'jolteon')],
    [501, pokemon(501, 'oshawott')],
    [906, pokemon(906, 'sprigatito')],
    [132, pokemon(132, 'ditto')],
  ]);
  return { speciesRows, evolutionChains, pokemonRows };
}

test('collectPaginated follows next until null and never invents a page', async () => {
  const calls = [];
  const pages = new Map([
    ['page-1', { results: [{ id: 1 }, { id: 2 }], next: 'page-2' }],
    ['page-2', { results: [{ id: 3 }], next: null }],
  ]);
  const result = await collectPaginated('page-1', async (url) => {
    calls.push(url);
    return pages.get(url);
  });
  assert.deepEqual(result, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.deepEqual(calls, ['page-1', 'page-2']);
});

test('buildCatalog injects paginated fetch, cache, and output without public network', async () => {
  const data = fixtureData();
  const rowsById = new Map(data.speciesRows.map((row) => [row.id, row]));
  const chainsById = new Map(data.evolutionChains.map((row) => [row.id, row]));
  const refs = data.speciesRows.map((row) => ({ name: row.name || `species-${row.id}`, url: `species/${row.id}` }));
  const pages = new Map([
    ['species-page', { results: refs.slice(0, 6), next: 'species-page-2' }],
    ['species-page-2', { results: refs.slice(6), next: null }],
  ]);
  const pokemonByUrl = new Map([...data.pokemonRows.values()].map((row) => [`pokemon/${row.id}`, row]));
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (pages.has(url)) return pages.get(url);
    if (url.startsWith('species/')) return rowsById.get(Number(url.split('/').at(-1)));
    if (url.startsWith('chain/')) return chainsById.get(Number(url.split('/').at(-1)));
    if (url.startsWith('pokemon/') || /\/pokemon\/\d+\/?$/.test(url)) return pokemonByUrl.get(`pokemon/${url.split('/').filter(Boolean).at(-1)}`);
    throw new Error(`unexpected fixture URL ${url}`);
  };
  for (const row of data.speciesRows) row.evolution_chain = row.id === 1 || row.id === 56 || row.id === 133 || row.id === 132
    ? { url: `chain/${row.id}` }
    : null;
  const cache = new Map();
  let outputCall;
  const options = {
    fetchJson,
    cache,
    outputPath: 'fixture-output.json',
    writeCatalog: async (destination, catalog) => { outputCall = { destination, catalog }; },
    endpoints: { species: 'species-page' },
    source: { provider: 'fixture', snapshot: 'async-fixture' },
    spritesRevision: SPRITE_REVISION,
    retries: 0,
    now: () => new Date('2026-09-17T00:00:00.000Z'),
  };
  const first = await buildCatalog(options);
  assert.ok(calls.length > 0);
  assert.equal(outputCall.destination, 'fixture-output.json');
  assert.equal(outputCall.catalog.catalogVersion, first.catalogVersion);
  const callsAfterFirst = calls.length;
  const second = await buildCatalog({ ...options, fetchJson: async () => { throw new Error('network must be cached'); } });
  assert.equal(calls.length, callsAfterFirst);
  assert.equal(second.catalogVersion, first.catalogVersion);
});

test('flattenEvolutionPaths preserves branches and modern species IDs', () => {
  const paths = flattenEvolutionPaths({
    species: { url: 'https://pokeapi.co/api/v2/pokemon-species/56/' },
    evolves_to: [{
      species: { url: 'https://pokeapi.co/api/v2/pokemon-species/57/' },
      evolves_to: [{ species: { url: 'https://pokeapi.co/api/v2/pokemon-species/979/' }, evolves_to: [] }],
    }],
  });
  assert.deepEqual(paths, [[56, 57, 979]]);
  assert.deepEqual(flattenEvolutionPaths({
    species: { url: 'https://pokeapi.co/api/v2/pokemon-species/133/' },
    evolves_to: [
      { species: { url: 'https://pokeapi.co/api/v2/pokemon-species/134/' }, evolves_to: [] },
      { species: { url: 'https://pokeapi.co/api/v2/pokemon-species/135/' }, evolves_to: [] },
    ],
  }), [[133, 134], [133, 135]]);
});

test('buildCatalogFromData creates one root line, keeps branches, and excludes only Ditto from the pool', () => {
  const data = fixtureData();
  const catalog = buildCatalogFromData({
    ...data,
    overrides: { '1': 'common' },
    source: { provider: 'fixture', snapshot: 'builder-fixture', generations: [1, 5, 9], generatedAt: 'volatile' },
    spritesRevision: SPRITE_REVISION,
  });
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(catalog.lines.some((row) => row.id === 132), false);
  assert.equal(catalog.lines.find((row) => row.id === 56).line.pathOptions[0].at(-1), 979);
  assert.equal(catalog.lines.find((row) => row.id === 133).line.pathOptions.length, 2);
  assert.equal(catalog.lines.find((row) => row.id === 1).rarity, 'common');
  assert.ok(catalog.species['132']);
  assert.ok(catalog.variants['pokemon:132']);
  assert.ok(catalog.species['2000'] === undefined, 'generation X is not included');
  assert.equal(catalog.species['133'].variantKeys.includes('pokemon:10001'), true);
  assert.equal(catalog.variants['pokemon:10001'].speciesId, 133);
  assert.equal(catalog.variants['pokemon:10001'].isDefault, false);
  assert.equal(catalog.catalogVersion, buildCatalogFromData({
    ...data,
    overrides: { '1': 'common' },
    source: { provider: 'fixture', snapshot: 'builder-fixture', generations: [1, 5, 9], generatedAt: 'different' },
    spritesRevision: SPRITE_REVISION,
  }).catalogVersion);
});

test('builder assigns egg rarity from the old capture-rate model rather than evolution-line length', () => {
  const data = fixtureData();
  const catalog = buildCatalogFromData({
    ...data,
    source: { provider: 'fixture', snapshot: 'line-rarity' },
    spritesRevision: SPRITE_REVISION,
  });
  assert.equal(catalog.lines.find((row) => row.id === 1).line.rarity, 'rare');
  assert.equal(catalog.lines.find((row) => row.id === 56).line.rarity, 'common');
  assert.equal(catalog.lines.find((row) => row.id === 133).line.rarity, 'rare');
  assert.equal(catalog.lines.find((row) => row.id === 501).line.rarity, 'rare');
});

test('builder derives exact sprite URLs, separates shiny, and prioritizes Gen V candidates', () => {
  const data = fixtureData();
  const catalog = buildCatalogFromData({ ...data, source: { provider: 'fixture', snapshot: 'sprites' }, spritesRevision: SPRITE_REVISION });
  const variant = catalog.variants['pokemon:56'];
  assert.deepEqual(variant.sprites.shiny.map((candidate) => candidate.sourceUrl), [
    'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/animated/shiny/56.gif',
    'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/shiny/56.png',
  ]);
  assert.equal(variant.sprites.normal[0].sourceUrl, 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/gen5/animated/56.gif');
  assert.equal(variant.sprites.normal[0].animated, true);
  assert.equal(variant.sprites.normal.every((candidate) => candidate.sourceUrl), true);
  assert.equal(variant.sprites.normal.some((candidate) => candidate.sourceUrl.includes('649')), false);
  assert.equal(variant.sprites.normal.every((candidate) => candidate.localPath === null && candidate.packageAllowed === false), true);
});

test('builder prepends a verified animated override for the exact Pokémon variant', () => {
  const data = fixtureData();
  const spriteOverrides = {
    'pokemon:979': {
      normal: [{
        provider: 'showdown',
        style: 'auto',
        animated: true,
        sourceUrl: 'https://play.pokemonshowdown.com/sprites/xyani/annihilape.gif',
        localPath: null,
        sha256: null,
        licenseRef: 'showdown-sprites-rights-pending',
        packageAllowed: false,
      }],
      shiny: [{
        provider: 'showdown',
        style: 'auto',
        animated: true,
        sourceUrl: 'https://play.pokemonshowdown.com/sprites/xyani-shiny/annihilape.gif',
        localPath: null,
        sha256: null,
        licenseRef: 'showdown-sprites-rights-pending',
        packageAllowed: false,
      }],
    },
  };
  const catalog = buildCatalogFromData({ ...data, spriteOverrides, source: { provider: 'fixture' } });
  const variant = catalog.variants['pokemon:979'];
  assert.equal(variant.sprites.normal[0].provider, 'showdown');
  assert.equal(variant.sprites.normal[0].animated, true);
  assert.equal(variant.sprites.normal[0].packageAllowed, false);
  assert.equal(variant.sprites.shiny[0].sourceUrl, 'https://play.pokemonshowdown.com/sprites/xyani-shiny/annihilape.gif');
});

test('builder maps PokeAPI other/showdown normal and shiny GIFs for any variant', () => {
  const data = fixtureData();
  data.pokemonRows.get(906).sprites.other = {
    showdown: {
      front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/906.gif',
      front_shiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/906.gif',
    },
  };
  const catalog = buildCatalogFromData({ ...data, source: { provider: 'fixture' }, spritesRevision: SPRITE_REVISION });
  const variant = catalog.variants['pokemon:906'];
  const normal = variant.sprites.normal.find((candidate) => candidate.provider === 'showdown');
  const shiny = variant.sprites.shiny.find((candidate) => candidate.provider === 'showdown');
  assert.equal(normal.sourceUrl, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/906.gif');
  assert.equal(shiny.sourceUrl, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/906.gif');
  assert.equal(normal.animated, true);
  assert.equal(shiny.animated, true);
  assert.equal(normal.packageAllowed, false);
  assert.equal(shiny.packageAllowed, false);
});

test('checked-in animated override manifest is finite, target-scoped, and non-packaging', () => {
  const overrides = loadAnimatedSpriteOverrides();
  assert.deepEqual(Object.keys(overrides).sort(), ['pokemon:650', 'pokemon:906', 'pokemon:979']);
  for (const key of Object.keys(overrides)) {
    assert.deepEqual(Object.keys(overrides[key]).sort(), ['normal', 'shiny']);
    for (const variant of ['normal', 'shiny']) {
      assert.equal(overrides[key][variant].length, 1);
      const candidate = overrides[key][variant][0];
      assert.equal(candidate.provider, 'showdown');
      assert.equal(candidate.style, 'auto');
      assert.equal(candidate.animated, true);
      assert.equal(candidate.packageAllowed, false);
      assert.equal(candidate.localPath, null);
      assert.match(candidate.sourceUrl, /^https:\/\/play\.pokemonshowdown\.com\/sprites\/xyani(-shiny)?\/.+\.gif$/);
    }
  }
});

test('builder pins PokeAPI master sprite URLs to the recorded sprites revision', () => {
  const data = fixtureData();
  const revision = 'a'.repeat(40);
  data.pokemonRows.get(1).sprites.front_default = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
  const catalog = buildCatalogFromData({ ...data, spritesRevision: revision, source: { provider: 'fixture' } });
  assert.equal(catalog.variants['pokemon:1'].sprites.normal[0].sourceUrl, `https://raw.githubusercontent.com/PokeAPI/sprites/${revision}/sprites/pokemon/1.png`);
});

test('invalid source data fails loudly instead of producing partial common rows', () => {
  const data = fixtureData();
  data.speciesRows = data.speciesRows.map((row) => row.id === 56 ? { ...row, capture_rate: null } : row);
  assert.throws(() => buildCatalogFromData({ ...data, source: { provider: 'fixture' } }), /capture_rate/);
  assert.throws(() => flattenEvolutionPaths({ evolves_to: [] }), /species/);
});

test('requestJsonWithRetry retries finite transient failures and then stops', async () => {
  let attempts = 0;
  const value = await requestJsonWithRetry('fixture://retry', {
    retries: 2,
    fetchJson: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient');
      return { ok: true };
    },
  });
  assert.deepEqual(value, { ok: true });
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(() => requestJsonWithRetry('fixture://fail', {
    retries: 1,
    fetchJson: async () => {
      attempts += 1;
      throw new Error('permanent');
    },
  }), /permanent/);
  assert.equal(attempts, 2);
});

test('atomic writer promotes valid output and leaves no temporary file', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-catalog-builder-'));
  try {
    const destination = path.join(directory, 'pokemon-catalog.json');
    const catalog = buildCatalogFromData({ ...fixtureData(), source: { provider: 'fixture' } });
    await writeCatalogAtomically(destination, catalog);
    assert.deepEqual(JSON.parse(fs.readFileSync(destination, 'utf8')), catalog);
    assert.deepEqual(fs.readdirSync(directory), ['pokemon-catalog.json']);
    const previous = fs.readFileSync(destination, 'utf8');
    await assert.rejects(() => writeCatalogAtomically(destination, { schemaVersion: 1 }), /catalog|schema/i);
    assert.equal(fs.readFileSync(destination, 'utf8'), previous);
    assert.deepEqual(fs.readdirSync(directory), ['pokemon-catalog.json']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('builder accepts URLs and IDs from source records without translated-name slug guessing', () => {
  const data = fixtureData();
  data.speciesRows = data.speciesRows.filter((row) => [133, 10001].includes(row.id));
  data.evolutionChains = [{ id: 133, chain: { species: { url: 'https://pokeapi.co/api/v2/pokemon-species/133/' }, evolves_to: [] } }];
  data.pokemonRows = new Map([[133, pokemon(133, 'eevee')], [10001, pokemon(10001, 'unown-b', { front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/201-b.png' })]]);
  data.speciesRows[0].varieties = [
    { is_default: true, pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/133/' } },
    { is_default: false, pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/10001/' } },
  ];
  const catalog = buildCatalogFromData({ ...data, source: { provider: 'fixture' } });
  assert.equal(catalog.variants['pokemon:10001'].sprites.normal[0].sourceUrl, 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/201-b.png');
  assert.equal(urlId(catalog.variants['pokemon:10001'].sourceUrl || 'https://pokeapi.co/api/v2/pokemon/10001/'), 10001);
});
