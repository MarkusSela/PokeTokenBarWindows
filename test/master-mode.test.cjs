const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MASTER_MODE_CHECKS_REQUIRED,
  registerCheckNow,
  canMasterEdit,
  setSpendableWallet,
} = require('../core/master-mode.cjs');

test('master mode unlocks exactly on the thirtieth Check Now activation', () => {
  assert.equal(MASTER_MODE_CHECKS_REQUIRED, 30);
  const before = registerCheckNow({ masterModeUnlocked: false }, 28);
  assert.equal(before.unlocked, false);
  assert.equal(before.clicks, 29);
  const unlocked = registerCheckNow({ masterModeUnlocked: false }, 29);
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.justUnlocked, true);
  assert.equal(unlocked.clicks, 0);
});

test('master controls require the unlocked flag and their individual toggle', () => {
  assert.equal(canMasterEdit({ masterModeUnlocked: false, masterPokedexAll: true }, 'masterPokedexAll'), false);
  assert.equal(canMasterEdit({ masterModeUnlocked: true, masterPokedexAll: false }, 'masterPokedexAll'), false);
  assert.equal(canMasterEdit({ masterModeUnlocked: true, masterPokedexAll: true }, 'masterPokedexAll'), true);
});

test('spendable wallet editing is gated and preserves spent progression', () => {
  const base = { usedSinceInstall: 1000, spentTokens: 250, settings: { masterModeUnlocked: false, masterTokenEdit: true } };
  assert.equal(setSpendableWallet(base, 500).ok, false);
  const edited = setSpendableWallet({ ...base, settings: { masterModeUnlocked: true, masterTokenEdit: true } }, 123456);
  assert.equal(edited.ok, true);
  assert.equal(edited.state.usedSinceInstall, 123706);
  assert.equal(edited.state.spentTokens, 250);
});
