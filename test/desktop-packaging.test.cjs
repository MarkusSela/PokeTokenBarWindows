const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('static app icon is shipped with the desktop app', () => {
  const appIcon = path.join(__dirname, '..', 'assets', 'app-icon.png');
  const rareCandy = path.join(__dirname, '..', 'assets', 'items', 'rare-candy.png');
  const mint = path.join(__dirname, '..', 'assets', 'items', 'mint.png');
  const shinyCharm = path.join(__dirname, '..', 'assets', 'items', 'shiny-charm.png');
  const pokeDoll = path.join(__dirname, '..', 'assets', 'items', 'poke-doll.png');
  assert.equal(fs.existsSync(appIcon), true);
  assert.equal(fs.existsSync(rareCandy), true);
  assert.equal(fs.existsSync(mint), true);
  assert.equal(fs.existsSync(shinyCharm), true);
  assert.equal(fs.existsSync(pokeDoll), true);
  assert.ok(fs.statSync(appIcon).size > 100);
  assert.ok(fs.statSync(rareCandy).size > 100);
  assert.ok(fs.statSync(mint).size > 100);
  assert.ok(fs.statSync(shinyCharm).size > 100);
  assert.ok(fs.statSync(pokeDoll).size > 100);
});

test('installer carries the static app icon outside the asar archive', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.deepEqual(packageJson.build.win.target, ['nsis']);
  assert.equal(packageJson.build.extraResources[0].from, 'assets/app-icon.png');
  assert.equal(packageJson.build.extraResources[0].to, 'app-icon.png');
});

test('popover geometry keeps a tray popup within the usable work area', () => {
  const { placePopoverBounds } = require('../core/popover-placement.cjs');
  const result = placePopoverBounds({ x: 1880, y: 1040, width: 24, height: 24 }, { x: 0, y: 0, width: 1920, height: 1040 }, 360, 600);
  assert.deepEqual(result, { x: 1552, y: 432, width: 360, height: 600 });
});
