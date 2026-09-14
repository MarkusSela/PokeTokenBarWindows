const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('main navigation and persistent bottom system bar are present', () => {
  assert.match(html, /data-tab="home">Home/);
  assert.match(html, /data-tab="shop">Shop/);
  assert.match(html, /data-tab="bag">Bag/);
  assert.match(html, /data-tab="collection">Pokédex/);
  assert.match(html, /<header class="top-bar">[\s\S]*id="updated"/);
  assert.match(html, /id="updated"[^>]*title="Refresh token now"[^>]*onclick="manualRefresh\(\)">↻<\/button>/);
  assert.doesNotMatch(html, /<footer class="bottom-bar"><button id="updated"/);
});

test('shop and bag expose local item icons and all original purchasable entries', () => {
  assert.match(html, /rareCandy:'rare-candy'/);
  assert.match(html, /mint:'mint'/);
  assert.match(html, /shinyCharm:'shiny-charm'/);
  assert.match(html, /src="assets\/items\/\$\{names\[kind\]\}\.png"/);
  assert.match(html, /Mint/);
  assert.match(html, /Rare Candy/);
  assert.match(html, /Uncommon Egg/);
  assert.match(html, /Rare Egg/);
});

test('mint exposes nature feedback and a temporary sparkle effect in Home', () => {
  assert.match(html, /mintSparkle/);
  assert.match(html, /mint-sparkle/);
  assert.match(html, /data\.active\.nature/);
  assert.match(html, /act\('mint'\)/);
});

test('Home exposes provider breakdown, token cost and honest limit availability', () => {
  assert.match(html, /Provider usage/);
  assert.match(html, /cache w/);
  assert.match(html, /Today's tokens/);
  assert.match(html, /Today's cost/);
  assert.match(html, /non disponibile/);
});

test('Home matches the original flat Lapras-style visual hierarchy', () => {
  assert.match(html, /home-flat/);
  assert.match(html, /hero-flat/);
  assert.match(html, /\.tab\.active\{background:var\(--rarity-accent\)/);
  assert.match(html, /body\[data-rarity=legendary\]/);
  assert.match(html, /toLocaleString\('en-US'\)/);
  assert.match(html, /compact\(total\)/);
  assert.match(html, /home-section/);
});

test('collection exposes Pokedex and Catch log with species names and stable sprites', () => {
  assert.match(html, /collectionMode==='dex'/);
  assert.match(html, /Pokédex/);
  assert.match(html, /Catch log/);
  assert.match(html, /function nameOf\(x,id\)/);
  assert.match(html, /class="dex-cell"/);
  assert.match(html, /function elapsed\(date\)/);
});

test('Catch log keeps the active companion first and sorts graduated individuals newest first', () => {
  assert.match(html, /function catchLog\(\)/);
  assert.match(html, /function catchLogEntries\(\)/);
  assert.match(html, /data-entry-kind="\$\{x\.kind\}"/);
  assert.match(html, /class="catch-stage"/);
  assert.match(html, /nameOf\(x,i\)/);
  assert.match(html, /kind:'graduated'/);
});

test('collection exposes pinning controls for the tray and floating pet representative', () => {
  assert.match(html, /function pinSpecies\(id\)/);
  assert.match(html, /window\.ptb\.action\('pin'/);
  assert.match(html, /Pin to tray/);
  assert.match(html, /representativeSpeciesId===id\?null:id/);
  assert.match(html, /representativeSpeciesId===x\.id\?tr\('unpin'\):tr\('pinToTray'\)/);
});

test('language setting is applied to the rendered interface', () => {
  assert.match(html, /const I18N=/);
  assert.match(html, /document\.documentElement\.lang/);
  assert.match(html, /lang\(\)==='it'\?/);
  assert.match(html, /tr\('completed'\)/);
});

test('renderer subscribes to live Hermes refreshes', () => {
  assert.match(html, /window\.ptb\.onSnapshot\(next=>\{data=next;render\(\)\}\)/);
});

test('manual refresh always re-enables the refresh control after completion or failure', () => {
  assert.match(html, /async function manualRefresh\(\)\{[\s\S]*try\{[\s\S]*finally\{[\s\S]*button\.disabled=false/);
});
