const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, BALANCE, eggProgress, eggTokensToHatch } = require('../core/game.cjs');

test('first usage snapshot seeds baseline without awarding progress', () => {
  const game = Game.fresh({ rng: () => 0 });
  assert.equal(game.applyProviderTotals({ hermes: 7_000_000 }, '2026-08-28'), 0);
  assert.equal(game.state.eggUsage, 0);
  assert.equal(game.state.usedSinceInstall, 0);
});

test('new built-in provider history is baselined before future deltas are credited', () => {
  const game = new Game({
    state: {
      usageBaselineSet: true,
      claimedUsageByRow: {},
      claimedUsageMetricsByRow: {},
    },
  });
  const first = {
    key: 'scan:Claude Code',
    provider: 'Claude Code',
    tokens: 100,
    input: 100,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
    cost: 0,
  };
  assert.equal(game.seedUsageRows([first]), 0);
  assert.equal(game.applyUsageRows([first]), 0);
  assert.equal(game.state.usedSinceInstall, 0);
  assert.equal(game.applyUsageRows([{ ...first, tokens: 150, input: 150 }]), 50);
  assert.equal(game.state.usedSinceInstall, 50);
});

test('egg hatches at original five million threshold and retains overflow', () => {
  const game = Game.fresh({ rng: () => 0 });
  game.applyProviderTotals({ hermes: 0 }, '2026-08-28');
  game.applyProviderTotals({ hermes: BALANCE.eggHatch + 12 }, '2026-08-28');
  assert.equal(game.state.active.baseId, 1);
  assert.equal(game.state.active.usedAtStage, 12);
  assert.equal(game.state.eggUsage, 0);
});

test('wallet spending never decreases lifetime progression', () => {
  const game = Game.fresh({ rng: () => 0 });
  game.state.usedSinceInstall = 600_000_000;
  assert.equal(game.buyItem('rareCandy'), true);
  assert.equal(game.wallet, 100_000_000);
  assert.equal(game.state.usedSinceInstall, 600_000_000);
});

test('phase thresholds add up to the original graduation total', () => {
  for (const rarity of ['common', 'uncommon', 'rare', 'legendary']) {
    const forms = 3;
    const total = [0, 1, 2].reduce((sum, stage) => sum + require('../core/game.cjs').phaseThreshold(rarity, forms, stage), 0);
    assert.equal(total, BALANCE.graduation[rarity]);
  }
});

test('rare candy modifies only active progress and never Hermes lifetime usage', () => {
  const game = Game.fresh({ rng: () => 0 });
  game.state.active = { baseId: 1, pathIds: [1], plannedPathIds: [1, 2, 3], stageIndex: 0, usedAtStage: 0, rarity: 'common', totalForms: 3, names: {} };
  game.state.inventory.rareCandy = 1;
  game.state.usedSinceInstall = 900_000_000;
  assert.equal(game.useRareCandy(), true);
  assert.equal(game.state.usedSinceInstall, 900_000_000);
  assert.equal(game.state.inventory.rareCandy, 0);
  assert.equal(game.state.active.usedAtStage, BALANCE.rareCandy.xp);
});

test('fresh egg discards an active companion without adding it to the Pokédex', () => {
  const game = Game.fresh();
  game.state.active = { baseId: 1, pathIds: [1], plannedPathIds: [1], stageIndex: 0, usedAtStage: 0, rarity: 'common', totalForms: 1 };
  game.state.usedSinceInstall = 1_000_000_000;
  assert.equal(game.buyEgg(null), true);
  assert.equal(game.state.active, null);
  assert.equal(game.state.dex.length, 0);
  assert.equal(game.state.eggUsage, 0);
});

test('provider totals credit only new Hermes usage and do not double count refreshes', () => {
  const game = Game.fresh();
  assert.equal(game.applyProviderTotals({ hermes: 100 }, '2026-08-28'), 0);
  assert.equal(game.applyProviderTotals({ hermes: 150 }, '2026-08-28'), 50);
  assert.equal(game.applyProviderTotals({ hermes: 150 }, '2026-08-28'), 0);
  assert.equal(game.state.usedSinceInstall, 50);
});

test('mint changes nature, consumes one mint, and never changes token progress', () => {
  const game = new Game({
    state: {
      usedSinceInstall: 8_000_000_000,
      spentTokens: 2_000_000_000,
      inventory: { mint: 1 },
      active: {
        baseId: 1,
        pathIds: [1],
        plannedPathIds: [1],
        stageIndex: 0,
        usedAtStage: 123,
        rarity: 'common',
        totalForms: 1,
        nature: 'Hardy',
      },
    },
    rng: () => 0,
  });
  assert.equal(game.useMint(), true);
  assert.equal(game.state.active.nature, 'Lonely');
  assert.equal(game.state.inventory.mint, 0);
  assert.equal(game.state.active.usedAtStage, 123);
  assert.equal(game.state.usedSinceInstall, 8_000_000_000);
  assert.equal(game.state.spentTokens, 2_000_000_000);
});

test('new egg countdown starts at five million and tracks only the current egg', () => {
  const game = new Game({
    state: {
      usedSinceInstall: 8_000_000_000,
      spentTokens: 1_000_000_000,
      active: { baseId: 1, pathIds: [1], plannedPathIds: [1], stageIndex: 0, usedAtStage: 0, rarity: 'common', totalForms: 1 },
    },
  });
  assert.equal(game.buyEgg(null), true);
  assert.equal(game.state.eggUsage, 0);
  assert.equal(eggProgress(game.state.eggUsage), 0);
  assert.equal(eggTokensToHatch(game.state.eggUsage), BALANCE.eggHatch);
  game.applyUsage(123_456);
  assert.equal(game.state.eggUsage, 123_456);
  assert.equal(eggProgress(game.state.eggUsage), 123_456 / BALANCE.eggHatch);
  assert.equal(eggTokensToHatch(game.state.eggUsage), BALANCE.eggHatch - 123_456);
  assert.equal(game.wallet, 6_000_123_456);
});

test('hatching waits for a catalog and preserves threshold usage when the app catalog is empty', () => {
  const game = Game.fresh({ catalog: [] });
  let hatchCalls = 0;
  game.hatch = () => { hatchCalls += 1; return false; };
  game.applyUsage(BALANCE.eggHatch);
  assert.equal(hatchCalls, 0);
  assert.equal(game.state.active, null);
  assert.equal(game.state.eggUsage, BALANCE.eggHatch);
  assert.equal(eggTokensToHatch(game.state.eggUsage), 0);
});

test('new egg ignores already-claimed provider usage and counts only the next delta', () => {
  const game = new Game({
    state: {
      installBaselineSet: true,
      lastDate: '2026-08-30',
      claimedTodayTokensByProvider: { hermes: 1_000 },
      usedSinceInstall: 2_000_000_000,
      spentTokens: 0,
      active: { baseId: 1, pathIds: [1], plannedPathIds: [1], stageIndex: 0, usedAtStage: 0, rarity: 'common', totalForms: 1 },
    },
  });
  assert.equal(game.buyEgg(null), true);
  assert.equal(game.applyProviderTotals({ hermes: 1_000 }, '2026-08-30'), 0);
  assert.equal(game.state.eggUsage, 0);
  assert.equal(game.applyProviderTotals({ hermes: 1_001 }, '2026-08-30'), 1);
  assert.equal(game.state.eggUsage, 1);
  assert.equal(eggTokensToHatch(game.state.eggUsage), BALANCE.eggHatch - 1);
});

test('long-lived session rows progress the current egg only on deltas after baseline', () => {
  const game = Game.fresh();
  const rows = [{ key: 'session:long-lived', provider: 'openai-codex', tokens: 900_000_000 }];
  assert.equal(game.applyUsageRows(rows), 0);
  assert.equal(game.state.eggUsage, 0);
  rows[0].tokens += 123_456;
  assert.equal(game.applyUsageRows(rows), 123_456);
  assert.equal(game.state.eggUsage, 123_456);
  assert.equal(eggTokensToHatch(game.state.eggUsage), BALANCE.eggHatch - 123_456);
});

test('usage row deltas expose provider totals for live counters', () => {
  const game = Game.fresh();
  const rows = [{
    key: 'session:long-lived',
    provider: 'openai-codex',
    tokens: 100,
    input: 40,
    output: 20,
    cacheRead: 40,
  }];
  game.applyUsageRows(rows);
  rows[0].tokens = 125;
  rows[0].input = 50;
  rows[0].output = 25;
  rows[0].cacheRead = 50;
  assert.equal(game.applyUsageRows(rows), 25);
  assert.deepEqual(game.lastUsageDelta, {
    tokens: 25,
    cost: 0,
    input: 10,
    output: 5,
    cacheRead: 10,
    cacheWrite: 0,
    reasoning: 0,
    byProvider: [{ name: 'openai-codex', tokens: 25, cost: 0, input: 10, output: 5, cacheRead: 10, cacheWrite: 0, reasoning: 0 }],
  });
});

test('Poké Doll can be bought for 250M and armed for the next hatch', () => {
  const game = Game.fresh({
    state: { usedSinceInstall: 250_000_000, eggTier: 'common' },
  });
  assert.equal(BALANCE.pokeDoll.price, 250_000_000);
  assert.equal(game.buyItem('pokeDoll'), true);
  assert.equal(game.itemCount('pokeDoll'), 1);
  assert.equal(game.activatePokeDoll(), true);
  assert.equal(game.itemCount('pokeDoll'), 0);
  assert.equal(game.state.pokeDollActive, true);
});

test('Poké Doll activation is rejected when there is no incubating egg', () => {
  const game = Game.fresh({
    state: { inventory: { pokeDoll: 1 }, active: null, eggTier: null, eggUsage: 0 },
  });
  assert.equal(game.activatePokeDoll(), false);
  assert.equal(game.itemCount('pokeDoll'), 1);
  assert.equal(game.state.pokeDollActive, false);
});

test('Poké Doll avoids a species already in the Pokédex for a non-shiny hatch', () => {
  const game = new Game({
    state: {
      pokeDollActive: true,
      dex: [{ chainOrder: [4], rarity: 'rare', names: { 4: 'Charmander' } }],
    },
    catalog: [
      { id: 4, captureRate: 45, line: { baseId: 4, pathIds: [4], rarity: 'rare', names: { 4: 'Charmander' } } },
      { id: 7, captureRate: 45, line: { baseId: 7, pathIds: [7], rarity: 'rare', names: { 7: 'Squirtle' } } },
    ],
    rng: () => 0.1,
  });
  assert.equal(game.hatch(), true);
  assert.equal(game.state.active.baseId, 7);
  assert.equal(game.state.active.shiny, false);
  assert.equal(game.state.pokeDollActive, false);
});

test('Poké Doll allows a shiny hatch of a species already in the Pokédex', () => {
  const game = new Game({
    state: {
      pokeDollActive: true,
      dex: [{ chainOrder: [4], rarity: 'rare', names: { 4: 'Charmander' } }],
    },
    catalog: [
      { id: 4, captureRate: 45, line: { baseId: 4, pathIds: [4], rarity: 'rare', names: { 4: 'Charmander' } } },
      { id: 7, captureRate: 45, line: { baseId: 7, pathIds: [7], rarity: 'rare', names: { 7: 'Squirtle' } } },
    ],
    rng: () => 0,
  });
  assert.equal(game.hatch(), true);
  assert.equal(game.state.active.baseId, 4);
  assert.equal(game.state.active.shiny, true);
  assert.equal(game.state.pokeDollActive, false);
});

test('Poké Doll recognizes legacy Pokédex records without chainOrder', () => {
  const game = new Game({
    state: {
      pokeDollActive: true,
      dex: [{ baseId: 4, finalId: 6, rarity: 'common', names: { 4: 'Charmander', 6: 'Charizard' } }],
    },
    catalog: [
      { id: 4, captureRate: 45, line: { baseId: 4, pathIds: [4], rarity: 'common', names: { 4: 'Charmander' } } },
      { id: 7, captureRate: 45, line: { baseId: 7, pathIds: [7], rarity: 'common', names: { 7: 'Squirtle' } } },
    ],
    rng: () => 0.1,
  });
  assert.equal(game.hatch(), true);
  assert.equal(game.state.active.baseId, 7);
});

test('Poké Doll keeps a normal hatch pending when every base species is already owned', () => {
  const game = new Game({
    state: {
      pokeDollActive: true,
      dex: [
        { chainOrder: [4], rarity: 'common', names: { 4: 'Charmander' } },
        { chainOrder: [7], rarity: 'common', names: { 7: 'Squirtle' } },
      ],
    },
    catalog: [
      { id: 4, captureRate: 45, line: { baseId: 4, pathIds: [4], rarity: 'common', names: { 4: 'Charmander' } } },
      { id: 7, captureRate: 45, line: { baseId: 7, pathIds: [7], rarity: 'common', names: { 7: 'Squirtle' } } },
    ],
    rng: () => 0.1,
  });
  assert.equal(game.hatch(), false);
  assert.equal(game.state.active, null);
  assert.equal(game.state.pokeDollActive, true);
});
