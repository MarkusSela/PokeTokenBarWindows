const crypto = require('node:crypto');
const path = require('node:path');

const SCHEMA_VERSION = 2;
const ALLOWED_RARITIES = new Set(['common', 'uncommon', 'rare', 'legendary']);
const ALLOWED_STYLES = new Set(['auto', 'pixel-gen5']);
const ALLOWED_SOURCE_HOSTS = new Set([
  'raw.githubusercontent.com',
  'pokeapi.co',
  'play.pokemonshowdown.com',
  'github.com',
]);

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function stableNormalize(value) {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (isRecord(value))
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableNormalize(value[key])]));
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function digestPayload(catalog) {
  const payload = { ...catalog };
  delete payload.catalogVersion;
  if (isRecord(payload.source)) {
    payload.source = { ...payload.source };
    delete payload.source.generatedAt;
  }
  return payload;
}

function catalogDigest(catalog) {
  return crypto.createHash('sha256').update(stableStringify(digestPayload(catalog))).digest('hex');
}

function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.includes('\0')) return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && ALLOWED_SOURCE_HOSTS.has(url.hostname)
    && !decodeURIComponent(url.pathname).split('/').includes('..');
}

function safeLocalPath(value) {
  if (value === null) return true;
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\')) return false;
  return !path.posix.isAbsolute(value)
    && !path.win32.isAbsolute(value)
    && !value.split('/').includes('..')
    && path.posix.normalize(value) === value;
}

function validateCandidate(candidate, label) {
  if (!isRecord(candidate)) throw new Error(`Invalid catalog sprite candidate ${label}`);
  if (typeof candidate.provider !== 'string' || !candidate.provider) throw new Error(`Invalid catalog provider ${label}`);
  if (!ALLOWED_STYLES.has(candidate.style)) throw new Error(`Invalid catalog sprite style ${label}`);
  if (typeof candidate.animated !== 'boolean') throw new Error(`Invalid catalog animated flag ${label}`);
  if (!safeSourceUrl(candidate.sourceUrl)) throw new Error(`Unsafe catalog sprite URL ${label}`);
  if (!safeLocalPath(candidate.localPath)) throw new Error(`Unsafe catalog local path ${label}`);
  if (candidate.sha256 !== null && !/^[0-9a-f]{64}$/i.test(candidate.sha256 || '')) throw new Error(`Invalid catalog sprite hash ${label}`);
  if (typeof candidate.licenseRef !== 'string' || !candidate.licenseRef) throw new Error(`Missing catalog license reference ${label}`);
  if (typeof candidate.packageAllowed !== 'boolean') throw new Error(`Missing catalog package flag ${label}`);
}

function validateCatalogDocument(catalog) {
  if (!isRecord(catalog) || catalog.schemaVersion !== SCHEMA_VERSION)
    throw new Error('Invalid catalog schemaVersion');
  if (!/^[0-9a-f]{64}$/i.test(catalog.catalogVersion || '') || catalog.catalogVersion !== catalogDigest(catalog))
    throw new Error('Invalid catalogVersion digest');
  if (!isRecord(catalog.source) || !Array.isArray(catalog.source.generations))
    throw new Error('Invalid catalog source metadata');
  if (!Array.isArray(catalog.lines) || !isRecord(catalog.species) || !isRecord(catalog.variants))
    throw new Error('Invalid catalog collections');

  const lineIds = new Set();
  for (const row of catalog.lines) {
    if (!isRecord(row) || !Number.isInteger(row.id) || lineIds.has(row.id)) throw new Error('Invalid or duplicate catalog line id');
    lineIds.add(row.id);
    if (row.id === 132 || row.line?.baseId === 132) throw new Error('Ditto cannot be a selectable catalog line');
    if (!Number.isInteger(row.captureRate) || row.captureRate < 0 || row.captureRate > 255 || !ALLOWED_RARITIES.has(row.rarity))
      throw new Error(`Invalid catalog line metadata ${row.id}`);
    const line = row.line;
    if (!isRecord(line) || line.baseId !== row.id || !Array.isArray(line.pathOptions) || !Array.isArray(line.pathIds))
      throw new Error(`Invalid catalog line ${row.id}`);
    if (!line.pathOptions.some((candidate) => JSON.stringify(candidate) === JSON.stringify(line.pathIds)))
      throw new Error(`Catalog pathIds is not a path option ${row.id}`);
    for (const pathIds of line.pathOptions) {
      if (!Array.isArray(pathIds) || pathIds[0] !== row.id || pathIds.includes(132)) throw new Error(`Invalid catalog path ${row.id}`);
      for (const id of pathIds) if (!catalog.species[String(id)]) throw new Error(`Catalog path references missing species ${id}`);
    }
  }

  for (const [key, species] of Object.entries(catalog.species)) {
    if (!isRecord(species) || String(species.id) !== key || !Number.isInteger(species.generation) || species.generation < 1 || species.generation > 9)
      throw new Error(`Invalid catalog species ${key}`);
    if (!isRecord(species.names) || typeof species.names.en !== 'string' || typeof species.names.it !== 'string')
      throw new Error(`Invalid catalog species names ${key}`);
    if (!Array.isArray(species.variantKeys) || !species.variantKeys.includes(species.defaultVariantKey))
      throw new Error(`Invalid catalog variant references ${key}`);
    let defaults = 0;
    for (const variantKey of species.variantKeys) {
      const variant = catalog.variants[variantKey];
      if (!variant || variant.speciesId !== species.id) throw new Error(`Catalog variant species mismatch ${key}/${variantKey}`);
      if (variant.isDefault) defaults += 1;
    }
    if (defaults !== 1 || !catalog.variants[species.defaultVariantKey].isDefault)
      throw new Error(`Catalog species default variant mismatch ${key}`);
  }

  for (const [key, variant] of Object.entries(catalog.variants)) {
    if (!/^pokemon:\d+$/.test(key) || !isRecord(variant) || String(variant.id) !== key.slice('pokemon:'.length))
      throw new Error(`Invalid catalog variant key ${key}`);
    if (!Number.isInteger(variant.speciesId) || !catalog.species[String(variant.speciesId)])
      throw new Error(`Invalid catalog variant species ${key}`);
    if (typeof variant.isDefault !== 'boolean' || typeof variant.formKey !== 'string' || !variant.formKey)
      throw new Error(`Invalid catalog variant metadata ${key}`);
    if (!isRecord(variant.sprites) || !Array.isArray(variant.sprites.normal) || !Array.isArray(variant.sprites.shiny))
      throw new Error(`Invalid catalog sprite lists ${key}`);
    const seenNormal = new Set();
    const seenShiny = new Set();
    for (const [kind, seen] of [['normal', seenNormal], ['shiny', seenShiny]]) {
      variant.sprites[kind].forEach((candidate, index) => {
        validateCandidate(candidate, `${key}.${kind}[${index}]`);
        if (seen.has(candidate.sourceUrl)) throw new Error(`Duplicate catalog sprite candidate ${key}.${kind}`);
        seen.add(candidate.sourceUrl);
      });
    }
  }
  return true;
}

module.exports = {
  SCHEMA_VERSION,
  stableNormalize,
  stableStringify,
  digestPayload,
  catalogDigest,
  safeSourceUrl,
  safeLocalPath,
  validateCatalogDocument,
};
