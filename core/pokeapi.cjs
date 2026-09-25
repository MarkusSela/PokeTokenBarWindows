const fs = require('node:fs');
const path = require('node:path');
const { classifyPokeApiSpecies } = require('./rarity.cjs');
const { SCHEMA_VERSION, validateCatalogDocument } = require('./catalog-contract.cjs');

const API = 'https://pokeapi.co/api/v2';
const GRAPHQL = 'https://graphql.pokeapi.co/v1beta2';
const SHIPPED_CATALOG = path.join(__dirname, '..', 'assets', 'pokemon-catalog.json');
const LEGACY_SHIPPED_CATALOG = path.join(__dirname, '..', 'assets', 'pokemon-catalog-gen1-5.json');
const CACHE_TTL_MS = 30 * 864e5;

function cacheRead(file, ttl, schemaVersion, catalogVersion) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (
      value.schemaVersion !== schemaVersion ||
      value.catalogVersion !== catalogVersion ||
      !Number.isFinite(Number(value.fetchedAt)) ||
      Date.now() - Number(value.fetchedAt) >= ttl ||
      !Array.isArray(value.value)
    ) return null;
    return value.value;
  } catch {
    return null;
  }
}

function cacheWrite(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readLegacyCatalog() {
  try {
    const rows = JSON.parse(fs.readFileSync(LEGACY_SHIPPED_CATALOG, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function loadShippedCatalogDocument() {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(SHIPPED_CATALOG, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new Error(`Invalid shipped catalog: ${error.message}`);
  }
  try {
    validateCatalogDocument(value);
  } catch (error) {
    throw new Error(`Invalid shipped catalog: ${error.message}`);
  }
  return value;
}

function shippedCatalog() {
  const document = loadShippedCatalogDocument();
  return document ? document.lines : readLegacyCatalog();
}

function loadShippedCatalog() {
  return shippedCatalog();
}

async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'user-agent': 'PokeTokenBar/0.1.0', ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`PokéAPI ${response.status}`);
  return response.json();
}

function numericId(url, label) {
  const id = Number(String(url || '').split('/').filter(Boolean).at(-1));
  if (!Number.isInteger(id) || id < 1) throw new Error(`Invalid ${label} URL: ${url}`);
  return id;
}

function node(link) {
  if (!link?.species || typeof link.species.url !== 'string')
    throw new Error('PokéAPI evolution node missing species URL');
  const id = numericId(link.species.url, 'evolution species');
  const children = Array.isArray(link.evolves_to) ? link.evolves_to : [];
  return { id, children: children.map(node) };
}

function paths(root) {
  if (!root || !Number.isInteger(root.id) || !Array.isArray(root.children))
    throw new Error('PokéAPI evolution chain is empty or invalid');
  if (!root.children.length) return [[root.id]];
  return root.children.flatMap((child) => paths(child).map((pathIds) => [root.id, ...pathIds]));
}

class PokeApi {
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
    this.lines = new Map();
    this.document = loadShippedCatalogDocument();
    this.shipped = this.document ? this.document.lines : readLegacyCatalog();
    this.catalogVersion = this.document?.catalogVersion || 'legacy-catalog';
  }

  indexRows() {
    return this.shipped.map((row) => ({
      id: row.id,
      captureRate: row.captureRate,
      line: row.line,
    }));
  }

  async baseIndex() {
    const file = path.join(this.cacheDir, 'base-index.json');
    const cached = cacheRead(file, CACHE_TTL_MS, SCHEMA_VERSION, this.catalogVersion);
    if (cached?.length) return cached;
    const shipped = this.indexRows();
    if (shipped.length) {
      cacheWrite(file, {
        fetchedAt: Date.now(),
        schemaVersion: SCHEMA_VERSION,
        catalogVersion: this.catalogVersion,
        value: shipped,
      });
      return shipped;
    }
    const result = [];
    const list = await json(`${API}/evolution-chain?limit=1000`);
    if (!Array.isArray(list.results)) throw new Error('PokéAPI evolution-chain index invalid');
    for (const item of list.results) {
      const chain = await json(item.url);
      if (!chain?.chain) throw new Error('PokéAPI evolution chain missing chain root');
      const root = node(chain.chain);
      if (root.id !== 132) {
        const species = await json(`${API}/pokemon-species/${root.id}`);
        result.push({ id: root.id, captureRate: species.capture_rate });
      }
    }
    result.sort((a, b) => a.id - b.id);
    if (!result.length) throw new Error('PokéAPI index empty');
    cacheWrite(file, {
      fetchedAt: Date.now(),
      schemaVersion: SCHEMA_VERSION,
      catalogVersion: this.catalogVersion,
      value: result,
    });
    return result;
  }

  async line(baseId) {
    const numericBaseId = Number(baseId);
    if (this.lines.has(numericBaseId)) return this.lines.get(numericBaseId);
    const local = this.shipped.find((row) => row.id === numericBaseId)?.line;
    if (local) {
      this.lines.set(numericBaseId, local);
      return local;
    }
    const species = await json(`${API}/pokemon-species/${numericBaseId}`);
    if (!species?.evolution_chain?.url)
      throw new Error(`PokéAPI species ${numericBaseId} is missing an evolution chain`);
    const chain = await json(species.evolution_chain.url);
    if (!chain?.chain) throw new Error(`PokéAPI species ${numericBaseId} returned an empty evolution chain`);
    const root = node(chain.chain);
    const pathOptions = paths(root);
    const ids = [...new Set(pathOptions.flat())];
    const speciesRows = await Promise.all(ids.map((id) => json(`${API}/pokemon-species/${id}`)));
    const names = {};
    for (let index = 0; index < ids.length; index += 1) {
      const translated = Object.fromEntries(
        (Array.isArray(speciesRows[index].names) ? speciesRows[index].names : [])
          .filter((entry) => ['it', 'en'].includes(entry.language?.name))
          .map((entry) => [entry.language.name, entry.name]),
      );
      names[ids[index]] = {
        en: translated.en || `#${ids[index]}`,
        it: translated.it || translated.en || `#${ids[index]}`,
      };
    }
    const rarity = classifyPokeApiSpecies(species);
    const value = {
      baseId: numericBaseId,
      pathOptions,
      pathIds: pathOptions[0],
      rarity,
      names,
      captureRate: species.capture_rate,
    };
    this.lines.set(numericBaseId, value);
    return value;
  }
}

function choosePath(line, collectedFinals, rng = Math.random) {
  const weight = (candidate) => collectedFinals.includes(`${line.baseId}:${candidate.at(-1)}`) ? 1 : 2;
  const total = line.pathOptions.reduce((sum, candidate) => sum + weight(candidate), 0);
  let x = rng() * total;
  for (const candidate of line.pathOptions) {
    x -= weight(candidate);
    if (x < 0) return { ...line, pathIds: candidate };
  }
  return { ...line, pathIds: line.pathOptions.at(-1) };
}

module.exports = {
  PokeApi,
  choosePath,
  loadShippedCatalog,
  loadShippedCatalogDocument,
  cacheRead,
  cacheWrite,
  node,
  paths,
};
