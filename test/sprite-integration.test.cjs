const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'pokemon-catalog.json'), 'utf8'));
const stateFixture = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'state-sprite-style-v2.json'), 'utf8'));
const { buildSpriteSnapshot } = require('../core/sprite-snapshot.cjs');
const { createLocalService } = require('../core/local-service.cjs');
const { sanitizeSnapshot } = require('../core/snapshot-contract.cjs');

function candidateSource(candidate) {
  return candidate?.src || '';
}

test('main sprite snapshot resolves active, representative, and only visible collection species', () => {
  const snapshot = buildSpriteSnapshot({
    catalog,
    style: 'pixel-gen5',
    active: {
      pathIds: [56, 57, 979],
      stageIndex: 1,
      shiny: true,
      dittoDisguise: false,
      dittoRevealed: false,
    },
    representative: { id: 56, shiny: true },
    collection: {
      pokedex: [{ id: 1 }, { id: 979 }],
      catchLog: [{ chainOrder: [56, 57, 979], shiny: true }],
    },
  });

  assert.equal(snapshot.active.speciesId, 57);
  assert.equal(snapshot.active.shiny, true);
  assert.equal(snapshot.active.candidates[0].provider, 'pokeapi');
  assert.match(candidateSource(snapshot.active.candidates[0]), /generation-v/);
  assert.equal(snapshot.representative.speciesId, 56);
  assert.equal(snapshot.representative.candidates[0].shiny, true);
  assert.deepEqual(Object.keys(snapshot.collection).map(Number), [1, 56, 57, 979]);
  assert.equal(Object.keys(snapshot.collection).length < Object.keys(catalog.species).length, true);
  assert.ok(snapshot.collection['979'].normal.length > 0);
  assert.ok(snapshot.collection['979'].shiny.length > 0);
});

test('masked and revealed Ditto keep the existing visible-species and shiny semantics', () => {
  const masked = buildSpriteSnapshot({
    catalog,
    style: 'auto',
    active: {
      pathIds: [25],
      stageIndex: 0,
      shiny: true,
      dittoDisguise: true,
      dittoRevealed: false,
    },
  });
  assert.equal(masked.active.speciesId, 25);
  assert.equal(masked.active.shiny, false);
  assert.ok(masked.active.candidates.every((candidate) => candidate.shiny === false));

  const revealed = buildSpriteSnapshot({
    catalog,
    style: 'auto',
    active: {
      pathIds: [132],
      stageIndex: 0,
      shiny: true,
      dittoDisguise: true,
      dittoRevealed: true,
    },
  });
  assert.equal(revealed.active.speciesId, 132);
  assert.equal(revealed.active.shiny, true);
  assert.ok(revealed.active.candidates.every((candidate) => candidate.shiny === true));
});

test('local service transports the same sprite candidate contract and persists sprite style only', async () => {
  const before = JSON.stringify(stateFixture);
  const service = createLocalService({
    mode: 'public-readonly',
    readOnly: true,
    persist: false,
    state: stateFixture,
    catalog,
    hermesReader: async () => ({}),
    localReader: async () => ({}),
    scanReader: async () => ({}),
  });
  const snapshot = await service.getSnapshot();
  assert.equal(snapshot.settings.spriteStyle, 'pixel-gen5');
  assert.equal(snapshot.spriteCandidates.active.speciesId, 57);
  assert.ok(snapshot.spriteCandidates.active.candidates.length > 0);
  assert.ok(snapshot.spriteCandidates.collection['1'].normal.length > 0);
  assert.equal(JSON.stringify(stateFixture), before);
});

test('snapshot sanitization preserves full approved sprite URLs across the IPC boundary', () => {
  const original = catalog.variants['pokemon:57'].sprites.shiny[0].sourceUrl;
  const snapshot = sanitizeSnapshot({
    state: { settings: {}, dex: [], inventory: {} },
    settings: {},
    spriteCandidates: {
      schemaVersion: 1,
      style: 'auto',
      active: {
        speciesId: 57,
        shiny: false,
        candidates: [{ src: original, provider: 'pokeapi', animated: false, shiny: false, fallbackKind: 'static' }],
      },
      representative: null,
      collection: {},
    },
    egg: {},
    usage: {},
    limits: {},
  });
  assert.equal(snapshot.spriteCandidates.active.candidates[0].src, original);
  assert.equal(snapshot.spriteCandidates.active.candidates[0].fallbackKind, 'static');
});

test('renderer consumers do not construct a Gen V URL or access Node APIs', () => {
  const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'core', 'local-service.cjs'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const floating = fs.readFileSync(path.join(root, 'floating.html'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');

  assert.doesNotMatch(main, /raw\.githubusercontent\.com\/PokeAPI\/sprites[\s\S]{0,300}generation-v/);
  assert.equal((main.match(/function representativeSnapshot\(\)/g) || []).length, 1);
  assert.doesNotMatch(main, /representativeSprite/);
  assert.doesNotMatch(service, /raw\.githubusercontent\.com\/PokeAPI\/sprites[\s\S]{0,300}generation-v/);
  assert.doesNotMatch(html, /raw\.githubusercontent\.com\/PokeAPI\/sprites|generation-v/);
  assert.doesNotMatch(floating, /raw\.githubusercontent\.com\/PokeAPI\/sprites|generation-v/);
  assert.match(html, /assets\/sprite-image\.js/);
  assert.match(floating, /assets\/sprite-image\.js/);
  assert.doesNotMatch(html, /require\(|process\.|ipcRenderer/);
  assert.doesNotMatch(floating, /require\(|process\.|ipcRenderer/);
  assert.doesNotMatch(preload, /contextBridge\.exposeInMainWorld\([\s\S]*fs|fetch/);
});
