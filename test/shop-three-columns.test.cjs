const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('the Shop lays its items out in three columns', () => {
  assert.match(html, /\.shop-grid\{display:grid;grid-template-columns:repeat\(3,1fr\);gap:4px/);
  assert.match(html, /\.shop-cell\{display:grid;grid-template-rows:46px 22px 24px 15px 27px/);
  assert.match(html, /\.shop-cell \.item-icon\{width:44px;height:44px/);
});

test('the three column cell still fits its badge, description and price', () => {
  assert.match(html, /\.shop-cell \.rarity-badge,\.shop-cell \.heart-badge\{width:18px;height:13px/);
  assert.match(html, /\.shop-cell \.badge-incense\{font-size:7\.5px\}/);
  assert.match(html, /<p class="shop-desc" title="\$\{desc\}">\$\{desc\}<\/p>/);
});

test('the shiny star sits in the top right corner of the Pokédex cell', () => {
  assert.match(html, /\.dex-cell\{position:relative;/, 'the cell must anchor the corner badge');
  assert.match(html, /\.dex-shiny\{position:absolute;top:/);
  assert.match(html, /\.dex-shiny\{position:absolute;top:1px;right:3px/);
  assert.match(html, /class="dex-shiny"/);
  assert.match(html, /\$\{x\.shiny\?`<span class="dex-shiny"/);
});

test('the shiny star is no longer appended to the Pokédex name', () => {
  assert.doesNotMatch(html, /\$\{x\.shiny\?' ✨':''\}/);
});
