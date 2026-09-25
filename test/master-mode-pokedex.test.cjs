const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildCatchLogEntries, buildPokedexEntries } = require('../core/catch-log.cjs');

test('master Pokédex mode exposes catalog species without changing normal mode', () => {
  const catalog = {
    species: {
      '1': { id: 1, names: { en: 'Bulbasaur', it: 'Bulbasaur' } },
      '974': { id: 974, names: { en: 'Cetoddle', it: 'Cetoddle' } },
    },
  };
  assert.deepEqual(buildPokedexEntries({ active: null, dex: [], catalog, masterMode: false }), []);
  const master = buildPokedexEntries({ active: null, dex: [], catalog, masterMode: true });
  assert.deepEqual(master.map((entry) => [entry.id, entry.name]), [[1, 'Bulbasaur'], [974, 'Cetoddle']]);
});

test('Pokédex and catch log always use the English Pokémon name', () => {
  const catalog = {
    species: {
      '1009': { id: 1009, names: { en: 'Walking Wake', it: 'Acquecrespe' } },
    },
  };
  const master = buildPokedexEntries({ catalog, masterMode: true });
  assert.equal(master[0].name, 'Walking Wake');

  const active = {
    baseId: 1009,
    pathIds: [1009],
    names: { 1009: 'Acquecrespe' },
    rarity: 'rare',
  };
  const log = buildCatchLogEntries({ active });
  assert.equal(log[0].names[1009], 'Acquecrespe');
  const normal = buildPokedexEntries({ active, catalog, masterMode: false });
  assert.equal(normal[0].name, 'Walking Wake');
});

test('the full shipped Pokédex uses names.en for every catalog species', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'pokemon-catalog.json'), 'utf8'));
  const entries = buildPokedexEntries({ catalog, masterMode: true });
  assert.equal(entries.length, Object.keys(catalog.species).length);
  for (const entry of entries) {
    assert.equal(entry.name, catalog.species[String(entry.id)].names.en, `species ${entry.id}`);
  }
});

test('master Pokédex derives rarity from catalog species metadata', () => {
  const catalog = {
    species: {
      '10': { id: 10, names: { en: 'Caterpie', it: 'Caterpie' }, captureRate: 255, legendary: false, mythical: false },
      '150': { id: 150, names: { en: 'Mewtwo', it: 'Mewtwo' }, captureRate: 3, legendary: true, mythical: false },
      '151': { id: 151, names: { en: 'Mew', it: 'Mew' }, captureRate: 45, legendary: false, mythical: true },
    },
  };
  const entries = buildPokedexEntries({ catalog, masterMode: true });
  assert.deepEqual(entries.map((entry) => [entry.id, entry.rarity]), [
    [10, 'common'],
    [150, 'legendary'],
    [151, 'legendary'],
  ]);
});

test('Pokédex rarity follows the egg line rarity for every evolution stage', () => {
  const catalog = {
    lines: [{
      id: 1,
      captureRate: 45,
      rarity: 'rare',
      line: {
        baseId: 1,
        pathOptions: [[1, 2, 3]],
        pathIds: [1, 2, 3],
        rarity: 'rare',
        names: { 1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur' },
        captureRate: 45,
      },
    }],
    species: {
      '1': { id: 1, names: { en: 'Bulbasaur', it: 'Bulbasaur' }, captureRate: 45, legendary: false, mythical: false },
      '2': { id: 2, names: { en: 'Ivysaur', it: 'Ivysaur' }, captureRate: 45, legendary: false, mythical: false },
      '3': { id: 3, names: { en: 'Venusaur', it: 'Venusaur' }, captureRate: 45, legendary: false, mythical: false },
    },
  };
  const entries = buildPokedexEntries({ catalog, masterMode: true });
  assert.deepEqual(entries.map((entry) => [entry.id, entry.rarity, entry.lineRarity, entry.stageRarity]), [
    [1, 'rare', 'rare', 'common'],
    [2, 'rare', 'rare', 'uncommon'],
    [3, 'rare', 'rare', 'rare'],
  ]);
  assert.equal(catalog.lines[0].line.rarity, 'rare');
});
