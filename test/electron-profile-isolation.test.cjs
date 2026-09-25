const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const main = fs.readFileSync(path.join(__dirname, '..', 'main.cjs'), 'utf8');

test('explicit Electron QA profile isolates userData and the companion state file', () => {
  assert.match(main, /PTB_TEST_USER_DATA/);
  assert.match(main, /app\.setPath\(['"]userData['"]/);
  assert.match(main, /PTB_STATE_FILE/);
  assert.match(main, /testProfile/);
  assert.match(main, /com\.poketokenbar\.windows\.lab\.qa/);
});

test('Electron QA profile does not mutate OS autostart settings', () => {
  assert.match(main, /if\s*\(!testProfile\)[\s\S]*app\.setLoginItemSettings/);
});
