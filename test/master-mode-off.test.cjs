const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const { Game } = require('../core/game.cjs');
const { MUTATING_ACTIONS, actionAllowed, buildCapabilities } = require('../core/capabilities.cjs');

test('Master Mode has a turn-off action gated like the other mutating actions', () => {
  assert.ok(MUTATING_ACTIONS.includes('master-mode-off'));
  const desktop = buildCapabilities({ platform: 'win32', env: {}, mode: 'desktop-local' });
  assert.equal(actionAllowed(desktop, 'master-mode-off'), true);
  const readOnly = buildCapabilities({ platform: 'linux', env: {}, mode: 'public-readonly' });
  assert.equal(actionAllowed(readOnly, 'master-mode-off'), false);
});

test('turning Master Mode off clears its flags and the session Shop credits', () => {
  const game = new Game({
    state: {
      settings: { masterModeUnlocked: true, masterPokedexAll: true, masterTokenEdit: true },
    },
  });
  assert.equal(game.addTestShopTokens(10_000_000_000), true);
  assert.equal(game.testShopTokens, 10_000_000_000);
  assert.equal(game.disableMasterMode(), true);
  assert.equal(game.state.settings.masterModeUnlocked, false);
  assert.equal(game.state.settings.masterPokedexAll, false);
  assert.equal(game.state.settings.masterTokenEdit, false);
  assert.equal(game.testShopTokens, 0, 'session-only credits must not survive the switch');
});

test('the renderer offers the switch inside the Master Mode group', () => {
  assert.match(html, /function disableMasterMode\(\)/);
  assert.match(html, /window\.ptb\.action\('master-mode-off'\)/);
  assert.match(html, /class="settings-group master-group"/);
  assert.match(html, /<button type="button" class="master-off" onclick="disableMasterMode\(\)">/);
});

test('main handles the action and restarts the unlock counter', () => {
  assert.match(main, /type === "master-mode-off"/);
  assert.match(main, /masterModeCheckClicks = 0/);
});

test('the Pokédex shows four columns per page', () => {
  assert.match(html, /\.dex-grid\{display:grid;grid-template-columns:repeat\(4,1fr\);gap:5px\}/);
  assert.match(html, /\.dex-cell\{position:relative;display:grid;grid-template-rows:56px 20px 16px 31px/, 'cell dimensions stay unchanged');
});

test('hero badges stack two per row on Home', () => {
  assert.match(html, /\.hero-badges\{display:grid;grid-template-columns:repeat\(2,auto\)/);
  assert.match(html, /function heroBadges\(inner\)/);
  assert.match(html, /heroBadges\(rarityBadge\(a\.rarity\)\)/);
  assert.match(html, /heroBadges\(rarityBadge\(data\.egg\?\.tier\)\+\(!a\?armedModifierBadges\(\):''\)\)/);
});
