const fs = require("fs");
const path = require("path");
const API = "https://pokeapi.co/api/v2";
const GRAPHQL = "https://graphql.pokeapi.co/v1beta2";
const SHIPPED_CATALOG = path.join(
  __dirname,
  "..",
  "assets",
  "pokemon-catalog-gen1-5.json",
);
function cacheRead(file, ttl) {
  try {
    const v = JSON.parse(fs.readFileSync(file, "utf8"));
    return Date.now() - v.fetchedAt < ttl ? v.value : null;
  } catch {
    return null;
  }
}
function cacheWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ fetchedAt: Date.now(), value }));
}
function shippedCatalog() {
  try {
    const rows = JSON.parse(fs.readFileSync(SHIPPED_CATALOG, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
function loadShippedCatalog() {
  return shippedCatalog();
}
async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "user-agent": "PokeTokenBar/0.1.0", ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`PokéAPI ${response.status}`);
  return response.json();
}
function node(link) {
  const id = Number(String(link.species.url).split("/").filter(Boolean).at(-1));
  if (id < 1 || id > 649) return null;
  return { id, children: (link.evolves_to || []).map(node).filter(Boolean) };
}
function paths(root) {
  if (!root.children.length) return [[root.id]];
  return root.children.flatMap((c) => paths(c).map((p) => [root.id, ...p]));
}
class PokeApi {
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
    this.lines = new Map();
    this.shipped = shippedCatalog();
  }
  async baseIndex() {
    const file = path.join(this.cacheDir, "base-index.json");
    const cached = cacheRead(file, 30 * 864e5);
    if (cached?.length) return cached;
    const shipped = this.shipped.map((row) => ({
      id: row.id,
      captureRate: row.captureRate,
      line: row.line,
    }));
    if (shipped.length) {
      cacheWrite(file, shipped);
      return shipped;
    }
    const result = [];
    const list = await json(`${API}/evolution-chain?limit=1000`);
    for (const item of list.results) {
      const chain = await json(item.url);
      const id = Number(
        String(chain.chain.species.url).split("/").filter(Boolean).at(-1),
      );
      if (id >= 1 && id <= 649 && id !== 132) {
        const species = await json(`${API}/pokemon-species/${id}`);
        result.push({ id, captureRate: species.capture_rate });
      }
    }
    result.sort((a, b) => a.id - b.id);
    if (!result.length) throw new Error("PokéAPI index empty");
    cacheWrite(file, result);
    return result;
  }
  async line(baseId) {
    if (this.lines.has(baseId)) return this.lines.get(baseId);
    const local = this.shipped.find((row) => row.id === Number(baseId))?.line;
    if (local) {
      this.lines.set(baseId, local);
      return local;
    }
    const species = await json(`${API}/pokemon-species/${baseId}`);
    const chain = await json(species.evolution_chain.url);
    const root = node(chain.chain);
    const ids = [...new Set(paths(root).flat())];
    const speciesRows = await Promise.all(
      ids.map((id) => json(`${API}/pokemon-species/${id}`)),
    );
    const names = {};
    for (let i = 0; i < ids.length; i++) {
      const translated = Object.fromEntries(
        speciesRows[i].names
          .filter((n) => ["it", "en"].includes(n.language.name))
          .map((n) => [n.language.name, n.name]),
      );
      names[ids[i]] = {
        en: translated.en || `#${ids[i]}`,
        it: translated.it || translated.en || `#${ids[i]}`,
      };
    }
    const rarity =
      species.is_legendary || species.is_mythical
        ? "legendary"
        : species.capture_rate <= 45
          ? "rare"
          : species.capture_rate <= 120
            ? "uncommon"
            : "common";
    const value = {
      baseId,
      pathOptions: paths(root),
      pathIds: paths(root)[0],
      rarity,
      names,
      captureRate: species.capture_rate,
    };
    this.lines.set(baseId, value);
    return value;
  }
}
function choosePath(line, collectedFinals, rng = Math.random) {
  const weight = (p) =>
    collectedFinals.includes(`${line.baseId}:${p.at(-1)}`) ? 1 : 2;
  const total = line.pathOptions.reduce((n, p) => n + weight(p), 0);
  let x = rng() * total;
  for (const p of line.pathOptions) {
    x -= weight(p);
    if (x < 0) return { ...line, pathIds: p };
  }
  return { ...line, pathIds: line.pathOptions.at(-1) };
}
module.exports = { PokeApi, choosePath, loadShippedCatalog };
