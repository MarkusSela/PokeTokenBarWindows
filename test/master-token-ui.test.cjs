const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('Master settings exposes session-only Shop token controls', () => {
  assert.match(source, /const masterControls=s\.masterModeUnlocked\?[\s\S]*?Token di prova Negozio[\s\S]*?addTestShopTokens\(1000000000\)/);
});
