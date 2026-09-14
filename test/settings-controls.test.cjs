const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_SETTINGS, normalizeSettings, updateSetting } = require('../core/settings.cjs');
const { normalizeState } = require('../core/game.cjs');

const toggleKeys = [
  'launchAtLogin', 'menuTodayTokens', 'menuTodayCost', 'menuLimitPercent',
  'showFloatingPet', 'showGoldWalking', 'notificationsBubbles', 'limitAlerts', 'companionEvents',
  'providerStatus', 'keychainOptOut',
];

test('every settings toggle accepts true and false through the real normalizer', () => {
  for (const key of toggleKeys) {
    const next = updateSetting(DEFAULT_SETTINGS, key, false);
    assert.equal(next[key], false, key);
    assert.equal(typeof updateSetting(next, key, true)[key], 'boolean', key);
  }
});

test('every settings select accepts its supported values', () => {
  for (const language of ['it', 'en', 'ko', 'ja', 'es', 'fr', 'pt'])
    assert.equal(updateSetting(DEFAULT_SETTINGS, 'language', language).language, language);
  for (const refreshMinutes of [0, 1, 5, 15])
    assert.equal(updateSetting(DEFAULT_SETTINGS, 'refreshMinutes', refreshMinutes).refreshMinutes, refreshMinutes);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'refreshMinutes', 'manual').refreshMinutes, 0);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'limitDisplay', 'remaining').limitDisplay, 'remaining');
});

test('all settings sliders clamp safely at their documented bounds', () => {
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'warningPercent', -20).warningPercent, 0);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'warningPercent', 120).warningPercent, 100);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'criticalPercent', -20).criticalPercent, 0);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'criticalPercent', 120).criticalPercent, 100);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'floatingPetSize', 1).floatingPetSize, 48);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'floatingPetSize', 999).floatingPetSize, 256);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'goldWalkingSize', 1).goldWalkingSize, 24);
  assert.equal(updateSetting(DEFAULT_SETTINGS, 'goldWalkingSize', 999).goldWalkingSize, 128);

});

test('Gold walking settings survive normalization and clamp their size', () => {
  const normalized = normalizeSettings({ showGoldWalking: true, goldWalkingSize: 128 });
  assert.equal(normalized.showGoldWalking, true);
  assert.equal(normalized.goldWalkingSize, 128);
});

test('English is the primary language for a new or legacy state without a language', () => {
  assert.equal(DEFAULT_SETTINGS.language, 'en');
  assert.equal(normalizeState({}).language, 'en');
});
