const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('the Shop lays its items out in a grid of large cells', () => {
  assert.match(html, /\.shop-grid\{display:grid;grid-template-columns:repeat\(3,1fr\);gap:4px/);
  assert.match(html, /\.shop-cell\{display:grid;grid-template-rows:46px 22px 24px 15px 27px/);
  assert.match(html, /<div class="shop-grid">/);
});

test('the shop cell is large enough for the icon and the full description', () => {
  assert.match(html, /\.shop-cell \.item-icon\{width:44px;height:44px/, 'icon stays close to the Bag size');
  assert.match(html, /\.shop-cell \.shop-desc\{[^}]*font-size:9px/, 'the description must be visible in the cell');
  assert.match(html, /<p class="shop-desc" title="\$\{desc\}">\$\{desc\}<\/p>/);
});

test('the shop cell keeps the full description and the exact price reachable', () => {
  assert.match(html, /function shopCard\(name,kind,desc,price,action,enabled=true,actionMode='act',badgeKind=null\)/);
  assert.match(html, /class="shop-desc" title="\$\{desc\}"/);
  assert.match(html, /<section class="card shop shop-cell" title="\$\{n\(price\)\} \$\{tr\('tokenUnit'\)\}">/);
});

test('Hatch Incubator gets a silver badge with the cassette double fast-forward arrow', () => {
  assert.match(html, /\.rarity-badge\.badge-incubator\{background:#8e9aa4;gap:1px\}/);
  assert.match(
    html,
    /\.rarity-badge\.badge-incubator:before,\.rarity-badge\.badge-incubator:after\{content:'';display:block;width:6px;height:9px;background:rgba\(255,255,255,\.92\);clip-path:polygon\(0 0,100% 50%,0 100%\)\}/
  );
  assert.match(html, /function incubatorBadge\(\)/);
});

test('Shiny Incense gets an ochre badge with three stars', () => {
  assert.match(html, /\.rarity-badge\.badge-incense\{background:#b8860b/);
  assert.match(html, /function incenseBadge\(\)/);
  assert.match(html, /★★★/);
  assert.match(html, /\.rarity-badge\.badge-incense:before\{display:none\}/);
});

test('the badges sit next to the item name in Shop, Bag and Home', () => {
  assert.match(html, /function itemBadge\(kind\)/);
  assert.match(html, /function armedModifierBadges\(\)/);
  assert.ok(html.includes(",'act','hatchIncubator')"), 'the Shop incubator card must carry its badge');
  assert.ok(html.includes(",'act','shinyIncense')"), 'the Shop incense card must carry its badge');
  assert.ok(html.includes(",'act','pokeDoll')"), 'the Shop doll card must carry the heart');
  assert.match(html, /itemBadge\(k\)/);
  assert.match(html, /\+\(!a\?armedModifierBadges\(\):''\)/);
});

test('the egg cells use the same rarity badge as the Pokédex instead of inline pills', () => {
  assert.match(html, /'egg-common':\(\)=>rarityBadge\('common'\)|'egg-common':\s*\(\)\s*=>\s*rarityBadge\('common'\)/);
  assert.match(html, /'egg-uncommon':\(\)=>rarityBadge\('uncommon'\)/);
  assert.match(html, /'egg-rare':\(\)=>rarityBadge\('rare'\)/);
  assert.doesNotMatch(html, /tr\('uncommonEgg'\)\+' <span class="pill rarity uncommon">UNCOMMON<\/span>'/);
});

test('every shop item still renders a card inside the grid', () => {
  const grid = html.slice(html.indexOf('<div class="shop-grid">'), html.indexOf('</div>', html.indexOf('<div class="shop-grid">')));
  for (const kind of ['mint', 'rareCandy', 'expCandyXL', 'hatchIncubator', 'shinyIncense', 'egg-common', 'egg-uncommon', 'shinyCharm', 'pokeDoll', 'egg-rare']) {
    assert.ok(grid.includes(`'${kind}'`), `the grid must still contain the ${kind} card`);
  }
});
