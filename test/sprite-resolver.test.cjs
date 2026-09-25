const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolveSpriteCandidates } = require('../core/sprite-resolver.cjs');
const { catalogDigest } = require('../core/catalog-contract.cjs');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'test', 'fixtures', 'catalog-v2.json');
const shippedCatalogPath = path.join(root, 'assets', 'pokemon-catalog.json');

function loadCatalog() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function sprite({ provider, kind, sourceUrl, animated = false, shiny = false, localPath = null, packageAllowed = false }) {
  return {
    provider,
    kind,
    style: kind === 'gen5' ? 'pixel-gen5' : 'auto',
    animated,
    sourceUrl,
    localPath,
    sha256: localPath ? 'a'.repeat(64) : null,
    licenseRef: 'fixture-synthetic',
    packageAllowed,
    shiny,
  };
}

function orderedCatalog({ shiny = true, duplicate = false } = {}) {
  const catalog = loadCatalog();
  const variant = catalog.variants['pokemon:1'];
  const remote = [
    sprite({ provider: 'showdown', kind: 'showdown', animated: true, sourceUrl: 'https://play.pokemonshowdown.com/sprites/xyani/bulbasaur.gif' }),
    sprite({ provider: 'game-assets', kind: 'game', animated: true, sourceUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/versions/generation-v/animated/game-1.gif' }),
    sprite({ provider: 'pokeapi', kind: 'static', sourceUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/pokemon/1.png' }),
  ];
  variant.sprites.normal = [
    sprite({ provider: 'pokeapi', kind: 'gen5', animated: true, sourceUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/versions/generation-v/animated/1.gif' }),
    ...remote,
    sprite({ provider: 'pokeapi', kind: 'local', sourceUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/local/1.png', localPath: 'sprites/local-1.png', packageAllowed: true }),
  ];
  if (duplicate) variant.sprites.normal.splice(4, 0, { ...remote[1] });
  variant.sprites.shiny = shiny
    ? [
      sprite({ provider: 'showdown', kind: 'showdown', animated: true, sourceUrl: 'https://play.pokemonshowdown.com/sprites/xyani/bulbasaur-shiny.gif', shiny: true }),
      sprite({ provider: 'pokeapi', kind: 'local', sourceUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/local/1-shiny.png', localPath: 'sprites/local-1-shiny.png', packageAllowed: true, shiny: true }),
    ]
    : [];
  catalog.catalogVersion = catalogDigest(catalog);
  return catalog;
}

test('auto returns only animated candidates when animation exists', () => {
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: false }, orderedCatalog());
  assert.deepEqual(result.map((candidate) => [candidate.provider, candidate.animated, candidate.fallbackKind]), [
    ['showdown', true, null],
    ['game-assets', true, null],
    ['pokeapi', true, null],
  ]);
  assert.equal(result.every((candidate) => candidate.shiny === false && candidate.animated === true), true);
});

test('shipped Gen I-IX catalog uses static art only when no animated candidate exists', () => {
  const catalog = JSON.parse(fs.readFileSync(shippedCatalogPath, 'utf8'));
  let requests = 0;
  for (const [variantKey, variant] of Object.entries(catalog.variants)) {
    for (const shiny of [false, true]) {
      for (const style of ['auto', 'pixel-gen5']) {
        const result = resolveSpriteCandidates({
          speciesId: variant.speciesId,
          variantKey,
          shiny,
          style,
          offline: false,
        }, catalog);
        requests += 1;
        assert.ok(result.length > 0, `${variantKey} ${style} ${shiny ? 'shiny' : 'normal'} must resolve`);
        const staticFallback = result.some((candidate) => candidate.fallbackKind === 'static');
        assert.equal(
          result.every((candidate) => candidate.animated === true || candidate.fallbackKind),
          true,
          `${variantKey} ${style} ${shiny ? 'shiny' : 'normal'} returned an invalid sprite`,
        );
        if (staticFallback) assert.equal(result.every((candidate) => candidate.animated === false), true);
      }
    }
  }
  assert.ok(requests >= 5000, `expected the full shipped catalog, got ${requests} requests`);
});

test('verified target overrides resolve animated normal and shiny sprites in both styles', () => {
  const catalog = JSON.parse(fs.readFileSync(shippedCatalogPath, 'utf8'));
  const expected = {
    650: 'chespin',
    906: 'sprigatito',
    979: 'annihilape',
  };
  for (const [speciesId, slug] of Object.entries(expected)) {
    for (const shiny of [false, true]) {
      for (const style of ['auto', 'pixel-gen5']) {
        const result = resolveSpriteCandidates({
          speciesId: Number(speciesId),
          shiny,
          style,
          offline: false,
        }, catalog);
        assert.equal(result[0].provider, 'showdown', `${speciesId} ${style} ${shiny ? 'shiny' : 'normal'} provider`);
        assert.equal(result[0].animated, true);
        assert.match(result[0].src, new RegExp(`/xyani${shiny ? '-shiny' : ''}/${slug}\\.gif$`));
      }
    }
  }
});

test('pixel-gen5 puts verified Gen V candidates before Showdown even when Showdown exists', () => {
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'pixel-gen5', offline: false }, orderedCatalog());
  assert.equal(result[0].provider, 'pokeapi');
  assert.equal(result[0].animated, true);
  assert.equal(result[0].fallbackKind, null);
  assert.equal(result[1].provider, 'showdown');
});

test('pixel-gen5 falls back to the auto chain when no Gen V candidate exists', () => {
  const catalog = orderedCatalog();
  catalog.variants['pokemon:1'].sprites.normal = catalog.variants['pokemon:1'].sprites.normal.filter((candidate) => candidate.kind !== 'gen5');
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'pixel-gen5', offline: false }, catalog);
  assert.equal(result[0].provider, 'showdown');
  assert.deepEqual(result.map((candidate) => [candidate.provider, candidate.animated]), [
    ['showdown', true],
    ['game-assets', true],
  ]);
});

test('auto uses the static candidate when no animated candidate exists', () => {
  const catalog = orderedCatalog();
  catalog.variants['pokemon:1'].sprites.normal = catalog.variants['pokemon:1'].sprites.normal
    .filter((candidate) => candidate.animated !== true);
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: false }, catalog);
  assert.equal(result[0].src, 'https://raw.githubusercontent.com/PokeAPI/sprites/fixture/pokemon/1.png');
  assert.equal(result[0].provider, 'pokeapi');
  assert.equal(result[0].animated, false);
  assert.equal(result[0].shiny, false);
  assert.equal(result[0].fallbackKind, 'static');
  assert.equal(result.every((candidate) => candidate.animated === false), true);
});

test('the eight missing animated species use real normal and shiny static sprites', () => {
  const catalog = JSON.parse(fs.readFileSync(shippedCatalogPath, 'utf8'));
  const missingAnimatedIds = [990, 991, 993, 1010, 1017, 1022, 1023, 1025];
  for (const speciesId of missingAnimatedIds) {
    for (const shiny of [false, true]) {
      for (const style of ['auto', 'pixel-gen5']) {
        const result = resolveSpriteCandidates({ speciesId, shiny, style, offline: false }, catalog);
        assert.ok(result.length > 0, `${speciesId} ${style} ${shiny ? 'shiny' : 'normal'} must resolve`);
        assert.equal(result.every((candidate) => candidate.animated === false), true);
        assert.equal(result.every((candidate) => candidate.fallbackKind === 'static' || candidate.fallbackKind === 'local'), true);
        assert.equal(result.every((candidate) => candidate.shiny === shiny), true);
        assert.notEqual(result[0].src, 'assets/pokemon-placeholder.svg');
      }
    }
  }
});

test('shiny requests use only shiny candidates and never substitute normal art', () => {
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: true, style: 'auto', offline: false }, orderedCatalog());
  assert.equal(result.length, 1);
  assert.equal(result.every((candidate) => candidate.shiny === true), true);
  assert.equal(result.every((candidate) => candidate.animated === true), true);
  assert.equal(result.some((candidate) => candidate.src.includes('/pokemon/1.png')), false);
});

test('missing shiny returns a local missing-shiny placeholder', () => {
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: true, style: 'auto', offline: false }, orderedCatalog({ shiny: false }));
  assert.deepEqual(result, [{
    src: 'assets/pokemon-placeholder.svg',
    provider: 'local',
    animated: false,
    shiny: true,
    fallbackKind: 'missing-shiny',
  }]);
});

test('offline removes remote animated candidates and returns a placeholder without static art', () => {
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: true }, orderedCatalog());
  assert.deepEqual(result, [{
    src: 'assets/pokemon-placeholder.svg',
    provider: 'local',
    animated: false,
    shiny: false,
    fallbackKind: 'offline-missing',
  }]);
});

test('offline without a local normal candidate returns a generic placeholder', () => {
  const catalog = orderedCatalog();
  catalog.variants['pokemon:1'].sprites.normal = catalog.variants['pokemon:1'].sprites.normal.filter((candidate) => candidate.localPath === null);
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: true }, catalog);
  assert.deepEqual(result, [{
    src: 'assets/pokemon-placeholder.svg',
    provider: 'local',
    animated: false,
    shiny: false,
    fallbackKind: 'offline-missing',
  }]);
});

test('resolver deduplicates candidates and rejects unsafe or mismatched catalog entries', () => {
  const result = resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: false }, orderedCatalog({ duplicate: true }));
  assert.equal(new Set(result.map((candidate) => candidate.src)).size, result.length);
  const unsafe = orderedCatalog();
  unsafe.variants['pokemon:1'].sprites.normal[0].sourceUrl = 'javascript:alert(1)';
  assert.throws(() => resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: false }, unsafe), /unsafe|URL/i);
  const mismatch = orderedCatalog();
  mismatch.variants['pokemon:1'].speciesId = 2;
  assert.throws(() => resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'auto', offline: false }, mismatch), /variant|species/i);
});

test('resolver rejects missing species, invalid style, and invalid IDs without I/O', () => {
  const catalog = orderedCatalog();
  assert.throws(() => resolveSpriteCandidates({ speciesId: 99999, shiny: false, style: 'auto', offline: false }, catalog), /species/i);
  assert.throws(() => resolveSpriteCandidates({ speciesId: 1, shiny: false, style: 'unknown', offline: false }, catalog), /style/i);
  assert.throws(() => resolveSpriteCandidates({ speciesId: null, shiny: false, style: 'auto', offline: false }, catalog), /species/i);
  const source = fs.readFileSync(path.join(root, 'core', 'sprite-resolver.cjs'), 'utf8');
  assert.doesNotMatch(source, /require\(['"]node:fs['"]\)|\bfetch\s*\(|\bdocument\b/);
  assert.equal(fs.existsSync(path.join(root, 'assets', 'pokemon-placeholder.svg')), true);
});
