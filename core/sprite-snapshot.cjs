const { resolveSpriteCandidates } = require('./sprite-resolver.cjs');

const VALID_STYLES = new Set(['auto', 'pixel-gen5']);

function integerSpeciesId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

function activeSpriteSubject(active) {
  if (!active || typeof active !== 'object') return null;
  const pathIds = Array.isArray(active.pathIds) ? active.pathIds : [];
  const stageIndex = Number.isInteger(Number(active.stageIndex))
    ? Number(active.stageIndex)
    : 0;
  const speciesId = integerSpeciesId(pathIds[stageIndex]);
  if (speciesId == null) return null;
  return {
    speciesId,
    variantKey: typeof active.variantKey === 'string' ? active.variantKey : undefined,
    shiny: Boolean((active.shiny && !active.dittoDisguise) || active.dittoRevealed),
  };
}

function representativeSpriteSubject(representative) {
  if (!representative || typeof representative !== 'object') return null;
  const speciesId = integerSpeciesId(representative.speciesId ?? representative.id);
  if (speciesId == null) return null;
  return {
    speciesId,
    variantKey: typeof representative.variantKey === 'string'
      ? representative.variantKey
      : undefined,
    shiny: Boolean(representative.isShiny ?? representative.shiny),
  };
}

function collectionSpeciesIds(collection) {
  const ids = new Set();
  const add = (value) => {
    const id = integerSpeciesId(value);
    if (id != null) ids.add(id);
  };
  const source = collection && typeof collection === 'object' ? collection : {};
  for (const entry of Array.isArray(source.pokedex) ? source.pokedex : []) add(entry?.id);
  for (const entry of Array.isArray(source.catchLog) ? source.catchLog : []) {
    for (const id of Array.isArray(entry?.chainOrder) ? entry.chainOrder : []) add(id);
  }
  return [...ids].sort((left, right) => left - right);
}

function resolveSubject(subject, catalog, style, offline) {
  if (!subject) return null;
  return {
    speciesId: subject.speciesId,
    shiny: subject.shiny,
    candidates: resolveSpriteCandidates({
      speciesId: subject.speciesId,
      variantKey: subject.variantKey,
      shiny: subject.shiny,
      style,
      offline,
    }, catalog),
  };
}

function buildSpriteSnapshot({
  catalog,
  active = null,
  representative = null,
  collection = null,
  style = 'auto',
  offline = false,
} = {}) {
  if (!VALID_STYLES.has(style)) throw new Error(`Invalid sprite style: ${style}`);
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog))
    throw new Error('Sprite catalog is required');

  const activeSubject = activeSpriteSubject(active);
  const representativeSubject = representativeSpriteSubject(representative);
  const result = {
    schemaVersion: 1,
    style,
    offline: offline === true,
    active: resolveSubject(activeSubject, catalog, style, offline === true),
    representative: resolveSubject(representativeSubject, catalog, style, offline === true),
    collection: {},
  };

  for (const speciesId of collectionSpeciesIds(collection)) {
    result.collection[String(speciesId)] = {
      normal: resolveSpriteCandidates({
        speciesId,
        shiny: false,
        style,
        offline: offline === true,
      }, catalog),
      shiny: resolveSpriteCandidates({
        speciesId,
        shiny: true,
        style,
        offline: offline === true,
      }, catalog),
    };
  }
  return result;
}

module.exports = {
  activeSpriteSubject,
  representativeSpriteSubject,
  collectionSpeciesIds,
  buildSpriteSnapshot,
};
