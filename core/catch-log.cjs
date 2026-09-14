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

function entryName(entry, id) {
  const value = entry?.names?.[id];
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.it || value.en || `#${id}`;
  return `#${id}`;
}

function buildPokedexEntries({ active = null, dex = [] } = {}) {
  const species = new Map();
  for (const entry of buildCatchLogEntries({ active, dex })) {
    for (const rawId of entry.chainOrder) {
      const id = Number(rawId);
      if (!Number.isInteger(id) || id < 1 || id > 100_000) continue;
      const current = species.get(id);
      if (current) {
        current.shiny ||= Boolean(entry.shiny);
        current.isRaising ||= entry.kind === 'active';
        if (current.name === `#${id}`) current.name = entryName(entry, id);
      } else {
        species.set(id, {
          id,
          name: entryName(entry, id),
          shiny: Boolean(entry.shiny),
          isRaising: entry.kind === 'active',
          rarity: entry.rarity || 'common',
        });
      }
    }
  }
  return [...species.values()].sort((left, right) => left.id - right.id);
}

module.exports = { buildCatchLogEntries, buildPokedexEntries, normalizeEntry };
