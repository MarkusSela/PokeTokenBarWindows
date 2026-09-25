const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { providerAggregates, mergeUsageRows, readHermesUsage } = require('../core/hermes-usage.cjs');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');

test('provider aggregates can be computed for the current day', () => {
  const rows = [
    { started_at: 200, billing_provider: 'openai-codex', input_tokens: 10, output_tokens: 5 },
    { started_at: 100, billing_provider: 'openai-api', input_tokens: 20, output_tokens: 7 },
  ];
  const today = providerAggregates(rows, 150);
  assert.deepEqual(today.map(x => [x.name, x.tokens]), [['openai-codex', 15]]);
});

test('provider aggregates preserve reasoning tokens in the provider breakdown', () => {
  const [provider] = providerAggregates([
    {
      session_id: 's1',
      started_at: 200,
      billing_provider: 'openai-codex',
      input_tokens: 10,
      output_tokens: 5,
      cache_read_tokens: 2,
      cache_write_tokens: 1,
      reasoning_tokens: 7,
    },
  ], 0);
  assert.equal(provider.tokens, 25);
  assert.equal(provider.reasoning, 7);
});

test('local Hermes reader sees committed rows kept in the SQLite WAL', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-hermes-wal-'));
  const file = path.join(directory, 'state.db');
  const schema = `
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      model TEXT,
      billing_provider TEXT,
      started_at REAL NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      reasoning_tokens INTEGER DEFAULT 0,
      estimated_cost_usd REAL,
      actual_cost_usd REAL
    );
    CREATE TABLE session_model_usage (
      session_id TEXT NOT NULL,
      model TEXT NOT NULL,
      billing_provider TEXT NOT NULL DEFAULT '',
      task TEXT NOT NULL DEFAULT '',
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      actual_cost_usd REAL NOT NULL DEFAULT 0,
      first_seen REAL,
      last_seen REAL
    );
  `;
  const schemaDb = new DatabaseSync(file);
  schemaDb.exec(schema);
  schemaDb.close();

  const writer = new DatabaseSync(file);
  writer.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;');
  writer.prepare(`INSERT INTO sessions
    (id, model, billing_provider, started_at, input_tokens, output_tokens,
     cache_read_tokens, cache_write_tokens, reasoning_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('wal-session', 'gpt-5', 'openai-codex', 1_800_000_000, 10, 5, 2, 1, 7);
  assert.equal(fs.existsSync(`${file}-wal`), true);

  try {
    const usage = await readHermesUsage(new Date(2027, 0, 15, 12, 0, 0), file);
    assert.equal(usage.source, file);
    assert.equal(usage.totalRows, 1);
    assert.equal(usage.month.tokens, 25);
  } finally {
    writer.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('local Hermes usage adds auxiliary rows without duplicating the main session', () => {
  const rows = mergeUsageRows(
    [{ session_id: 's1', started_at: 100, billing_provider: 'openai-codex', input_tokens: 10, output_tokens: 5 }],
    [{ session_id: 's1', started_at: 100, task: 'background_review', billing_provider: 'openai-codex', input_tokens: 20, output_tokens: 5 }],
  );
  assert.deepEqual(providerAggregates(rows, 0).map(x => [x.name, x.tokens]), [['openai-codex', 40]]);
});

test('reader excludes empty-task detail because it overlaps sessions and keeps non-empty auxiliary usage', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-hermes-task-filter-'));
  const file = path.join(directory, 'state.db');
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, model TEXT, billing_provider TEXT, started_at REAL,
      input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
      cache_write_tokens INTEGER, reasoning_tokens INTEGER,
      estimated_cost_usd REAL, actual_cost_usd REAL
    );
    CREATE TABLE session_model_usage (
      session_id TEXT, model TEXT, billing_provider TEXT, task TEXT,
      input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
      cache_write_tokens INTEGER, reasoning_tokens INTEGER,
      estimated_cost_usd REAL, actual_cost_usd REAL
    );
  `);
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('s1', 'gpt-5', 'openai-codex', 1_800_000_000, 10, 5, 2, 1, 7, 0, 0);
  db.prepare('INSERT INTO session_model_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('s1', 'gpt-5', 'openai-codex', '', 100, 100, 0, 0, 0, 0, 0);
  db.prepare('INSERT INTO session_model_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('s1', 'gpt-5', 'openai-codex', 'background_review', 20, 5, 0, 0, 0, 0, 0);
  db.close();
  try {
    const usage = await readHermesUsage(new Date(2027, 0, 15, 12, 0, 0), file);
    assert.equal(usage.month.tokens, 50);
    assert.equal(usage.providers[0].tokens, 50);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('reader exposes all cumulative source rows for live progression even when a session started earlier', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-hermes-live-progression-'));
  const file = path.join(directory, 'state.db');
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, model TEXT, billing_provider TEXT, started_at REAL,
      input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
      cache_write_tokens INTEGER, reasoning_tokens INTEGER,
      estimated_cost_usd REAL, actual_cost_usd REAL
    );
    CREATE TABLE session_model_usage (
      session_id TEXT, model TEXT, billing_provider TEXT, task TEXT,
      input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
      cache_write_tokens INTEGER, reasoning_tokens INTEGER,
      estimated_cost_usd REAL, actual_cost_usd REAL
    );
  `);
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('old-session', 'gpt-5', 'openai-codex', 1_700_000_000, 100, 20, 0, 0, 0, 0, 0);
  db.prepare('INSERT INTO session_model_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('old-session', 'gpt-5', 'openai-codex', 'background_review', 30, 5, 0, 0, 0, 0, 0);
  db.close();
  try {
    const usage = await readHermesUsage(new Date(2027, 0, 15, 12, 0, 0), file);
    assert.deepEqual(
      usage.progressionRows.map(row => [row.key, row.tokens]).sort(),
      [
        ['aux:old-session:gpt-5:openai-codex:background_review', 35],
        ['session:old-session', 120],
      ],
    );
    assert.equal(usage.today.tokens, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Home provider breakdown uses today providers and companion credits them separately', () => {
  assert.match(main, /todayProviders/);
  assert.match(main, /applyUsageRows\(rawUsage\.progressionRows/);
  assert.match(main, /liveUsageDisplay\.apply\(rawUsage, liveUsageDelta\)/);
  assert.match(html, /data\.usage\?\.todayProviders/);
  assert.match(main, /eggProgress\(game\.state\.eggUsage,\s*game\.hatchThreshold\(\)\)/);
  assert.match(main, /eggTokensToHatch\(game\.state\.eggUsage,\s*game\.hatchThreshold\(\)\)/);
});

test('main refresh merges Hermes with the built-in provider readers', () => {
  assert.match(main, /readLocalProviderUsage/);
  assert.match(main, /mergeUsage\(hermes, localProviders\)/);
  assert.match(main, /seedUsageRows\(localProviders\.progressionRows\)/);
  assert.match(main, /extra\.progressionRows/);
});

test('opening Home starts an eligible egg pulse immediately and keeps the threshold schedule', () => {
  assert.match(html, /function beginEggWindowSession\(\)/);
  assert.match(html, /playEggOnce\(\)/);
  assert.match(html, /p>=\.90/);
  assert.match(html, /p>=\.60/);
  assert.match(html, /p>=\.30/);
  assert.match(html, /p<\.15/);
  assert.match(html, /p<\.30/);
});

test('range sliders update without rebuilding the settings DOM during pointer movement', () => {
  assert.match(html, /function updateRangeLive\(input,key\)/);
  assert.match(html, /oninput="updateRangeLive\(this,'\$\{key\}'\)"/);
  assert.match(html, /warningPercent/);
  assert.match(html, /criticalPercent/);
  assert.match(html, /oninput="updatePetSizeLive\(this\.value\)"/);
  assert.doesNotMatch(html, /function updatePetSizeLive\(value\)\{[^}]*render\(\)/);
});

test('live settings updates resize the pet without forcing a snapshot rerender', () => {
  assert.match(html, /action\('setting-live'/);
  assert.match(main, /type === ["']setting-live["']/);
  assert.match(main, /petController\?\.setSize/);
});

test('advanced scan, backup and updates are collapsible settings sections', () => {
  assert.match(html, /<details[^>]+data-settings-section="scan"/);
  assert.match(html, /<details[^>]+data-settings-section="backup"/);
  assert.match(html, /<details[^>]+data-settings-section="updates"/);
  assert.match(html, /<summary>/);
  assert.match(html, /reportIssue:'Segnala un problema',open:'Apri'/);
});
