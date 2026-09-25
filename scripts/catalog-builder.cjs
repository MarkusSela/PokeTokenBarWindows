const fs = require('node:fs');
const path = require('node:path');
const { classifyEvolutionLine, classifyPokeApiSpecies } = require('../core/rarity.cjs');
const {
  SCHEMA_VERSION,
  stableNormalize,
  stableStringify,
  catalogDigest,
  validateCatalogDocument,
} = require('../core/catalog-contract.cjs');

const GENERATION_NAMES = new Map([
  ['i', 1], ['ii', 2], ['iii', 3], ['iv', 4], ['v', 5],
  ['vi', 6], ['vii', 7], ['viii', 8], ['ix', 9],
]);
const GENERATIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const ALLOWED_RARITIES = new Set(['common', 'uncommon', 'rare', 'legendary']);
const POKEAPI_SPRITES_REVISION = '2ecb4eeacd5a1718621fc30f12772e3f60d830b9';
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const SOURCE_LICENSE_REF = 'pokeapi-sprites-rights-pending';
const SHOWDOWN_LICENSE_REF = 'showdown-sprites-rights-pending';
const VERSIONED_SPRITE_SOURCES = Object.freeze([
  ['generation-ix', 'scarlet-violet'],
  ['generation-viii', 'brilliant-diamond-shining-pearl'],
  ['generation-vii', 'ultra-sun-ultra-moon'],
  ['generation-vi', 'omegaruby-alphasapphire'],
  ['generation-vi', 'omega-ruby-alpha-sapphire'],
  ['generation-vi', 'x-y'],
]);

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function generationNumber(value) {
  const name = typeof value === 'string' ? value : value?.name;
  if (typeof name !== 'string') return null;
  const match = name.trim().toLowerCase().match(/generation-(.+)$/);
  if (!match) return null;
  return GENERATION_NAMES.get(match[1]) || null;
}

function numericIdFromUrl(value, label) {
  const id = Number(String(value || '').split('/').filter(Boolean).at(-1));
  if (!Number.isInteger(id) || id < 1) throw new Error(`Invalid ${label} URL: ${value}`);
  return id;
}

function namesFromSpecies(row) {
  const names = {};
  for (const entry of Array.isArray(row?.names) ? row.names : []) {
    const language = entry?.language?.name;
    if (['en', 'it'].includes(language) && typeof entry.name === 'string' && entry.name)
      names[language] = entry.name;
  }
  const fallback = typeof row?.name === 'string' && row.name ? row.name : `#${row?.id}`;
  return { en: names.en || fallback, it: names.it || names.en || fallback };
}

function namesFromRows(rowsById, ids) {
  return Object.fromEntries(ids.map((id) => {
    const row = rowsById.get(id);
    if (!row) throw new Error(`Missing species ${id} referenced by an evolution path`);
    return [id, namesFromSpecies(row)];
  }));
}

function flattenEvolutionPaths(node) {
  if (!isRecord(node?.species) || typeof node.species.url !== 'string')
    throw new Error('Evolution node is missing species URL');
  const id = numericIdFromUrl(node.species.url, 'evolution species');
  const children = Array.isArray(node.evolves_to) ? node.evolves_to : [];
  if (!children.length) return [[id]];
  return children.flatMap((child) => flattenEvolutionPaths(child).map((childPath) => [id, ...childPath]));
}

function compareIdArrays(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function uniquePaths(paths) {
  const seen = new Set();
  return paths
    .filter((candidate) => {
      const key = JSON.stringify(candidate);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(compareIdArrays);
}

function assertSafeSourceUrl(value) {
  if (typeof value !== 'string' || value.includes('\0')) throw new Error(`Invalid sprite source URL: ${value}`);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`Invalid sprite source URL: ${value}`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error(`Unsafe sprite source URL: ${value}`);
  return value;
}

function pinSpriteUrl(value, spritesRevision) {
  if (typeof value !== 'string') return value;
  const prefix = 'https://raw.githubusercontent.com/PokeAPI/sprites/';
  const masterPrefix = `${prefix}master/`;
  if (!value.startsWith(masterPrefix) || !/^[0-9a-f]{40}$/i.test(String(spritesRevision || ''))) return value;
  return `${prefix}${spritesRevision}/${value.slice(masterPrefix.length)}`;
}

function candidate(sourceUrl, style, animated, spritesRevision) {
  return {
    provider: 'pokeapi',
    style,
    animated: Boolean(animated),
    sourceUrl: assertSafeSourceUrl(pinSpriteUrl(sourceUrl, spritesRevision)),
    localPath: null,
    sha256: null,
    licenseRef: SOURCE_LICENSE_REF,
    packageAllowed: false,
  };
}

function showdownCandidate(sourceUrl, spritesRevision) {
  return {
    provider: 'showdown',
    style: 'auto',
    animated: true,
    sourceUrl: assertSafeSourceUrl(pinSpriteUrl(sourceUrl, spritesRevision)),
    localPath: null,
    sha256: null,
    licenseRef: SHOWDOWN_LICENSE_REF,
    packageAllowed: false,
  };
}

function addCandidate(target, value, style, animated, spritesRevision) {
  if (typeof value !== 'string' || !value) return;
  const next = candidate(value, style, animated, spritesRevision);
  if (!target.some((existing) => existing.sourceUrl === next.sourceUrl)) target.push(next);
}

function addShowdownCandidate(target, value, spritesRevision) {
  if (typeof value !== 'string' || !value) return;
  const next = showdownCandidate(value, spritesRevision);
  if (!target.some((existing) => existing.sourceUrl === next.sourceUrl)) target.push(next);
}

function overrideCandidate(source, label) {
  if (!isRecord(source)
    || source.provider !== 'showdown'
    || source.style !== 'auto'
    || source.animated !== true
    || source.localPath !== null
    || source.packageAllowed !== false
    || source.licenseRef !== SHOWDOWN_LICENSE_REF) {
    throw new Error(`Invalid animated sprite override ${label}`);
  }
  const sourceUrl = assertSafeSourceUrl(source.sourceUrl);
  const sha256 = source.sha256 ?? null;
  if (sha256 !== null && !/^[0-9a-f]{64}$/i.test(sha256))
    throw new Error(`Invalid animated sprite override hash ${label}`);
  return {
    provider: source.provider,
    style: source.style,
    animated: true,
    sourceUrl,
    localPath: null,
    sha256,
    licenseRef: source.licenseRef,
    packageAllowed: false,
  };
}

function mergeSpriteOverrides(base, overrides, label) {
  const additions = Array.isArray(overrides)
    ? overrides.map((source, index) => overrideCandidate(source, `${label}[${index}]`))
    : [];
  const seen = new Set();
  return [...additions, ...base].filter((item) => {
    if (seen.has(item.sourceUrl)) return false;
    seen.add(item.sourceUrl);
    return true;
  });
}

function spriteCandidates(pokemon, spritesRevision, spriteOverrides = {}) {
  const sprites = isRecord(pokemon?.sprites) ? pokemon.sprites : {};
  const normal = [];
  const shiny = [];
  const gen5 = sprites.versions?.['generation-v']?.['black-white'];
  if (isRecord(gen5)) {
    addCandidate(normal, gen5.animated?.front_default, 'pixel-gen5', true, spritesRevision);
    addCandidate(shiny, gen5.animated?.front_shiny, 'pixel-gen5', true, spritesRevision);
    addCandidate(normal, gen5.front_default, 'pixel-gen5', false, spritesRevision);
    addCandidate(shiny, gen5.front_shiny, 'pixel-gen5', false, spritesRevision);
  }
  for (const [generation, game] of VERSIONED_SPRITE_SOURCES) {
    const source = sprites.versions?.[generation]?.[game];
    if (!isRecord(source)) continue;
    addCandidate(normal, source.front_default, 'auto', false, spritesRevision);
    addCandidate(shiny, source.front_shiny, 'auto', false, spritesRevision);
  }
  addCandidate(normal, sprites.front_default, 'auto', false, spritesRevision);
  addCandidate(shiny, sprites.front_shiny, 'auto', false, spritesRevision);
  const showdown = sprites.other?.showdown;
  const hasNormalOverride = Array.isArray(spriteOverrides.normal) && spriteOverrides.normal.length > 0;
  const hasShinyOverride = Array.isArray(spriteOverrides.shiny) && spriteOverrides.shiny.length > 0;
  if (!normal.some((item) => item.animated) && !hasNormalOverride)
    addShowdownCandidate(normal, showdown?.front_default, spritesRevision);
  if (!shiny.some((item) => item.animated) && !hasShinyOverride)
    addShowdownCandidate(shiny, showdown?.front_shiny, spritesRevision);
  return {
    normal: mergeSpriteOverrides(normal, spriteOverrides.normal, `${pokemon.id}.normal`),
    shiny: mergeSpriteOverrides(shiny, spriteOverrides.shiny, `${pokemon.id}.shiny`),
  };
}

function getPokemonRow(pokemonRows, id) {
  if (pokemonRows instanceof Map) return pokemonRows.get(id);
  if (isRecord(pokemonRows)) return pokemonRows[String(id)];
  return undefined;
}

function normalizeSource(source = {}, spritesRevision = POKEAPI_SPRITES_REVISION) {
  const value = isRecord(source) ? { ...source } : {};
  const generations = Array.isArray(value.generations)
    ? [...new Set(value.generations.map(Number).filter((generation) => GENERATIONS.includes(generation)))].sort((a, b) => a - b)
    : [...GENERATIONS];
  return {
    provider: value.provider || 'pokeapi',
    snapshot: value.snapshot || 'pokemon-species and pokemon v2 responses',
    revision: value.revision || 'api-v2',
    generations,
    ...value,
    generations,
    spritesRevision: value.spritesRevision || spritesRevision,
  };
}

function buildVariant(speciesRow, variety, pokemonRows, spritesRevision, spriteOverrides = {}) {
  if (!isRecord(variety?.pokemon) || typeof variety.pokemon.url !== 'string')
    throw new Error(`Species ${speciesRow.id} has a variety without a Pokémon URL`);
  const id = numericIdFromUrl(variety.pokemon.url, 'variety Pokémon');
  const pokemon = getPokemonRow(pokemonRows, id);
  if (!isRecord(pokemon)) throw new Error(`Missing Pokémon data for variant ${id} of species ${speciesRow.id}`);
  if (Number(pokemon.id) !== id) throw new Error(`Pokémon data ID mismatch for variant ${id}`);
  return {
    id,
    speciesId: Number(speciesRow.id),
    isDefault: variety.is_default === true,
    formKey: variety.is_default === true ? 'default' : (typeof pokemon.name === 'string' && pokemon.name ? pokemon.name : `pokemon-${id}`),
    sprites: spriteCandidates(pokemon, spritesRevision, spriteOverrides[`pokemon:${id}`]),
  };
}

function makeCoverage(species, variants, lines) {
  const defaultVariants = Object.values(variants).filter((variant) => variant.isDefault);
  const normalLocal = defaultVariants.filter((variant) => variant.sprites.normal.some((item) => typeof item.localPath === 'string')).map((variant) => variant.speciesId);
  const shinyMissing = defaultVariants.filter((variant) => variant.sprites.shiny.length === 0).map((variant) => variant.speciesId);
  const animated = Object.values(variants).reduce((total, variant) => total + variant.sprites.normal.filter((item) => item.animated).length + variant.sprites.shiny.filter((item) => item.animated).length, 0);
  return {
    species: Object.keys(species).length,
    lines: lines.length,
    variants: Object.keys(variants).length,
    defaultVariants: defaultVariants.length,
    normalCandidateCount: Object.values(variants).reduce((total, variant) => total + variant.sprites.normal.length, 0),
    shinyCandidateCount: Object.values(variants).reduce((total, variant) => total + variant.sprites.shiny.length, 0),
    animatedCandidateCount: animated,
    offlineNormalDefaultCount: normalLocal.length,
    missingOfflineNormalDefaultSpecies: defaultVariants.filter((variant) => !normalLocal.includes(variant.speciesId)).map((variant) => variant.speciesId).sort((a, b) => a - b),
    missingShinyDefaultSpecies: [...shinyMissing].sort((a, b) => a - b),
  };
}

function buildCatalogFromData({ speciesRows, evolutionChains, pokemonRows, overrides = {}, spriteOverrides = {}, source = {}, spritesRevision = POKEAPI_SPRITES_REVISION } = {}) {
  if (!Array.isArray(speciesRows)) throw new Error('speciesRows must be an array');
  const eligible = speciesRows
    .filter((row) => GENERATIONS.includes(generationNumber(row?.generation)))
    .map((row) => ({ ...row, id: Number(row.id), generationNumber: generationNumber(row.generation) }))
    .sort((left, right) => left.id - right.id);
  if (eligible.some((row) => !Number.isInteger(row.id) || row.id < 1)) throw new Error('Species row has invalid id');
  const speciesRowsById = new Map(eligible.map((row) => [row.id, row]));
  const species = {};
  const variants = {};
  for (const row of eligible) {
    const varieties = Array.isArray(row.varieties) ? row.varieties : [];
    if (!varieties.length) throw new Error(`Species ${row.id} has no varieties`);
    const builtVariants = varieties.map((variety) => buildVariant(row, variety, pokemonRows, spritesRevision, spriteOverrides));
    const uniqueVariants = new Map();
    for (const variant of builtVariants) {
      if (uniqueVariants.has(variant.id)) throw new Error(`Duplicate variant ${variant.id} for species ${row.id}`);
      uniqueVariants.set(variant.id, variant);
    }
    const orderedVariants = [...uniqueVariants.values()].sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.id - right.id);
    const defaultVariant = orderedVariants.find((variant) => variant.isDefault);
    if (!defaultVariant) throw new Error(`Species ${row.id} has no default variety`);
    const variantKeys = orderedVariants.map((variant) => `pokemon:${variant.id}`);
    species[String(row.id)] = {
      id: row.id,
      generation: row.generationNumber,
      names: namesFromSpecies(row),
      variantKeys,
      defaultVariantKey: `pokemon:${defaultVariant.id}`,
      captureRate: row.capture_rate,
      legendary: row.is_legendary === true,
      mythical: row.is_mythical === true,
    };
    for (const variant of orderedVariants) variants[`pokemon:${variant.id}`] = variant;
  }

  const chainList = Array.isArray(evolutionChains)
    ? evolutionChains
    : evolutionChains instanceof Map ? [...evolutionChains.values()] : [];
  const lines = [];
  const lineRoots = new Set();
  const coveredByChain = new Set();
  for (const chainRecord of chainList) {
    const chain = chainRecord?.chain || chainRecord;
    if (!isRecord(chain)) throw new Error('Evolution chain record is invalid');
    const paths = uniquePaths(flattenEvolutionPaths(chain));
    if (!paths.length) throw new Error('Evolution chain has no paths');
    const rootId = paths[0][0];
    if (!speciesRowsById.has(rootId)) continue;
    if (lineRoots.has(rootId)) throw new Error(`Duplicate evolution root ${rootId}`);
    lineRoots.add(rootId);
    const invalidId = paths.flat().find((id) => !speciesRowsById.has(id));
    if (invalidId !== undefined) throw new Error(`Evolution root ${rootId} references species outside generations I-IX: ${invalidId}`);
    paths.forEach((pathIds) => pathIds.forEach((id) => coveredByChain.add(id)));
    if (rootId === 132) continue;
    const root = speciesRowsById.get(rootId);
    classifyPokeApiSpecies(root);
    const rarity = classifyEvolutionLine({
      paths,
      captureRate: root.capture_rate,
      legendary: root.is_legendary,
      mythical: root.is_mythical,
    }, overrides[String(rootId)]);
    const names = namesFromRows(speciesRowsById, [...new Set(paths.flat())].sort((a, b) => a - b));
    lines.push({
      id: rootId,
      captureRate: root.capture_rate,
      rarity,
      line: {
        baseId: rootId,
        pathOptions: paths,
        pathIds: paths[0],
        rarity,
        names,
        captureRate: root.capture_rate,
      },
    });
  }

  for (const row of eligible) {
    if (coveredByChain.has(row.id) || row.id === 132) continue;
    classifyPokeApiSpecies(row);
    const rarity = classifyEvolutionLine({
      paths: [[row.id]],
      captureRate: row.capture_rate,
      legendary: row.is_legendary,
      mythical: row.is_mythical,
    }, overrides[String(row.id)]);
    lines.push({
      id: row.id,
      captureRate: row.capture_rate,
      rarity,
      line: {
        baseId: row.id,
        pathOptions: [[row.id]],
        pathIds: [row.id],
        rarity,
        names: { [row.id]: namesFromSpecies(row) },
        captureRate: row.capture_rate,
      },
    });
  }
  lines.sort((left, right) => left.id - right.id);

  const catalog = {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion: '',
    source: normalizeSource(source, spritesRevision),
    coverage: makeCoverage(species, variants, lines),
    lines,
    species,
    variants,
  };
  catalog.catalogVersion = catalogDigest(catalog);
  validateCatalogDocument(catalog);
  return catalog;
}

async function requestJsonDefault(url, { timeoutMs = 30_000 } = {}) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'PokeTokenBar/0.1.13 catalog builder' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function sleep(milliseconds) {
  return milliseconds > 0 ? new Promise((resolve) => setTimeout(resolve, milliseconds)) : Promise.resolve();
}

async function requestJsonWithRetry(url, { fetchJson = requestJsonDefault, retries = 3, retryDelayMs = 0, timeoutMs = 30_000 } = {}) {
  const attempts = Math.max(1, Math.floor(Number(retries) || 0) + 1);
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchJson(url, { timeoutMs });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await sleep(retryDelayMs * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function collectPaginated(initialUrl, fetchJson) {
  const result = [];
  const seen = new Set();
  let url = initialUrl;
  while (url !== null) {
    if (typeof url !== 'string' || !url) throw new Error('Paginated response has invalid next URL');
    if (seen.has(url)) throw new Error(`Pagination loop at ${url}`);
    seen.add(url);
    const page = await fetchJson(url);
    if (!isRecord(page) || !Array.isArray(page.results) || !(page.next === null || typeof page.next === 'string'))
      throw new Error(`Invalid paginated response at ${url}`);
    result.push(...page.results);
    url = page.next;
  }
  return result;
}

async function mapLimit(values, limit, fn) {
  const output = new Array(values.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      output[index] = await fn(values[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.floor(limit) || 1) }, worker));
  return output;
}

function cacheGet(cache, key) {
  if (!cache) return undefined;
  if (cache instanceof Map) return cache.get(key);
  return typeof cache.get === 'function' ? cache.get(key) : undefined;
}

async function cacheSet(cache, key, value) {
  if (!cache) return;
  if (cache instanceof Map) {
    cache.set(key, value);
    return;
  }
  if (typeof cache.set === 'function') await cache.set(key, value);
}

async function buildCatalog({
  fetchJson = requestJsonDefault,
  cache,
  outputPath,
  writeCatalog = writeCatalogAtomically,
  endpoints = {},
  source = {},
  spritesRevision = POKEAPI_SPRITES_REVISION,
  overrides = {},
  concurrency = 4,
  retries = 3,
  retryDelayMs = 250,
  timeoutMs = 30_000,
  spriteOverrides = {},
  now = () => new Date(),
} = {}) {
  const speciesEndpoint = endpoints.species || `${POKEAPI_BASE}/pokemon-species/?limit=100`;
  const get = async (url) => {
    const cached = await cacheGet(cache, url);
    if (cached !== undefined) return cached;
    try {
      const value = await requestJsonWithRetry(url, { fetchJson, retries, retryDelayMs, timeoutMs });
      await cacheSet(cache, url, value);
      return value;
    } catch (error) {
      const stale = await cacheGet(cache, url);
      if (stale !== undefined) return stale;
      throw error;
    }
  };
  const speciesRefs = await collectPaginated(speciesEndpoint, get);
  const speciesRows = await mapLimit(speciesRefs, concurrency, (ref) => get(ref.url));
  const eligibleRows = speciesRows.filter((row) => GENERATIONS.includes(generationNumber(row?.generation)));
  const chainUrls = [...new Set(eligibleRows.map((row) => row.evolution_chain?.url).filter((url) => typeof url === 'string'))].sort();
  const evolutionChains = await mapLimit(chainUrls, concurrency, (url) => get(url));
  const pokemonUrls = [...new Set(eligibleRows.flatMap((row) => (Array.isArray(row.varieties) ? row.varieties : []).map((variety) => variety.pokemon?.url).filter((url) => typeof url === 'string')))].sort();
  const pokemonRows = new Map();
  const pokemonValues = await mapLimit(pokemonUrls, concurrency, (url) => get(url));
  for (const row of pokemonValues) pokemonRows.set(Number(row.id), row);
  const catalog = buildCatalogFromData({
    speciesRows,
    evolutionChains,
    pokemonRows,
    overrides,
    spriteOverrides,
    source: { ...source, generatedAt: now().toISOString() },
    spritesRevision,
  });
  if (outputPath) await writeCatalog(outputPath, catalog);
  return catalog;
}

async function writeCatalogAtomically(destination, catalog, { fsApi = fs, tempName } = {}) {
  validateCatalogDocument(catalog);
  const directory = path.dirname(destination);
  fsApi.mkdirSync(directory, { recursive: true });
  const temporary = tempName || `${destination}.tmp-${process.pid}-${Date.now()}`;
  let promoted = false;
  try {
    fsApi.writeFileSync(temporary, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    fsApi.renameSync(temporary, destination);
    promoted = true;
  } finally {
    if (!promoted) {
      try { fsApi.rmSync(temporary, { force: true }); } catch {}
    }
  }
}

module.exports = {
  SCHEMA_VERSION,
  GENERATIONS,
  POKEAPI_BASE,
  POKEAPI_SPRITES_REVISION,
  stableNormalize,
  stableStringify,
  catalogDigest,
  flattenEvolutionPaths,
  collectPaginated,
  requestJsonWithRetry,
  buildCatalogFromData,
  buildCatalog,
  validateCatalogDocument,
  writeCatalogAtomically,
};
