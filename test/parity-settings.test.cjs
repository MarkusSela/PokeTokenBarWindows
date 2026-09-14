const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.cjs'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'core', 'settings.cjs'), 'utf8');
const releaseCheck = fs.readFileSync(path.join(root, 'core', 'release-check.cjs'), 'utf8');

test('Settings exposes representative selection, update checking and support links', () => {
  assert.match(html, /representative/);
  assert.match(html, /checkForUpdates\(\)/);
  assert.match(html, /openExternal\(/);
  assert.match(html, /https:\/\/github\.com\/MarkusSela\/PokeTokenBarWindows-Lab/);
  assert.match(main, /type === ["']check-update["']/);
  assert.match(main, /shell\.openExternal/);
});

test('update checking is a real read-only public release query', () => {
  assert.match(releaseCheck, /api\.github\.com\/repos\/MarkusSela\/PokeTokenBarWindows-Lab\/releases\/latest/);
  assert.match(releaseCheck, /latestVersion|tag_name/);
  assert.match(preload, /openExternal/);
  assert.match(releaseCheck, /assets\.find/);
  assert.match(releaseCheck, /exe|msi/);
  assert.match(releaseCheck, /compareVersions/);
});

test('update notification preference is normalized as a boolean setting', () => {
  assert.match(settings, /updateNotifications/);
  assert.match(html, /updateNotifications/);
});

test('advanced scan exposes timestamp attribution counts', () => {
  assert.match(main, /additionalScanUnattributedRows/);
  assert.match(html, /without timestamp|senza timestamp/);
});
