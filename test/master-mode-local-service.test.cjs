const test = require('node:test');
const assert = require('node:assert/strict');
const { createLocalService } = require('../core/local-service.cjs');
const { Game } = require('../core/game.cjs');

function fixtureState() {
  const state = Game.fresh({ rng: () => 0 }).state;
  state.settings.masterModeUnlocked = false;
  state.settings.masterPokedexAll = false;
  state.settings.masterTokenEdit = false;
  state.dex = [];
  return state;
}

function fixtureService(options = {}) {
  return createLocalService({
    mode: options.mode || 'web-local',
    platform: 'win32',
    env: {},
    state: options.state || fixtureState(),
    catalog: {
      schemaVersion: 2,
      species: {
        '1': { id: 1, names: { en: 'Bulbasaur', it: 'Bulbasaur' }, variantKeys: ['pokemon:1'], defaultVariantKey: 'pokemon:1' },
        '2': { id: 2, names: { en: 'Ivysaur', it: 'Ivysaur' }, variantKeys: ['pokemon:2'], defaultVariantKey: 'pokemon:2' },
      },
      variants: {
        'pokemon:1': { id: 1, speciesId: 1, isDefault: true, formKey: 'default', sprites: { normal: [], shiny: [] } },
        'pokemon:2': { id: 2, speciesId: 2, isDefault: true, formKey: 'default', sprites: { normal: [], shiny: [] } },
      },
      lines: [],
    },
    persist: false,
    qa: Boolean(options.qa),
    releaseChecker: async () => ({ ok: true, updateAvailable: false }),
    hermesReader: async () => ({}),
    localReader: async () => ({}),
    scanReader: async () => ({}),
  });
}

test('local service unlocks master mode exactly on the thirtieth check', async () => {
  const service = fixtureService({ qa: true });
  let result;
  for (let i = 0; i < 30; i += 1) result = await service.handleAction('check-update');
  assert.equal(result.ok, true);
  assert.equal(result.masterMode.justUnlocked, true);
  assert.equal(result.masterMode.unlocked, true);
  assert.equal(result.snapshot.settings.masterModeUnlocked, true);

  const tokenToggle = await service.handleAction('setting', { key: 'masterTokenEdit', value: true });
  assert.equal(tokenToggle.ok, true);
  const set = await service.handleAction('master-set-wallet', 12345);
  assert.equal(set.ok, true);
  assert.equal(set.snapshot.wallet, 12345);

  const pokedex = await service.handleAction('setting', { key: 'masterPokedexAll', value: true });
  assert.equal(pokedex.ok, true);
  const pokedexSnapshot = await service.handleAction('snapshot');
  assert.deepEqual(pokedexSnapshot.snapshot.collection.pokedex.map((entry) => entry.id), [1, 2]);
});

test('non-QA local profiles cannot enable or edit Shop tokens', async () => {
  const service = fixtureService();
  for (let i = 0; i < 30; i += 1) await service.handleAction('check-update');
  assert.equal((await service.handleAction('setting', { key: 'masterTokenEdit', value: true })).ok, false);
  assert.equal((await service.handleAction('master-set-wallet', 999)).ok, false);
});

test('Master Mode exposes session-only Shop test credits without changing the saved wallet', async () => {
  const state = fixtureState();
  state.settings.masterModeUnlocked = true;
  const service = fixtureService({ state });
  const added = await service.handleAction('add-test-shop-tokens', 1_000_000_000);
  assert.equal(added.ok, true);
  assert.equal(added.snapshot.wallet, 1_000_000_000);
  assert.equal(added.snapshot.testShopTokens, 1_000_000_000);
  const bought = await service.handleAction('buy', 'rareCandy');
  assert.equal(bought.ok, true);
  assert.equal(bought.snapshot.wallet, 500_000_000);
  assert.equal(bought.snapshot.testShopTokens, 500_000_000);
});

test('read-only local service never unlocks master mode', async () => {
  const service = fixtureService({ mode: 'public-readonly' });
  let result;
  for (let i = 0; i < 30; i += 1) result = await service.handleAction('check-update');
  assert.equal(result.ok, true);
  assert.equal(result.masterMode.unlocked, false);
  assert.equal(result.snapshot.settings.masterModeUnlocked, false);
  assert.equal((await service.handleAction('master-set-wallet', 999)).ok, false);
});
