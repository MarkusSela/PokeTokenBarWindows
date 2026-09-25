const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'pokemon-catalog.json'), 'utf8'));

function expectedRarity(row) {
  const species = catalog.species[String(row.id)];
  if (species.legendary || species.mythical) return 'legendary';
  if (row.captureRate <= 45) return 'rare';
  if (row.captureRate <= 120) return 'uncommon';
  return 'common';
}

test('Gen VI-IX rarity review has no unexplained line overrides', () => {
  const modern = catalog.lines.filter((row) => catalog.species[String(row.id)].generation >= 6);
  const mismatches = modern
    .filter((row) => row.rarity !== expectedRarity(row))
    .map((row) => row.id);
  assert.deepEqual(mismatches, []);
});

test('special Gen VI-IX groups keep metadata-driven rarity', () => {
  const byId = new Map(catalog.lines.map((row) => [row.id, row]));
  assert.equal(byId.get(793).rarity, 'rare'); // Nihilego, Ultra Beast, not legendary
  assert.equal(byId.get(984).rarity, 'rare'); // Great Tusk, Paradox, not legendary
  assert.equal(byId.get(985).rarity, 'uncommon'); // Scream Tail, capture rate 50
  assert.equal(byId.get(1024).rarity, 'legendary'); // Terapagos
  assert.equal(byId.get(1025).rarity, 'legendary'); // Pecharunt
});
