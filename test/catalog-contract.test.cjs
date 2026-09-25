const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'test', 'fixtures', 'catalog-v2.json');
const statePath = path.join(root, 'test', 'fixtures', 'state-sprite-style-v2.json');
const ALLOWED_PROVIDERS = new Set(['pokeapi', 'showdown', 'game-assets', 'fixture']);
const ALLOWED_STYLES = new Set(['auto', 'pixel-gen5']);
const ALLOWED_RARITIES = new Set(['common', 'uncommon', 'rare', 'legendary']);
const ALLOWED_SOURCE_HOSTS = new Set(['raw.githubusercontent.com', 'pokeapi.co', 'github.com']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalized(value[key])]));
  return value;
}

function catalogDigest(catalog) {
  const payload = { ...catalog };
  delete payload.catalogVersion;
  if (payload.source && typeof payload.source === 'object') {
    payload.source = { ...payload.source };
    delete payload.source.generatedAt;
  }
  return crypto.createHash('sha256').update(JSON.stringify(normalized(payload))).digest('hex');
}

function isSafeSourceUrl(value) {
  if (typeof value !== 'string' || value.includes('\0')) return false;
  let parsed;
  try { parsed = new URL(value); } catch { return false; }
  return parsed.protocol === 'https:' && !parsed.username && !parsed.password && ALLOWED_SOURCE_HOSTS.has(parsed.hostname);
}

function isSafeLocalPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\')) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const segments = value.split('/');
  return !segments.includes('..') && path.posix.normalize(value) === value;
}

function assertCandidate(candidate, label) {
  assert.ok(candidate && typeof candidate === 'object' && !Array.isArray(candidate), `${label} candidate object`);
  assert.equal(typeof candidate.provider, 'string', `${label}.provider`);
  assert.ok(ALLOWED_PROVIDERS.has(candidate.provider), `${label}.provider allowlist`);
  assert.ok(ALLOWED_STYLES.has(candidate.style), `${label}.style`);
  assert.equal(typeof candidate.animated, 'boolean', `${label}.animated`);
  assert.equal(typeof candidate.sourceUrl, 'string', `${label}.sourceUrl type`);
  assert.equal(isSafeSourceUrl(candidate.sourceUrl), true, `${label}.sourceUrl safety`);
  assert.equal(isSafeLocalPath(candidate.localPath), true, `${label}.localPath safety`);
  assert.match(candidate.sha256, /^[0-9a-f]{64}$/i, `${label}.sha256`);
  assert.equal(typeof candidate.licenseRef, 'string', `${label}.licenseRef`);
  assert.ok(candidate.licenseRef.length > 0, `${label}.licenseRef non-empty`);
}

test('catalog v2 fixture has deterministic metadata, valid lines, species, and variants', () => {
  const catalog = readJson(catalogPath);
  assert.equal(catalog.schemaVersion, 2);
  assert.match(catalog.catalogVersion, /^[0-9a-f]{64}$/);
  assert.equal(catalog.catalogVersion, catalogDigest(catalog));
  assert.equal(typeof catalog.source?.provider, 'string');
  assert.equal(typeof catalog.source?.snapshot, 'string');
  assert.ok(Array.isArray(catalog.source?.generations));
  assert.ok(catalog.source.generations.every((generation) => Number.isInteger(generation) && generation >= 1 && generation <= 9));
  assert.ok(catalog.source.generations.length >= 3);

  assert.ok(Array.isArray(catalog.lines));
  const lineIds = catalog.lines.map((row) => row.id);
  assert.equal(new Set(lineIds).size, lineIds.length);
  assert.ok(lineIds.every((id) => Number.isInteger(id) && id >= 1));
  const species = catalog.species;
  const variants = catalog.variants;
  assert.ok(species && typeof species === 'object' && !Array.isArray(species));
  assert.ok(variants && typeof variants === 'object' && !Array.isArray(variants));

  for (const row of catalog.lines) {
    assert.equal(typeof row.captureRate, 'number');
    assert.ok(Number.isInteger(row.captureRate) && row.captureRate >= 0 && row.captureRate <= 255);
    assert.ok(ALLOWED_RARITIES.has(row.rarity));
    const line = row.line;
    assert.equal(line.baseId, row.id);
    assert.equal(line.captureRate, row.captureRate);
    assert.ok(ALLOWED_RARITIES.has(line.rarity));
    assert.ok(Array.isArray(line.pathOptions) && line.pathOptions.length > 0);
    assert.ok(Array.isArray(line.pathIds) && line.pathIds.length > 0);
    assert.ok(line.pathOptions.some((candidate) => JSON.stringify(candidate) === JSON.stringify(line.pathIds)));
    assert.equal(line.pathOptions.some((candidate) => candidate[0] !== line.baseId), false);
    assert.equal(line.pathOptions.some((candidate) => candidate.some((id) => id === 132)), false);
    for (const candidate of line.pathOptions) {
      assert.ok(candidate.length > 0);
      assert.equal(new Set(candidate).size, candidate.length);
      for (const id of candidate) {
        assert.ok(species[String(id)], `missing species ${id} in line ${row.id}`);
        assert.equal(typeof line.names?.[id]?.en, 'string');
        assert.equal(typeof line.names?.[id]?.it, 'string');
      }
    }
  }

  assert.ok(catalog.lines.some((row) => row.line.pathOptions.length > 1), 'fixture has a branched evolution');
  assert.ok(catalog.lines.some((row) => row.line.pathOptions.some((candidate) => candidate.includes(979))), 'fixture keeps a post-Gen-V evolution');
  assert.ok(species['132'], 'Ditto remains represented in metadata');
  assert.equal(catalog.lines.some((row) => row.id === 132 || row.line.baseId === 132), false);
  const speciesIds = Object.keys(species).map(Number);
  assert.equal(new Set(speciesIds).size, speciesIds.length);
  for (const [key, entry] of Object.entries(species)) {
    assert.equal(String(entry.id), key);
    assert.ok(Number.isInteger(entry.generation) && entry.generation >= 1 && entry.generation <= 9);
    assert.equal(typeof entry.names?.en, 'string');
    assert.equal(typeof entry.names?.it, 'string');
    assert.ok(Array.isArray(entry.variantKeys) && entry.variantKeys.length > 0);
    assert.ok(entry.variantKeys.includes(entry.defaultVariantKey));
    for (const variantKey of entry.variantKeys) {
      assert.ok(variants[variantKey], `${key} references ${variantKey}`);
      assert.equal(variants[variantKey].speciesId, entry.id);
    }
    assert.equal(variants[entry.defaultVariantKey].isDefault, true);
  }

  const nonDefault = Object.entries(variants).find(([, variant]) => variant.isDefault === false);
  assert.ok(nonDefault, 'fixture has a non-default form variant');
  assert.notEqual(Number(nonDefault[0].slice('pokemon:'.length)), nonDefault[1].speciesId);
  for (const [variantKey, variant] of Object.entries(variants)) {
    assert.match(variantKey, /^pokemon:\d+$/);
    assert.equal(String(variant.id), variantKey.slice('pokemon:'.length));
    assert.ok(Number.isInteger(variant.speciesId) && species[String(variant.speciesId)]);
    assert.equal(typeof variant.isDefault, 'boolean');
    assert.equal(typeof variant.formKey, 'string');
    assert.ok(Array.isArray(variant.sprites?.normal));
    assert.ok(Array.isArray(variant.sprites?.shiny));
    variant.sprites.normal.forEach((candidate, index) => assertCandidate(candidate, `${variantKey}.normal[${index}]`));
    variant.sprites.shiny.forEach((candidate, index) => assertCandidate(candidate, `${variantKey}.shiny[${index}]`));
  }
});

test('catalog v2 fixture rejects dangerous source URLs and local paths', () => {
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,AA==', 'file:///C:/secret.png', '//raw.githubusercontent.com/x'])
    assert.equal(isSafeSourceUrl(value), false, value);
  for (const value of ['/absolute.png', 'C:/absolute.png', '../escape.png', 'sprites/../escape.png', 'sprites\\escape.png'])
    assert.equal(isSafeLocalPath(value), false, value);
});

test('state v2 fixture preserves gameplay fields while carrying an unknown setting', () => {
  const state = readJson(statePath);
  assert.equal(state.version, 2);
  assert.equal(typeof state.usedSinceInstall, 'number');
  assert.equal(typeof state.eggUsage, 'number');
  assert.ok(['common', 'uncommon', 'rare', null].includes(state.eggTier));
  assert.ok(state.active && Array.isArray(state.active.pathIds));
  assert.ok(state.active.pathIds.length > 0);
  assert.ok(Number.isInteger(state.active.stageIndex));
  assert.ok(state.active.stageIndex >= 0 && state.active.stageIndex < state.active.pathIds.length);
  assert.equal(typeof state.active.dittoDisguise, 'boolean');
  assert.equal(typeof state.active.dittoRevealed, 'boolean');
  assert.ok(Array.isArray(state.dex));
  assert.ok(state.dex.every((entry) => Array.isArray(entry.chainOrder) && entry.chainOrder.length > 0));
  assert.ok(state.inventory && typeof state.inventory === 'object' && !Array.isArray(state.inventory));
  assert.ok(state.settings && typeof state.settings === 'object');
  assert.equal(state.settings.unknownSetting, 'fixture-only');
  assert.equal(typeof state.pokeDollActive, 'boolean');
  assert.equal(typeof state.representativeSpeciesId, 'number');
});
