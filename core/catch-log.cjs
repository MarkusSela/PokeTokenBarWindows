function normalizeEntry(entry, kind = 'graduated') {
  if (!entry || typeof entry !== 'object') return null;
  const chainOrder = Array.isArray(entry.chainOrder) ? [...entry.chainOrder] : [];
  if (!chainOrder.length) return null;
  return {
    ...entry,
    id: String(entry.id || `${kind}-${entry.baseId ?? chainOrder[0]}-${entry.finalId ?? chainOrder.at(-1)}`),
    kind,
    chainOrder,
  };
}

function buildCatchLogEntries({ active = null, dex = [] } = {}) {
  const activeEntry = active
    ? normalizeEntry({
        id: `active-${active.baseId}-${active.pathIds?.join('-') || active.stageIndex || 0}`,
        baseId: active.baseId,
        finalId: active.pathIds?.at(-1),
        chainOrder: active.pathIds,
        stageIndex: active.stageIndex,
        nature: active.nature,
        rarity: active.rarity,
        shiny: active.shinyVisible ?? active.shiny,
        caughtAt: null,
        names: active.names,
      }, 'active')
    : null;
  const graduated = (Array.isArray(dex) ? dex : [])
    .map((entry) => normalizeEntry(entry, 'graduated'))
    .filter(Boolean)
    .sort((a, b) => {
      const left = a.caughtAt ? Date.parse(a.caughtAt) : -Infinity;
      const right = b.caughtAt ? Date.parse(b.caughtAt) : -Infinity;
      return right - left;
    });
  return activeEntry ? [activeEntry, ...graduated] : graduated;
}

function entryName(entry, id, catalog) {
  const catalogName = catalog?.species?.[String(id)]?.names?.en;
  if (typeof catalogName === 'string' && catalogName) return catalogName;
  const value = entry?.names?.[id];
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.en || value.it || `#${id}`;
  return `#${id}`;
}

const { classifyEvolutionLine, classifyEvolutionStage, isValidRarity } = require('./rarity.cjs');

function catalogRarity(source) {
  if (typeof source?.legendary === 'boolean' && typeof source?.mythical === 'boolean') {
    return classifyEvolutionLine({
      paths: [[Number(source.id)]],
      captureRate: source.captureRate,
      legendary: source.legendary,
      mythical: source.mythical,
    }, source.rarity);
  }
  return isValidRarity(source?.rarity) ? source.rarity : 'common';
}

function evolutionIndex(catalog) {
  const result = new Map();
  for (const row of Array.isArray(catalog?.lines) ? catalog.lines : []) {
    const line = row?.line && typeof row.line === 'object' ? row.line : {};
    const paths = Array.isArray(line.pathOptions) && line.pathOptions.length
      ? line.pathOptions
      : [line.pathIds];
    const lineRarity = isValidRarity(line.rarity)
      ? line.rarity
      : isValidRarity(row?.rarity) ? row.rarity : 'common';
    for (const path of paths) {
      if (!Array.isArray(path)) continue;
      for (let index = 0; index < path.length; index += 1) {
        const id = Number(path[index]);
        if (!Number.isInteger(id) || id < 1) continue;
        const current = result.get(id);
        if (!current || index < current.stageIndex) {
          result.set(id, {
            stageIndex: index,
            totalStages: path.length,
            lineRarity,
          });
        } else if (current.lineRarity !== 'legendary' && lineRarity === 'legendary') {
          current.lineRarity = lineRarity;
        }
      }
    }
  }
  return result;
}

function pokedexRarity(id, chainOrder, index) {
  const source = index.get(Number(id));
  if (source) return classifyEvolutionStage(source.stageIndex, source.lineRarity, source.totalStages);
  const stageIndex = Array.isArray(chainOrder)
    ? Math.max(0, chainOrder.map(Number).indexOf(Number(id)))
    : 0;
  return classifyEvolutionStage(stageIndex, 'common', Array.isArray(chainOrder) ? chainOrder.length : 1);
}

function lineRarityFor(id, chainOrder, index) {
  const source = index.get(Number(id));
  if (source) return source.lineRarity;
  const path = Array.isArray(chainOrder) && chainOrder.length
    ? chainOrder.map(Number)
    : [Number(id)];
  return classifyEvolutionLine({ paths: [path] });
}

function buildPokedexEntries({ active = null, dex = [], catalog = null, masterMode = false } = {}) {
  const species = new Map();
  const evolution = evolutionIndex(catalog);
  for (const entry of buildCatchLogEntries({ active, dex })) {
    for (const rawId of entry.chainOrder) {
      const id = Number(rawId);
      if (!Number.isInteger(id) || id < 1 || id > 100_000) continue;
      const current = species.get(id);
      if (current) {
        current.shiny ||= Boolean(entry.shiny);
        current.isRaising ||= entry.kind === 'active';
        current.lineRarity ||= lineRarityFor(id, entry.chainOrder, evolution);
        current.rarity ||= current.lineRarity;
        if (current.name === `#${id}`) current.name = entryName(entry, id, catalog);
      } else {
        const stageRarity = pokedexRarity(id, entry.chainOrder, evolution);
        const lineRarity = lineRarityFor(id, entry.chainOrder, evolution);
        species.set(id, {
          id,
          name: entryName(entry, id, catalog),
          shiny: Boolean(entry.shiny),
          isRaising: entry.kind === 'active',
          rarity: lineRarity,
          lineRarity,
          stageRarity,
        });
      }
    }
  }
  if (masterMode && catalog?.species && typeof catalog.species === 'object') {
    for (const source of Object.values(catalog.species)) {
      const id = Number(source?.id);
      if (!Number.isInteger(id) || id < 1) continue;
      const current = species.get(id);
      const names = source?.names && typeof source.names === 'object' ? source.names : {};
      const name = names.en || names.it || `#${id}`;
      const stageRarity = evolution.has(id)
        ? pokedexRarity(id, [], evolution)
        : catalogRarity(source);
      const lineRarity = evolution.get(id)?.lineRarity || catalogRarity(source);
      if (current) {
        if (current.name === `#${id}`) current.name = name;
        current.rarity = lineRarity;
        current.lineRarity ||= lineRarity;
        current.stageRarity ||= stageRarity;
        continue;
      }
      species.set(id, {
        id,
        name,
        shiny: false,
        isRaising: false,
        rarity: lineRarity,
        lineRarity,
        stageRarity,
      });
    }
  }
  return [...species.values()].sort((left, right) => left.id - right.id);
}

function speciesTotal(catalog) {
  const species = catalog && typeof catalog === 'object' ? catalog.species : null;
  if (!species || typeof species !== 'object') return 0;
  const ids = new Set();
  for (const source of Object.values(species)) {
    const id = Number(source?.id);
    if (Number.isInteger(id) && id >= 1) ids.add(id);
  }
  return ids.size;
}

module.exports = { buildCatchLogEntries, buildPokedexEntries, speciesTotal, normalizeEntry };
