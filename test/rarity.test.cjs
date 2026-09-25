const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { classifyRarity, classifyPokeApiSpecies, classifyEvolutionLine } = require('../core/rarity.cjs');
const { rarity: legacyRarity, normalizeState } = require('../core/game.cjs');

const root = path.resolve(__dirname, '..');
const stateFixture = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'state-sprite-style-v2.json'), 'utf8'));

for (const [captureRate, expected] of [
  [0, 'rare'],
  [45, 'rare'],
  [46, 'uncommon'],
  [120, 'uncommon'],
  [121, 'common'],
  [255, 'common'],
]) {
  test(`classifies capture rate ${captureRate} as ${expected}`, () => {
    assert.equal(classifyRarity({ captureRate }), expected);
  });
}

test('legendary and mythical flags override capture-rate thresholds', () => {
  assert.equal(classifyRarity({ captureRate: 255, legendary: true }), 'legendary');
  assert.equal(classifyRarity({ captureRate: 255, mythical: true }), 'legendary');
  assert.equal(classifyRarity({ captureRate: 45, legendary: false, mythical: false }), 'rare');
});

test('evolution-line rarity follows the old egg capture-rate model, not path length', () => {
  assert.equal(classifyEvolutionLine({ paths: [[1, 2, 3]], captureRate: 255, legendary: false, mythical: false }), 'common');
  assert.equal(classifyEvolutionLine({ paths: [[1, 2]], captureRate: 120, legendary: false, mythical: false }), 'uncommon');
  assert.equal(classifyEvolutionLine({ paths: [[1]], captureRate: 45, legendary: false, mythical: false }), 'rare');
  assert.equal(classifyEvolutionLine({ paths: [[1, 2], [1, 2, 3]], captureRate: 190, legendary: false, mythical: false }), 'common');
  assert.equal(classifyEvolutionLine({ paths: [[1, 2, 3]], captureRate: 255, legendary: true, mythical: false }), 'legendary');
});

test('the historical Gen I-V catalog is reproduced exactly by the egg rarity model', () => {
  const historical = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'pokemon-catalog-gen1-5.json'), 'utf8'));
  for (const row of historical) {
    const expected = classifyRarity({
      captureRate: row.captureRate,
      legendary: row.rarity === 'legendary',
      mythical: false,
    });
    assert.equal(expected, row.rarity, `historical line ${row.line.baseId}`);
  }
});

test('a valid explicit override has precedence and an invalid override does not', () => {
  assert.equal(classifyRarity({ captureRate: 255 }, 'rare'), 'rare');
  assert.equal(classifyRarity({ captureRate: 45 }, 'common'), 'common');
  assert.equal(classifyRarity({ captureRate: 45 }, 'not-a-rarity'), 'rare');
  assert.equal(classifyRarity({ captureRate: 45 }, null), 'rare');
});

test('invalid source data raises instead of silently becoming common', () => {
  for (const source of [undefined, null, {}, { captureRate: '45' }, { captureRate: -1 }, { captureRate: 256 }, { captureRate: NaN }, { captureRate: 45, legendary: 'false' }])
    assert.throws(() => classifyRarity(source), /captureRate|source|boolean/);
});

test('the PokeAPI adapter translates snake-case source fields', () => {
  assert.equal(classifyPokeApiSpecies({ capture_rate: 120, is_legendary: false, is_mythical: false }), 'uncommon');
  assert.equal(classifyPokeApiSpecies({ capture_rate: 255, is_legendary: true, is_mythical: false }), 'legendary');
  assert.throws(() => classifyPokeApiSpecies({ capture_rate: undefined, is_legendary: false, is_mythical: false }), /capture_rate/);
});

test('the game rarity export preserves its existing public API', () => {
  assert.equal(legacyRarity({ captureRate: 45 }), 'rare');
  assert.equal(legacyRarity({ captureRate: 46 }), 'uncommon');
  assert.equal(legacyRarity({ captureRate: 121 }), 'common');
  assert.equal(legacyRarity({ captureRate: 255, legendary: true }), 'legendary');
});

test('state normalization preserves saved rarity, paths, progress, and dex records', () => {
  const normalized = normalizeState(stateFixture);
  assert.equal(normalized.active.rarity, stateFixture.active.rarity);
  assert.deepEqual(normalized.active.pathIds, stateFixture.active.pathIds);
  assert.deepEqual(normalized.active.plannedPathIds, stateFixture.active.plannedPathIds);
  assert.equal(normalized.active.stageIndex, stateFixture.active.stageIndex);
  assert.equal(normalized.active.usedAtStage, stateFixture.active.usedAtStage);
  assert.equal(normalized.active.dittoDisguise, stateFixture.active.dittoDisguise);
  assert.equal(normalized.active.dittoRevealed, stateFixture.active.dittoRevealed);
  assert.equal(normalized.dex[0].rarity, stateFixture.dex[0].rarity);
  assert.deepEqual(normalized.dex[0].chainOrder, stateFixture.dex[0].chainOrder);
  assert.deepEqual(normalized.inventory, stateFixture.inventory);
  assert.equal(normalized.eggUsage, stateFixture.eggUsage);
  assert.equal(normalized.usedSinceInstall, stateFixture.usedSinceInstall);
});

test('versioned rarity override file is valid and contains only explicit exceptions', () => {
  const overrides = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'pokemon-rarity-overrides.json'), 'utf8'));
  assert.equal(overrides.schemaVersion, 1);
  assert.equal(typeof overrides.overrides, 'object');
  assert.equal(Array.isArray(overrides.overrides), false);
  for (const value of Object.values(overrides.overrides)) assert.equal(['common', 'uncommon', 'rare', 'legendary'].includes(value), true);
});
