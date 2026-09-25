const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Game, phaseThreshold } = require('../core/game.cjs');
const { PokeApi } = require('../core/pokeapi.cjs');

test('the shipped Gen 1-9 catalog contains all species and excludes Ditto only from root lines', () => {
  const file = path.join(__dirname, '..', 'assets', 'pokemon-catalog.json');
  assert.equal(fs.existsSync(file), true);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(Object.keys(catalog.species).length, 1025);
  assert.equal(catalog.lines.length, 540);
  assert.equal(catalog.lines.some((x) => x.id === 132), false);
  assert.ok(catalog.lines.every((x) => x.line?.pathIds?.length));
  assert.ok(catalog.lines.some((x) => x.id === 56 && x.line.pathOptions.some((pathIds) => pathIds.includes(979))));
});

test('PokeApi uses the shipped catalog before network access', async () => {
  const api = new PokeApi(path.join(__dirname, '..', 'assets', '.test-cache'));
  const index = await api.baseIndex();
  assert.equal(index.length, 540);
  assert.ok(index.some((x) => x.id === 56 && x.line?.pathOptions?.some((pathIds) => pathIds.includes(979))));
  assert.equal(index.some((x) => x.id === 132), false);
});

test('a common multi-stage hatch can become a Ditto disguise and reveal at first evolution', () => {
  const game = new Game({
    state: { eggUsage: 5_000_000 },
    rng: () => 0,
    catalog: [{ id: 1, captureRate: 255, line: { baseId: 1, pathIds: [1, 2, 3], rarity: 'common', names: { 1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur' } } }]
  });
  assert.equal(game.hatch(), true);
  assert.equal(game.state.active.dittoDisguise, 1);
  game.applyUsageToActive(phaseThreshold('common', 3, 0));
  assert.equal(game.state.active.baseId, 132);
  assert.deepEqual(game.state.active.pathIds, [132]);
  assert.equal(game.state.active.dittoRevealed, true);
});

test('representative species can be pinned and follows shiny ownership', () => {
  const game = new Game({ state: { dex: [{ id: 'x', baseId: 25, finalId: 25, chainOrder: [25], rarity: 'common', shiny: true, names: { 25: 'Pikachu' } }] } });
  assert.equal(game.setRepresentativeSpecies(25), true);
  assert.equal(game.state.representativeSpeciesId, 25);
  assert.equal(game.representativeSubject().isShiny, true);
  assert.equal(game.setRepresentativeSpecies(999), false);
  assert.equal(game.setRepresentativeSpecies(null), true);
  assert.equal(game.state.representativeSpeciesId, null);
});

test('candy grants are idempotent and only apply on a newly completed window', () => {
  const game = new Game({ state: { candyFeatureSeeded: true, candyGrantTier: {} } });
  assert.deepEqual(game.evaluateCandyGrants([{ key: 'claude.5h', kind: 'session', utilization: 100 }]), [{ key: 'claude.5h', kind: 'session', utilization: 100, count: 1 }]);
  assert.equal(game.itemCount('rareCandy'), 1);
  assert.deepEqual(game.evaluateCandyGrants([{ key: 'claude.5h', kind: 'session', utilization: 100 }]), []);
  assert.deepEqual(game.evaluateCandyGrants([{ key: 'claude.5h', kind: 'session', utilization: 20 }]), []);
  assert.deepEqual(game.evaluateCandyGrants([{ key: 'claude.5h', kind: 'session', utilization: 100 }]), [{ key: 'claude.5h', kind: 'session', utilization: 100, count: 1 }]);
  assert.equal(game.itemCount('rareCandy'), 2);
});
