const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { formatTrayTooltip, normalizeQaRunId } = require('../core/tray-identity.cjs');

const main = fs.readFileSync(path.join(__dirname, '..', 'main.cjs'), 'utf8');

test('QA tray tooltip has a stable sanitized identity while live keeps the public prefix', () => {
  const qa = formatTrayTooltip({
    qa: true,
    runId: 'next tray-20260917T184636Z',
    name: 'Mankey',
    parts: ['12 token oggi'],
  });
  assert.match(qa, /^PokeTokenBar QA · next-tray-20260917T184636Z — Mankey · 12 token oggi$/);
  assert.doesNotMatch(qa, /[\\/]/);
  assert.equal(
    formatTrayTooltip({ qa: true, runId: 'next tray-20260917T184636Z', name: 'Ditto' }).split(' — ')[0],
    qa.split(' — ')[0],
  );
  assert.equal(formatTrayTooltip({ qa: false, runId: 'qa-run', name: 'Mankey' }), 'PokeTokenBar — Mankey');
});

test('QA run IDs are bounded and never expose a profile path', () => {
  const value = normalizeQaRunId('C:\\Users\\Marco\\AppData\\Local\\Temp\\qa run/secret');
  assert.ok(value.length <= 48);
  assert.doesNotMatch(value, /[\\/]/);
  assert.doesNotMatch(value, /AppData|Users|Marco/);
});

test('QA tray identity is also backed by a marker asset gated to testProfile', () => {
  const qaIcon = path.join(__dirname, '..', 'assets', 'app-icon-qa.png');
  assert.equal(fs.existsSync(qaIcon), true);
  assert.ok(fs.statSync(qaIcon).size > 100);
  assert.match(main, /app-icon-qa\.png/);
  assert.match(main, /testProfile/);
});

test('main gates tray identity behind the existing QA profile and keeps original handlers', () => {
  assert.match(main, /formatTrayTooltip/);
  assert.match(main, /testProfile/);
  assert.match(main, /tray\.on\("click"/);
  assert.match(main, /label: menuLabel\("Quit", "Esci"\)/);
  assert.match(main, /quitting = true;\s*app\.quit\(\)/);
});
