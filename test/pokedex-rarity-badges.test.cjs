const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pokedex = html.slice(html.indexOf('function pokedex()'), html.indexOf('function elapsed('));
const shop = html.slice(html.indexOf('function shop()'), html.indexOf('function canActivatePokeDoll('));
const bag = html.slice(html.indexOf('function bag()'), html.indexOf('function nameOf('));

test('Pokedex cells show rarity as text without a visual rarity badge', () => {
  assert.doesNotMatch(pokedex, /rarityBadge\(/);
  assert.doesNotMatch(pokedex, /' · line '\+x\.lineRarity/);
  assert.match(pokedex, /<small>\$\{x\.isRaising\?tr\('inProgress'\):x\.rarity\}<\/small>/);
});

test('Poké Doll heart badge is beside the name in Shop and Bag', () => {
  assert.match(shop, /shopCard\(tr\('pokeDoll'\)[\s\S]*?'act','pokeDoll'\)/);
  assert.match(bag, /itemBadge\(k\)/);
});
