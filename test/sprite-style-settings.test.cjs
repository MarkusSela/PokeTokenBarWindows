const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_SETTINGS, normalizeSettings, updateSetting } = require('../core/settings.cjs');
const { normalizeState } = require('../core/game.cjs');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'state-sprite-style-v2.json'), 'utf8'));

test('spriteStyle defaults to auto and accepts only auto or pixel-gen5', () => {
  assert.equal(DEFAULT_SETTINGS.spriteStyle, 'auto');
  assert.equal(normalizeSettings({}).spriteStyle, 'auto');
  assert.equal(normalizeSettings({ spriteStyle: 'auto' }).spriteStyle, 'auto');
  assert.equal(normalizeSettings({ spriteStyle: 'pixel-gen5' }).spriteStyle, 'pixel-gen5');
});

test('unknown, null, numeric, and object spriteStyle values normalize to auto', () => {
  for (const value of ['unknown', null, 42, {}, [], ' Pixel Gen V '])
    assert.equal(normalizeSettings({ spriteStyle: value }).spriteStyle, 'auto');
});

test('updateSetting persists spriteStyle through repeated normalization', () => {
  const pixel = updateSetting(DEFAULT_SETTINGS, 'spriteStyle', 'pixel-gen5');
  assert.equal(pixel.spriteStyle, 'pixel-gen5');
  assert.equal(normalizeSettings(pixel).spriteStyle, 'pixel-gen5');
  assert.equal(updateSetting(pixel, 'spriteStyle', 'auto').spriteStyle, 'auto');
});

test('changing spriteStyle changes no normalized gameplay or unrelated settings fields', () => {
  const before = normalizeState(fixture);
  const nextSettings = updateSetting(before.settings, 'spriteStyle', 'auto');
  const after = normalizeState({ ...fixture, settings: nextSettings });
  assert.equal(after.settings.spriteStyle, 'auto');
  const beforeState = { ...before, settings: undefined };
  const afterState = { ...after, settings: undefined };
  assert.deepEqual(afterState, beforeState);
  assert.deepEqual(after.active.pathIds, before.active.pathIds);
  assert.equal(after.active.stageIndex, before.active.stageIndex);
  assert.equal(after.active.rarity, before.active.rarity);
  assert.equal(after.active.dittoDisguise, before.active.dittoDisguise);
  assert.equal(after.active.dittoRevealed, before.active.dittoRevealed);
  assert.deepEqual(after.dex, before.dex);
  assert.deepEqual(after.inventory, before.inventory);
  assert.equal(after.eggUsage, before.eggUsage);
  assert.equal(after.usedSinceInstall, before.usedSinceInstall);
});

test('spriteStyle is included in the effective settings select contract', () => {
  const values = ['auto', 'pixel-gen5'];
  for (const value of values) assert.equal(updateSetting({}, 'spriteStyle', value).spriteStyle, value);
  assert.equal(Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, 'spriteStyle'), true);
});
