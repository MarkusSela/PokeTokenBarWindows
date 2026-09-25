const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { Game, BALANCE } = require('../core/game.cjs');
const { ownedSpeciesIds, duplicateHatchSuffix, unarmedDollHint, DEX_WARNING_RATIO } = require('../core/hatch-feedback.cjs');

const drilburLine = { baseId: 529, pathIds: [529, 530], rarity: 'uncommon', names: { 529: 'Drilbur', 530: 'Excadrill' } };
const bulbaLine = { baseId: 1, pathIds: [1, 2, 3], rarity: 'common', names: { 1: 'Bulbasaur' } };
const catalog = [
  { id: 529, captureRate: 120, line: drilburLine },
  { id: 1, captureRate: 255, line: bulbaLine },
];

test('the real hatch path uses the effective threshold so Hatch Incubator actually applies', () => {
  assert.match(main, /game\.state\.eggUsage >= game\.hatchThreshold\(\)/);
  assert.doesNotMatch(main, /game\.state\.eggUsage >= BALANCE\.eggHatch/);
});

test('the real hatch path keeps the Poké Doll duplicate policy', () => {
  assert.match(main, /avoidOwned:\s*game\.shouldAvoidPokeDollDuplicates\(/);
});

test('a hatch armed with the Poké Doll never returns a line already in the Pokédex', () => {
  const base = {
    dex: [{ id: 'x', baseId: 529, finalId: 530, chainOrder: [529, 530], rarity: 'uncommon', shiny: false }],
    pokeDollActive: true,
    eggUsage: BALANCE.eggHatch,
    inventory: { pokeDoll: 1 },
  };
  let hatched = 0;
  let duplicates = 0;
  for (let k = 0; k < 200; k += 1) {
    let i = 0;
    const seq = [0.001 + k * 0.0049, 0.41, 0.73, 0.19, 0.91];
    const game = new Game({ state: JSON.parse(JSON.stringify(base)), catalog, rng: () => seq[(i += 1) % seq.length] });
    if (!game.hatch()) continue;
    hatched += 1;
    if (game.state.active.baseId === 529) duplicates += 1;
  }
  assert.ok(hatched > 0, 'at least one hatch must happen with an unseen line available');
  assert.equal(duplicates, 0);
});

test('the Hatch Incubator halves the threshold the real hatch path compares against', () => {
  const game = new Game({ state: { eggUsage: 3_000_000, nextHatchModifiers: { hatchIncubator: true, shinyIncense: false } } });
  assert.equal(game.hatchThreshold(), BALANCE.eggHatch / 2);
  assert.ok(game.state.eggUsage >= game.hatchThreshold(), 'the reduced threshold must already be satisfied');
  assert.ok(game.state.eggUsage < BALANCE.eggHatch, 'the legacy constant would wrongly block this hatch');
});

test('ownedSpeciesIds collects every species the trainer already has', () => {
  const ids = ownedSpeciesIds({
    dex: [{ chainOrder: [529, 530] }, { pathIds: [1, 2, 3] }],
    active: { pathIds: [74, 75] },
  });
  assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2, 3, 74, 75, 529, 530]);
});

test('a duplicate hatch without an armed Poké Doll is reported as such', () => {
  const owned = new Set([529, 530]);
  const it = duplicateHatchSuffix({ hatchedBaseId: 529, ownedIds: owned, pokeDollWasActive: false, italian: true });
  const en = duplicateHatchSuffix({ hatchedBaseId: 529, ownedIds: owned, pokeDollWasActive: false, italian: false });
  assert.match(it, /già nel Pokédex/);
  assert.match(it, /Poké Doll non attiva/);
  assert.match(en, /already in your Pokédex/);
  assert.match(en, /Poké Doll was not active/);
});

test('an armed Poké Doll being consumed is reported, and new species stay silent', () => {
  const owned = new Set([529, 530]);
  const consumed = duplicateHatchSuffix({ hatchedBaseId: 1, ownedIds: owned, pokeDollWasActive: true, italian: true });
  assert.match(consumed, /Poké Doll consumato/);
  const plain = duplicateHatchSuffix({ hatchedBaseId: 1, ownedIds: owned, pokeDollWasActive: false, italian: true });
  assert.equal(plain, '');
});

test('a shiny duplicate says the Poké Doll is still active and never claims it was consumed', () => {
  const owned = new Set([529, 530]);
  const shinyDup = duplicateHatchSuffix({
    hatchedBaseId: 529,
    ownedIds: owned,
    pokeDollWasActive: true,
    pokeDollConsumed: false,
    italian: true,
  });
  assert.match(shinyDup, /duplicato shiny ammesso/);
  assert.match(shinyDup, /Poké Doll ancora attiva/);
  assert.doesNotMatch(shinyDup, /consumato/);
  const untouched = duplicateHatchSuffix({
    hatchedBaseId: 1,
    ownedIds: owned,
    pokeDollWasActive: true,
    pokeDollConsumed: false,
    italian: false,
  });
  assert.equal(untouched, '', 'a new species that consumed nothing must stay silent');
});

test('an incubating egg warns when a Poké Doll is owned but not armed', () => {
  const late = { incubating: true, pokeDollOwned: 2, pokeDollActive: false, dexOwned: 500, dexTotal: 1025, italian: true };
  const warn = unarmedDollHint(late);
  assert.match(warn, /Poké Doll non attiva/);
  assert.equal(unarmedDollHint({ ...late, pokeDollActive: true }), null);
  assert.equal(unarmedDollHint({ ...late, incubating: false }), null);
  assert.equal(unarmedDollHint({ ...late, pokeDollOwned: 0 }), null);
});

test('the unarmed Poké Doll warning stays silent until 40% of the Pokédex is complete', () => {
  const base = { incubating: true, pokeDollOwned: 2, pokeDollActive: false, italian: true, dexTotal: 1025 };
  assert.equal(unarmedDollHint({ ...base, dexOwned: 109 }), null, 'early game must not nag');
  assert.equal(unarmedDollHint({ ...base, dexOwned: 409 }), null);
  assert.match(unarmedDollHint({ ...base, dexOwned: 410 }), /Poké Doll non attiva/);
  assert.equal(unarmedDollHint({ ...base, dexOwned: 1025, dexTotal: 0 }), null);
  assert.equal(DEX_WARNING_RATIO, 0.4);
});

test('Home renders the unarmed Poké Doll warning while an egg is incubating', () => {
  assert.match(html, /function unarmedDollHint|unarmedDollHint\(/);
  assert.match(html, /doll-hint/);
});

// --- Semantica scelta dall'utente: il Poké Doll resta armato finche' non evita davvero un duplicato.

const dollCatalog = [
  { id: 529, captureRate: 120, line: drilburLine },
  { id: 1, captureRate: 255, line: bulbaLine },
];
const ownedDrilburDex = [{ chainOrder: [529, 530], rarity: 'uncommon', names: { 529: 'Drilbur' } }];

function armedGame(rngSeq) {
  let i = 0;
  return new Game({
    state: {
      pokeDollActive: true,
      inventory: { pokeDoll: 3 },
      dex: JSON.parse(JSON.stringify(ownedDrilburDex)),
      eggUsage: BALANCE.eggHatch,
    },
    catalog: dollCatalog,
    rng: () => rngSeq[(i += 1) % rngSeq.length],
  });
}

test('mounting the Poké Doll no longer spends it', () => {
  const game = Game.fresh({ state: { inventory: { pokeDoll: 2 }, eggTier: 'common' } });
  assert.equal(game.activatePokeDoll(), true);
  assert.equal(game.itemCount('pokeDoll'), 2, 'the doll must stay in the Bag until it avoids a duplicate');
  assert.equal(game.state.pokeDollActive, true);
});

test('a protected hatch that excluded an owned line spends exactly one Poké Doll', () => {
  const game = armedGame([0.5, 0.41, 0.73, 0.19, 0.91]);
  assert.equal(game.hatch(), true);
  assert.equal(game.state.active.baseId, 1, 'the owned line must be excluded');
  assert.equal(game.itemCount('pokeDoll'), 2);
  assert.equal(game.state.pokeDollActive, false);
});

test('a shiny duplicate leaves the Poké Doll armed', () => {
  const game = armedGame([0.0005, 0, 0, 0, 0]);
  assert.equal(game.hatch(), true);
  assert.equal(game.state.active.shiny, true);
  assert.equal(game.state.active.baseId, 529, 'a shiny duplicate is allowed');
  assert.equal(game.itemCount('pokeDoll'), 3);
  assert.equal(game.state.pokeDollActive, true);
});

test('a blocked hatch leaves the Poké Doll armed', () => {
  const owned = { chainOrder: [529, 530] };
  const game = new Game({
    state: {
      pokeDollActive: true,
      inventory: { pokeDoll: 3 },
      dex: [owned, { chainOrder: [1, 2, 3] }],
      eggUsage: BALANCE.eggHatch,
    },
    catalog: dollCatalog,
    rng: () => 0.5,
  });
  assert.equal(game.hatch(), false);
  assert.equal(game.itemCount('pokeDoll'), 3);
  assert.equal(game.state.pokeDollActive, true);
});

test('a hatch with nothing to avoid leaves the Poké Doll armed', () => {
  let i = 0;
  const seq = [0.5, 0.41, 0.73, 0.19, 0.91];
  const game = new Game({
    state: { pokeDollActive: true, inventory: { pokeDoll: 3 }, dex: [], eggUsage: BALANCE.eggHatch },
    catalog: [{ id: 1, captureRate: 255, line: bulbaLine }],
    rng: () => seq[(i += 1) % seq.length],
  });
  assert.equal(game.hatch(), true);
  assert.equal(game.itemCount('pokeDoll'), 3);
  assert.equal(game.state.pokeDollActive, true);
});

test('the Bag describes the new Poké Doll behaviour', () => {
  assert.match(html, /Resta attiva finché non evita un duplicato|Stays active until it actually avoids a duplicate/);
});
