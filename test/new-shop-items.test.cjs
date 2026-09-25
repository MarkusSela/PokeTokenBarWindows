const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, BALANCE } = require('../core/game.cjs');
const { createLocalService } = require('../core/local-service.cjs');
const { sanitizeSnapshot } = require('../core/snapshot-contract.cjs');

function serviceFor(state, options = {}) {
  return createLocalService({
    mode: options.mode || 'web-local',
    platform: 'win32',
    env: {},
    state,
    catalog: [],
    persist: false,
    hermesReader: async () => ({}),
    localReader: async () => ({}),
    scanReader: async () => ({}),
    releaseChecker: async () => ({ ok: true, updateAvailable: false }),
  });
}

test('local service routes Exp. Candy XL purchase and use', async () => {
  const state = Game.fresh({
    state: {
      usedSinceInstall: 2_000_000_000,
      active: {
        baseId: 1,
        pathIds: [1, 2, 3],
        plannedPathIds: [1, 2, 3],
        stageIndex: 2,
        usedAtStage: 0,
        rarity: 'common',
        totalForms: 3,
      },
    },
  }).state;
  const service = serviceFor(state);
  assert.equal((await service.handleAction('buy', 'expCandyXL')).ok, true);
  const used = await service.handleAction('candy-xl');
  assert.equal(used.ok, true);
  assert.equal(used.snapshot.state.inventory.expCandyXL, undefined);
  assert.equal(used.snapshot.active.usedAtStage, BALANCE.expCandyXL.progress);
  assert.equal(service.game.state.spentTokens, BALANCE.expCandyXL.price);
});

test('local service arms Hatch Incubator and Shiny Incense through mutating actions', async () => {
  const incubator = serviceFor(Game.fresh({ state: { inventory: { hatchIncubator: 1 } } }).state);
  const incubatorResult = await incubator.handleAction('hatch-incubator');
  assert.equal(incubatorResult.ok, true);
  assert.equal(incubatorResult.snapshot.state.inventory.hatchIncubator, 1);
  assert.equal(incubatorResult.snapshot.state.nextHatchModifiers.hatchIncubator, true);

  const incense = serviceFor(Game.fresh({ state: { inventory: { shinyIncense: 1 } } }).state);
  const incenseResult = await incense.handleAction('shiny-incense');
  assert.equal(incenseResult.ok, true);
  assert.equal(incenseResult.snapshot.state.inventory.shinyIncense, 1);
  assert.equal(incenseResult.snapshot.state.nextHatchModifiers.shinyIncense, true);
});

test('read-only local service rejects the new item mutations at the action boundary', async () => {
  const service = serviceFor(Game.fresh({ state: { inventory: { hatchIncubator: 1 } } }).state, { mode: 'public-readonly' });
  const result = await service.handleAction('hatch-incubator');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'ACTION_NOT_ALLOWED');
});

test('snapshot contract preserves new inventory, pending modifiers, and hatch threshold', () => {
  const snapshot = sanitizeSnapshot({
    state: {
      version: 2,
      eggUsage: 1_000_000,
      eggTier: 'common',
      nextHatchModifiers: { hatchIncubator: true, shinyIncense: true },
      inventory: { expCandyXL: 1, hatchIncubator: 2, shinyIncense: 3, pokeDoll: 1 },
      dex: [],
    },
    balance: {
      freshEgg: { price: 1_000_000_000 },
      graduation: { common: 750_000_000, uncommon: 1_875_000_000, rare: 3_000_000_000 },
      expCandyXL: { price: BALANCE.expCandyXL.price },
      hatchIncubator: { price: BALANCE.hatchIncubator.price },
      shinyIncense: { price: BALANCE.shinyIncense.price },
    },
    egg: { progress: 0.4, remaining: 1_500_000, threshold: 2_500_000, tier: 'common' },
  });
  assert.deepEqual(snapshot.state.inventory, {
    expCandyXL: 1,
    hatchIncubator: 2,
    shinyIncense: 3,
    pokeDoll: 1,
  });
  assert.deepEqual(snapshot.state.nextHatchModifiers, { hatchIncubator: true, shinyIncense: true });
  assert.equal(snapshot.egg.threshold, 2_500_000);
  assert.equal(snapshot.balance.expCandyXL.price, BALANCE.expCandyXL.price);
});
