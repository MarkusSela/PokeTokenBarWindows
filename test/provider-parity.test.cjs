const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const {
  providerDefinitions,
  readLocalProviderUsage,
} = require('../core/provider-usage.cjs');

function isolatedRoots(overrides = {}) {
  return Object.fromEntries(
    providerDefinitions('C:/nonexistent/ptb-test-home').map(({ id }) => [id, overrides[id] || []]),
  );
}

function makeDatabase(file, schema, rows) {
  const database = new DatabaseSync(file);
  database.exec(schema);
  for (const { sql, values } of rows) database.prepare(sql).run(...values);
  database.close();
}

function varint(value) {
  let number = BigInt(value);
  const bytes = [];
  do {
    let byte = Number(number & 0x7fn);
    number >>= 7n;
    if (number) byte |= 0x80;
    bytes.push(byte);
  } while (number);
  return Buffer.from(bytes);
}

function protoBytes(field, payload) {
  return Buffer.concat([varint((field << 3) | 2), varint(payload.length), payload]);
}

function protoString(field, value) {
  return protoBytes(field, Buffer.from(value, 'utf8'));
}

function protoVarint(field, value) {
  return Buffer.concat([varint(field << 3), varint(value)]);
}

function timestamp(seconds) {
  return protoVarint(1, seconds);
}

test('local provider reader supports Grok and Pi log formats independently', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-provider-logs-'));
  const now = new Date(2026, 7, 30, 12, 0, 0);
  const timestampMs = now.getTime();
  const grok = path.join(root, 'grok');
  const pi = path.join(root, 'pi');
  fs.mkdirSync(path.join(grok, 'session-1'), { recursive: true });
  fs.mkdirSync(pi, { recursive: true });
  fs.writeFileSync(
    path.join(grok, 'session-1', 'updates.jsonl'),
    `${JSON.stringify({
      timestamp: timestampMs / 1000,
      params: {
        update: {
          sessionUpdate: 'turn_completed',
          prompt_id: 'grok-turn-1',
          usage: {
            inputTokens: 100,
            cachedReadTokens: 20,
            outputTokens: 10,
            totalTokens: 130,
            modelUsage: { 'grok-4': { totalTokens: 130 } },
            costUsdTicks: 10_000_000_000,
          },
        },
        _meta: { agentTimestampMs: timestampMs },
      },
    })}\n`,
  );
  fs.writeFileSync(
    path.join(pi, 'session.jsonl'),
    `${JSON.stringify({
      type: 'message',
      id: 'pi-message-1',
      timestamp: timestampMs,
      message: {
        timestamp: timestampMs,
        stopReason: 'stop',
        usage: { input: 30, output: 5, cacheRead: 2, cacheWrite: 1 },
      },
    })}\n`,
  );

  try {
    const usage = await readLocalProviderUsage(now, {
      roots: isolatedRoots({ grok: [grok], pi: [pi] }),
    });
    assert.deepEqual(
      usage.todayProviders.map(({ name, tokens }) => [name, tokens]),
      [['Grok', 130], ['Pi', 38]],
    );
    assert.equal(usage.today.cost, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('local provider reader supports OpenCode, Cursor, Copilot, and Kiro SQLite stores', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-provider-sqlite-'));
  const now = new Date(2026, 7, 30, 12, 0, 0);
  const timestamp = now.toISOString();
  const timestampMs = now.getTime();
  const openCode = path.join(root, 'opencode');
  const cursor = path.join(root, 'cursor');
  const copilot = path.join(root, 'copilot');
  const kiro = path.join(root, 'kiro');
  for (const directory of [openCode, cursor, copilot, kiro]) fs.mkdirSync(directory, { recursive: true });

  makeDatabase(
    path.join(openCode, 'opencode.db'),
    'CREATE TABLE message (id TEXT, session_id TEXT, data TEXT, time_created INTEGER)',
    [{
      sql: 'INSERT INTO message VALUES (?, ?, ?, ?)',
      values: ['oc-1', 'session-1', JSON.stringify({
        id: 'oc-1',
        modelID: 'gpt-5',
        providerID: 'openai',
        time: { created: timestamp },
        tokens: { input: 10, output: 5, cache: { read: 2, write: 1 }, total: 18 },
        cost: 0,
      }), timestampMs],
    }],
  );
  makeDatabase(
    path.join(cursor, 'state.vscdb'),
    'CREATE TABLE cursorDiskKV (key TEXT, value TEXT)',
    [{
      sql: 'INSERT INTO cursorDiskKV VALUES (?, ?)',
      values: ['bubbleId:1', JSON.stringify({
        tokenCount: { inputTokens: 7, outputTokens: 3 },
        createdAt: timestamp,
        modelType: 'gpt-4o',
      })],
    }],
  );
  makeDatabase(
    path.join(copilot, 'session-store.db'),
    'CREATE TABLE assistant_usage_events (id INTEGER, model TEXT, input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER, cache_write_tokens INTEGER, created_at TEXT)',
    [{
      sql: 'INSERT INTO assistant_usage_events VALUES (?, ?, ?, ?, ?, ?, ?)',
      values: [1, 'claude-3.7', 20, 4, 3, 2, timestamp],
    }],
  );
  makeDatabase(
    path.join(kiro, 'data.sqlite3'),
    'CREATE TABLE conversations_v2 (conversation_id TEXT, value TEXT)',
    [{
      sql: 'INSERT INTO conversations_v2 VALUES (?, ?)',
      values: ['kiro-conversation', JSON.stringify({
        history: [{
          user: { content: 'abcdefgh' },
          assistant: { content: 'response' },
          request_metadata: {
            request_start_timestamp_ms: timestampMs,
            model_id: 'kiro-model',
            response_size: 40,
          },
        }],
      })],
    }],
  );

  try {
    const usage = await readLocalProviderUsage(now, {
      roots: isolatedRoots({
        opencode: [openCode],
        cursor: [cursor],
        copilot: [copilot],
        kiro: [kiro],
      }),
    });
    assert.deepEqual(
      usage.todayProviders.map(({ name, tokens }) => [name, tokens]),
      [['Copilot', 24], ['OpenCode', 18], ['Kiro', 12], ['Cursor', 10]],
    );
    assert.equal(usage.progressionRows.length, 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('local provider reader parses Antigravity conversation protobuf usage read-only', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-provider-antigravity-'));
  const now = new Date(2026, 7, 30, 12, 0, 0);
  const seconds = Math.floor(now.getTime() / 1000);
  const usage = Buffer.concat([
    protoVarint(2, 10),
    protoVarint(3, 5),
    protoVarint(4, 1),
    protoVarint(5, 2),
    protoString(11, 'antigravity-response-1'),
  ]);
  const chatStart = protoBytes(4, timestamp(seconds));
  const chatModel = Buffer.concat([
    protoBytes(4, usage),
    protoBytes(9, chatStart),
    protoString(19, 'gemini-3.6-flash'),
  ]);
  const generation = Buffer.concat([
    protoBytes(1, chatModel),
    protoString(4, 'execution-1'),
  ]);
  const databaseFile = path.join(root, 'conversation-1.db');
  makeDatabase(
    databaseFile,
    'CREATE TABLE gen_metadata (idx INTEGER, data BLOB)',
    [{ sql: 'INSERT INTO gen_metadata VALUES (?, ?)', values: [1, generation] }],
  );

  try {
    const usage = await readLocalProviderUsage(now, {
      roots: isolatedRoots({ antigravity: [root] }),
    });
    assert.deepEqual(usage.todayProviders.map(({ name, tokens }) => [name, tokens]), [['Antigravity', 18]]);
    assert.equal(usage.progressionRows[0].model, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('provider defaults cover the same local tool family as the macOS reference', () => {
  assert.deepEqual(
    providerDefinitions('C:/Users/Test').map(({ id }) => id),
    ['claude_code', 'gemini', 'antigravity', 'codex', 'opencode', 'cursor', 'grok', 'copilot', 'kiro', 'pi'],
  );
});

test('provider definitions honor the injected environment instead of the process environment', () => {
  const home = 'C:/fixture/home';
  const env = {
    HOME: home,
    USERPROFILE: home,
    APPDATA: 'C:/fixture/appdata',
    LOCALAPPDATA: 'C:/fixture/local-appdata',
    OPENCODE_DATA_DIR: 'C:/fixture/custom-opencode',
    CURSOR_DATA_DIR: 'C:/fixture/custom-cursor',
  };
  const definitions = providerDefinitions(home, env);
  const openCode = definitions.find(({ id }) => id === 'opencode');
  const cursor = definitions.find(({ id }) => id === 'cursor');

  assert.deepEqual(openCode.roots, [
    'C:/fixture/custom-opencode',
    path.join('C:/fixture/local-appdata', 'opencode'),
    path.join('C:/fixture/appdata', 'opencode'),
    path.join('C:/fixture/home', '.local', 'share', 'opencode'),
  ]);
  assert.deepEqual(cursor.roots, [
    'C:/fixture/custom-cursor',
    path.join('C:/fixture/appdata', 'Cursor', 'User', 'globalStorage'),
    path.join('C:/fixture/appdata', 'Cursor Nightly', 'User', 'globalStorage'),
  ]);
});

test('local provider reader uses injected provider roots', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptb-provider-env-'));
  const now = new Date(2026, 7, 30, 12, 0, 0);
  const grokHome = path.join(root, 'grok-home');
  const session = path.join(grokHome, 'sessions', 'session-1');
  fs.mkdirSync(session, { recursive: true });
  fs.writeFileSync(
    path.join(session, 'updates.jsonl'),
    `${JSON.stringify({
      timestamp: now.getTime() / 1000,
      params: {
        update: {
          sessionUpdate: 'turn_completed',
          prompt_id: 'injected-grok-turn',
          usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
        },
        _meta: { agentTimestampMs: now.getTime() },
      },
    })}\n`,
  );

  try {
    const home = path.join(root, 'home');
    const usage = await readLocalProviderUsage(now, {
      home,
      env: {
        HOME: home,
        USERPROFILE: home,
        APPDATA: path.join(root, 'appdata'),
        LOCALAPPDATA: path.join(root, 'local-appdata'),
        GROK_HOME: grokHome,
      },
    });
    assert.deepEqual(usage.todayProviders.map(({ name, tokens }) => [name, tokens]), [['Grok', 5]]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
