const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

 test('Poké Doll heart is a rarity-style badge at the allowed labels only', () => {
  assert.doesNotMatch(html, /item-heart|item-icon-wrap/);
  assert.match(html, /function itemIcon\(kind\)/);
  assert.match(html, /function heartBadge\(active\)/);
  assert.match(html, /class=\\?"heart-badge\\?"/);
  assert.match(html, /rarity-badge[\s\S]{0,500}heart-badge|heart-badge[\s\S]{0,500}rarity-badge/);
  assert.match(html, /rarityBadge\(data\.egg\?\.tier\)[\s\S]{0,120}armedModifierBadges/);
  assert.match(html, /function itemBadge\(kind\)\{[\s\S]{0,400}pokeDoll:\(\)=>heartBadge\(true\)/);
  assert.match(html, /shopCard\(tr\(['"]pokeDoll['"]\)[\s\S]{0,500}b\.pokeDoll\.price/);
  assert.match(html, /function bag\(\)[\s\S]{0,5000}itemIcon\(k\)\}[\s\S]{0,900}itemBadge\(k\)/);
});

 test('heart glyph remains beside the Poké Doll name whenever the item is rendered', () => {
  assert.match(html, /<b><span class="name">\$\{name\}<\/span>\$\{badgeKind\?itemBadge\(badgeKind\):''\}<\/b>/);
  assert.match(html, /armedModifierBadges\(\)\{[\s\S]{0,200}pokeDollActive\?heartBadge\(true\)/);
  assert.match(html, /itemBadge\(k\)/);
});
