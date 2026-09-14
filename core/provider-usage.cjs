const fs = require('node:fs');
const path = require('node:path');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {}

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_FILES = 4000;
const MAX_DEPTH = 8;
const MAX_TOKEN_VALUE = 1_000_000_000_000_000;
const TOKEN_METRICS = ['tokens', 'input', 'output', 'cacheRead', 'cacheWrite', 'reasoning', 'cost'];
const SKIP_DIRECTORIES = new Set(['node_modules', '.git', 'cache', 'Cache', 'Code Cache']);
const fileCache = new Map();
const databaseCache = new Map();

function userHome(env = process.env) {
  return env.USERPROFILE || env.HOME || path.join(env.HOMEDRIVE || 'C:', env.HOMEPATH || '\\Users');
}

function appData(env = process.env) {
  return env.APPDATA || path.join(userHome(env), 'AppData', 'Roaming');
}

function localAppData(env = process.env) {
  return env.LOCALAPPDATA || path.join(userHome(env), 'AppData', 'Local');
}

function splitEnvironment(name, env = process.env) {
  const raw = String(env[name] || '').trim();
  return raw
    ? raw.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
}

function uniquePaths(values) {
  const seen = new Set();
  return values.filter((value) => {
    const item = String(value || '').trim();
    if (!item) return false;
    const key = path.normalize(item).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function providerDefinitions(home, env = process.env) {
  const resolvedHome = home || userHome(env);
  const claudeConfigRoots = splitEnvironment('CLAUDE_CONFIG_DIR', env)
    .map((root) => path.join(root, 'projects'));
  const grokHome = splitEnvironment('GROK_HOME', env)
    .map((root) => path.join(root, 'sessions'));
  const piAgentRoots = splitEnvironment('PI_CODING_AGENT_DIR', env)
    .map((root) => path.join(root, 'sessions'));
  const piSessionRoots = splitEnvironment('PI_CODING_AGENT_SESSION_DIR', env);
  const openCodeRoots = splitEnvironment('OPENCODE_DATA_DIR', env);
  const cursorRoots = splitEnvironment('CURSOR_DATA_DIR', env);
  const copilotRoots = splitEnvironment('COPILOT_HOME', env);
  const kiroRoots = splitEnvironment('KIRO_CLI_HOME', env);

  return [
    {
      id: 'claude_code',
      name: 'Claude Code',
      roots: uniquePaths([
        ...claudeConfigRoots,
        path.join(resolvedHome, '.config', 'claude', 'projects'),
        path.join(resolvedHome, '.claude', 'projects'),
      ]),
      read: readClaude,
    },
    {
      id: 'gemini',
      name: 'Gemini',
      roots: [path.join(resolvedHome, '.gemini', 'tmp')],
      read: readGemini,
    },
    {
      id: 'antigravity',
      name: 'Antigravity',
      roots: [
        path.join(resolvedHome, '.gemini', 'antigravity', 'conversations'),
        path.join(resolvedHome, '.gemini', 'antigravity-cli', 'conversations'),
        path.join(resolvedHome, '.gemini', 'antigravity-ide', 'conversations'),
      ],
      read: readAntigravity,
    },
    {
      id: 'codex',
      name: 'Codex',
      roots: [
        path.join(resolvedHome, '.codex', 'sessions'),
        path.join(resolvedHome, '.codex', 'archived_sessions'),
      ],
      read: readCodex,
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      roots: uniquePaths([
        ...openCodeRoots,
        path.join(localAppData(env), 'opencode'),
        path.join(appData(env), 'opencode'),
        path.join(resolvedHome, '.local', 'share', 'opencode'),
      ]),
      read: readOpenCode,
    },
    {
      id: 'cursor',
      name: 'Cursor',
      roots: uniquePaths([
        ...cursorRoots,
        path.join(appData(env), 'Cursor', 'User', 'globalStorage'),
        path.join(appData(env), 'Cursor Nightly', 'User', 'globalStorage'),
      ]),
      read: readCursor,
    },
    {
      id: 'grok',
      name: 'Grok',
      roots: uniquePaths([
        ...grokHome,
        path.join(resolvedHome, '.grok', 'sessions'),
      ]),
      read: readGrok,
    },
    {
      id: 'copilot',
      name: 'Copilot',
      roots: uniquePaths([
        ...copilotRoots,
        path.join(resolvedHome, '.copilot'),
      ]),
      read: readCopilot,
    },
    {
      id: 'kiro',
      name: 'Kiro',
      roots: uniquePaths([
        ...kiroRoots,
        path.join(appData(env), 'kiro-cli'),
        path.join(localAppData(env), 'kiro-cli'),
        path.join(resolvedHome, '.kiro'),
      ]),
      read: readKiro,
    },
    {
      id: 'pi',
      name: 'Pi',
      roots: uniquePaths([
        ...piAgentRoots,
        ...piSessionRoots,
        path.join(resolvedHome, '.pi', 'agent', 'sessions'),
      ]),
      read: readPi,
    },
  ];
}

function finiteNumber(value) {
  if (typeof value === 'bigint') {
    if (value < 0n || value > BigInt(MAX_TOKEN_VALUE)) return 0;
    return Number(value);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(MAX_TOKEN_VALUE, Math.floor(number));
}

function stringValue(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function dateValue(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    const milliseconds = number < 100_000_000_000 ? number * 1000 : number;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value.trim());
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function jsonObject(value) {
  if (value == null) return null;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array)
    value = Buffer.from(value).toString('utf8');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function makeEntry({ id, provider, model, date, input = 0, output = 0, cacheRead = 0, cacheWrite = 0, reasoning = 0, total = 0, cost = 0 }) {
  const safeInput = finiteNumber(input);
  const safeCacheRead = finiteNumber(cacheRead);
  const safeCacheWrite = finiteNumber(cacheWrite);
  let safeOutput = finiteNumber(output);
  const safeReasoning = finiteNumber(reasoning);
  const reportedTotal = finiteNumber(total);
  const parts = safeInput + safeOutput + safeCacheRead + safeCacheWrite + safeReasoning;
  if (reportedTotal > parts) safeOutput += reportedTotal - parts;
  const tokens = safeInput + safeOutput + safeCacheRead + safeCacheWrite + safeReasoning;
  const parsedDate = dateValue(date);
  if (!id || !provider || !parsedDate || tokens <= 0) return null;
  return {
    id: String(id),
    provider: String(provider),
    model: stringValue(model) || 'unknown',
    date: parsedDate,
    tokens,
    input: safeInput,
    output: safeOutput,
    cacheRead: safeCacheRead,
    cacheWrite: safeCacheWrite,
    reasoning: safeReasoning,
    cost: Math.max(0, Number(cost) || 0),
  };
}

function dedupKeepMax(entries) {
  const byId = new Map();
  for (const entry of entries) {
    if (!entry) continue;
    const current = byId.get(entry.id);
    if (!current || entry.tokens > current.tokens) byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((left, right) => left.date - right.date || left.id.localeCompare(right.id));
}

function blankStats(name = '') {
  return {
    name,
    tokens: 0,
    cost: 0,
    sessions: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
  };
}

function addEntry(stats, entry) {
  for (const key of TOKEN_METRICS) stats[key] += entry[key] || 0;
  stats.sessions += 1;
}

function statsSnapshot(stats) {
  return {
    name: stats.name,
    tokens: stats.tokens,
    cost: stats.cost,
    sessions: stats.sessions,
    input: stats.input,
    output: stats.output,
    cacheRead: stats.cacheRead,
    cacheWrite: stats.cacheWrite,
    reasoning: stats.reasoning,
  };
}

function localDayKey(date) {
  const value = new Date(date);
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

function localDayStart(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function localWeekStart(date) {
  const value = localDayStart(date);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return value;
}

function localMonthStart(date) {
  const value = localDayStart(date);
  value.setDate(1);
  return value;
}

function aggregateEntries(entries, now = new Date()) {
  const current = new Date(now);
  const dayStart = localDayStart(current);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);
  const weekStart = localWeekStart(current);
  const monthStart = localMonthStart(current);
  const blockStart = new Date(current.getTime() - 5 * 60 * 60 * 1000);
  const todayKey = localDayKey(current);
  const providerTotals = new Map();
  const todayTotals = new Map();
  const windows = {
    today: blankStats('Today'),
    week: blankStats('Week'),
    month: blankStats('Month'),
    block5h: blankStats('5-hour block'),
  };

  for (const entry of entries) {
    const total = providerTotals.get(entry.provider) || blankStats(entry.provider);
    addEntry(total, entry);
    providerTotals.set(entry.provider, total);
    if (entry.date >= dayStart && entry.date < nextDay) {
      addEntry(windows.today, entry);
      const today = todayTotals.get(entry.provider) || blankStats(entry.provider);
      addEntry(today, entry);
      todayTotals.set(entry.provider, today);
    }
    if (entry.date >= weekStart) addEntry(windows.week, entry);
    if (entry.date >= monthStart) addEntry(windows.month, entry);
    if (entry.date >= blockStart) addEntry(windows.block5h, entry);
  }

  return {
    source: 'local provider files',
    date: todayKey,
    today: statsSnapshot(windows.today),
    week: statsSnapshot(windows.week),
    month: statsSnapshot(windows.month),
    block5h: statsSnapshot(windows.block5h),
    providers: [...providerTotals.values()]
      .map(statsSnapshot)
      .sort((left, right) => right.tokens - left.tokens || left.name.localeCompare(right.name)),
    todayProviders: [...todayTotals.values()]
      .map(statsSnapshot)
      .sort((left, right) => right.tokens - left.tokens || left.name.localeCompare(right.name)),
    progressionRows: [...providerTotals.values()].map((provider) => ({
      key: `local-provider:${provider.name}`,
      provider: provider.name,
      tokens: provider.tokens,
      cost: provider.cost,
      input: provider.input,
      output: provider.output,
      cacheRead: provider.cacheRead,
      cacheWrite: provider.cacheWrite,
      reasoning: provider.reasoning,
    })),
    totalRows: entries.length,
    unattributedRows: 0,
    timeWindowedRows: entries.length,
    officialAvailable: false,
    limitWindows: [],
  };
}

function fileSignature(file) {
  try {
    const stat = fs.statSync(file);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return null;
  }
}

function cachedFileEntries(provider, file, parser) {
  const signature = fileSignature(file);
  if (!signature) return [];
  const key = `${provider}|${path.normalize(file).toLowerCase()}`;
  const previous = fileCache.get(key);
  if (previous?.signature === signature) return previous.entries;
  let entries = [];
  try {
    if (fs.statSync(file).size <= MAX_FILE_BYTES)
      entries = parser(fs.readFileSync(file, 'utf8'), file);
  } catch {}
  fileCache.set(key, { signature, entries });
  return entries;
}

function filesUnder(root, predicate) {
  const normalized = String(root || '').trim();
  if (!normalized) return [];
  try {
    if (fs.statSync(normalized).isFile()) return predicate(normalized) ? [normalized] : [];
  } catch {
    return [];
  }
  const output = [];
  const pending = [[normalized, 0]];
  while (pending.length && output.length < MAX_FILES) {
    const [directory, depth] = pending.pop();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      continue;
    }
    for (const item of entries) {
      if (output.length >= MAX_FILES) break;
      if (SKIP_DIRECTORIES.has(item.name)) continue;
      const full = path.join(directory, item.name);
      if (item.isDirectory()) {
        if (depth < MAX_DEPTH) pending.push([full, depth + 1]);
      } else if (item.isFile() && predicate(full)) {
        output.push(full);
      }
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
}

function jsonFiles(roots, allowJson = false) {
  const files = [];
  for (const root of roots) {
    files.push(...filesUnder(root, (file) => {
      const extension = path.extname(file).toLowerCase();
      return extension === '.jsonl' || extension === '.ndjson' || (allowJson && extension === '.json');
    }));
  }
  return [...new Set(files.map((file) => path.normalize(file)))];
}

function readJsonLines(text, callback) {
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      callback(JSON.parse(line), index);
    } catch {}
  }
}

function readClaude(roots) {
  const entries = [];
  for (const file of jsonFiles(roots)) {
    entries.push(...cachedFileEntries('claude_code', file, (text, source) => {
      const parsed = [];
      readJsonLines(text, (object, index) => {
        if (object.type !== 'assistant' || !object.message?.usage) return;
        const usage = object.message.usage;
        const id = `${object.message.id || `line-${index}`}|${object.requestId || ''}`;
        const entry = makeEntry({
          id: `claude|${source}|${id}`,
          provider: 'Claude Code',
          model: object.message.model,
          date: object.timestamp,
          input: usage.input_tokens,
          output: usage.output_tokens,
          cacheWrite: usage.cache_creation_input_tokens,
          cacheRead: usage.cache_read_input_tokens,
        });
        if (entry) parsed.push(entry);
      });
      return dedupKeepMax(parsed);
    }));
  }
  return dedupKeepMax(entries);
}

function absorbGeminiObject(object, source, fallbackDate, idFallback) {
  const tokens = object?.tokens;
  if (!tokens || typeof tokens !== 'object') return null;
  const date = dateValue(object.timestamp) || fallbackDate;
  const input = finiteNumber(tokens.input);
  const cached = finiteNumber(tokens.cached);
  return makeEntry({
    id: `gemini|${source}|${stringValue(object.id) || idFallback}`,
    provider: 'Gemini',
    model: object.model,
    date,
    input: Math.max(0, input - cached) + finiteNumber(tokens.tool),
    output: finiteNumber(tokens.output) + finiteNumber(tokens.thoughts),
    cacheRead: cached,
  });
}

function readGemini(roots) {
  const entries = [];
  for (const file of jsonFiles(roots, true)) {
    entries.push(...cachedFileEntries('gemini', file, (text, source) => {
      const parsed = [];
      if (path.extname(source).toLowerCase() === '.jsonl' || path.extname(source).toLowerCase() === '.ndjson') {
        let lastTimestamp = null;
        readJsonLines(text, (object, index) => {
          const timestamp = dateValue(object.timestamp);
          if (timestamp) lastTimestamp = timestamp;
          const entry = absorbGeminiObject(object, source, lastTimestamp, `line-${index}`);
          if (entry) parsed.push(entry);
        });
      } else {
        const object = jsonObject(text);
        const sessionStart = dateValue(object?.startTime);
        for (const [index, message] of (object?.messages || []).entries()) {
          const entry = absorbGeminiObject(message, source, sessionStart, `message-${index}`);
          if (entry) parsed.push(entry);
        }
      }
      return dedupKeepMax(parsed);
    }));
  }
  return dedupKeepMax(entries);
}

function readCodex(roots) {
  const entries = [];
  for (const file of jsonFiles(roots)) {
    entries.push(...cachedFileEntries('codex', file, (text, source) => {
      const parsed = [];
      let sessionId = null;
      let model = 'codex';
      let turn = 0;
      let previousState = null;
      readJsonLines(text, (object) => {
        const payload = object.payload || {};
        if (object.type === 'session_meta') {
          sessionId = stringValue(payload.id) || stringValue(payload.session_id) || sessionId;
          return;
        }
        if (stringValue(payload.model)) model = payload.model;
        if (stringValue(payload.turn_context?.model)) model = payload.turn_context.model;
        if (payload.type !== 'token_count' || !payload.info?.last_token_usage) return;
        const last = payload.info.last_token_usage;
        const state = JSON.stringify({ last, total: payload.info.total_token_usage || null });
        if (state === previousState) return;
        previousState = state;
        const inputTotal = finiteNumber(last.input_tokens);
        const cached = finiteNumber(last.cached_input_tokens);
        const entry = makeEntry({
          id: `codex|${sessionId || source}|${turn++}`,
          provider: 'Codex',
          model,
          date: object.timestamp,
          input: Math.max(0, inputTotal - cached),
          output: last.output_tokens,
          cacheRead: cached,
        });
        if (entry) parsed.push(entry);
      });
      return dedupKeepMax(parsed);
    }));
  }
  return dedupKeepMax(entries);
}

function readGrok(roots) {
  const entries = [];
  for (const file of filesUnderRoots(roots, (candidate) => path.basename(candidate) === 'updates.jsonl')) {
    const sessionDir = path.dirname(file);
    if (grokSubagent(sessionDir)) continue;
    entries.push(...cachedFileEntries('grok', file, (text, source) => {
      const parsed = [];
      readJsonLines(text, (envelope) => {
        if (!JSON.stringify(envelope).includes('turn_completed')) return;
        const notification = envelope.params || envelope;
        const update = notification.update;
        const usage = update?.sessionUpdate === 'turn_completed' ? update.usage : null;
        if (!usage || notification._meta?.isReplay) return;
        const promptId = stringValue(update.prompt_id);
        if (!promptId) return;
        const inputFull = finiteNumber(usage.inputTokens);
        const inputSnake = finiteNumber(usage.input_tokens);
        const cacheRead = finiteNumber(usage.cachedReadTokens ?? usage.cached_read_tokens);
        const input = Object.prototype.hasOwnProperty.call(usage, 'inputTokens') && usage.inputTokens != null
          ? Math.max(0, inputFull - Math.min(cacheRead, inputFull))
          : inputSnake;
        const byModel = usage.modelUsage || usage.model_usage || {};
        let model = 'grok';
        let best = -1;
        for (const [candidate, value] of Object.entries(byModel)) {
          const total = finiteNumber(value?.totalTokens ?? value?.total_tokens);
          if (total > best) {
            best = total;
            model = candidate;
          }
        }
        const ticks = finiteNumber(usage.costUsdTicks ?? usage.cost_usd_ticks);
        const entry = makeEntry({
          id: `grok|${promptId}`,
          provider: 'Grok',
          model,
          date: dateValue(notification._meta?.agentTimestampMs) || dateValue(envelope.timestamp),
          input,
          output: usage.outputTokens ?? usage.output_tokens,
          cacheRead,
          total: usage.totalTokens ?? usage.total_tokens,
          cost: ticks > 0 ? ticks / 1e10 : 0,
        });
        if (entry) parsed.push(entry);
      });
      return dedupKeepMax(parsed);
    }));
  }
  return dedupKeepMax(entries);
}

function grokSubagent(directory) {
  try {
    const summary = jsonObject(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'));
    return String(summary?.session_kind || '').startsWith('subagent');
  } catch {
    return false;
  }
}

function readPi(roots) {
  const entries = [];
  for (const file of jsonFiles(roots)) {
    entries.push(...cachedFileEntries('pi', file, (text, source) => {
      const parsed = [];
      readJsonLines(text, (envelope, index) => {
        const type = envelope.type;
        let object = null;
        let date = null;
        if (type === 'message') {
          object = envelope.message;
          if (!object || ['aborted', 'error'].includes(object.stopReason) || !object.usage) return;
          date = dateValue(object.timestamp) || dateValue(envelope.timestamp);
        } else if (type === 'compaction' || type === 'branch_summary') {
          object = envelope;
          date = dateValue(envelope.timestamp);
        } else return;
        const usage = object.usage;
        const hasBuckets = ['input', 'output', 'cacheWrite', 'cacheRead'].some((key) => usage[key] != null);
        const entry = makeEntry({
          id: `pi|${source}|${stringValue(envelope.id) || `line-${index}`}`,
          provider: 'Pi',
          model: object.model || envelope.model,
          date,
          input: hasBuckets ? usage.input : usage.totalTokens,
          output: hasBuckets ? usage.output : 0,
          cacheWrite: hasBuckets ? usage.cacheWrite : 0,
          cacheRead: hasBuckets ? usage.cacheRead : 0,
        });
        if (entry) parsed.push(entry);
      });
      return dedupKeepMax(parsed);
    }));
  }
  return dedupKeepMax(entries);
}

function filesUnderRoots(roots, predicate) {
  return [...new Set(roots.flatMap((root) => filesUnder(root, predicate).map((file) => path.normalize(file))))];
}

function databaseSignature(file) {
  const main = fileSignature(file);
  const wal = fileSignature(`${file}-wal`);
  return main || wal ? `${main || ''}|${wal || ''}` : null;
}

function queryDatabase(file, sql, parameters = []) {
  if (!DatabaseSync || !fileSignature(file)) return null;
  let database;
  try {
    database = new DatabaseSync(file, { readOnly: true, timeout: 1000 });
    return database.prepare(sql).all(...parameters).map((row) => ({ ...row }));
  } catch {
    return null;
  } finally {
    try { database?.close(); } catch {}
  }
}

function cachedDatabaseEntries(provider, file, loader) {
  const signature = databaseSignature(file);
  if (!signature) return [];
  const key = `${provider}|${path.normalize(file).toLowerCase()}`;
  const previous = databaseCache.get(key);
  if (previous?.signature === signature) return previous.entries;
  let entries = [];
  try { entries = loader(file) || []; } catch {}
  databaseCache.set(key, { signature, entries });
  return entries;
}

function databaseFiles(roots, predicate) {
  return filesUnderRoots(roots, (file) => {
    const extension = path.extname(file).toLowerCase();
    return ['.db', '.sqlite', '.sqlite3'].includes(extension) && predicate(path.basename(file));
  });
}

function openCodeMessage(object, fallbackId, timeCreated) {
  const tokens = object?.tokens;
  const created = dateValue(object?.time?.created) || dateValue(timeCreated);
  if (!tokens || !created || !object.modelID || !object.providerID) return null;
  const cache = tokens.cache || {};
  return makeEntry({
    id: `opencode|${stringValue(object.id) || fallbackId}`,
    provider: 'OpenCode',
    model: object.modelID,
    date: created,
    input: tokens.input,
    output: tokens.output,
    cacheWrite: cache.write,
    cacheRead: cache.read,
    total: tokens.total,
    cost: object.cost,
  });
}

function readOpenCode(roots) {
  const entries = [];
  for (const file of databaseFiles(roots, (name) => name === 'opencode.db' || (name.startsWith('opencode-') && name.endsWith('.db')))) {
    entries.push(...cachedDatabaseEntries('opencode', file, (database) => {
      let rows = queryDatabase(database, 'SELECT id, session_id, data, time_created FROM message');
      if (!rows) rows = queryDatabase(database, 'SELECT id, session_id, data FROM message');
      return (rows || []).flatMap((row) => {
        const entry = openCodeMessage(jsonObject(row.data), String(row.id || ''), row.time_created);
        return entry ? [entry] : [];
      });
    }));
  }
  for (const root of roots) {
    for (const file of filesUnder(root, (candidate) => path.basename(path.dirname(candidate)) === 'message' && path.extname(candidate).toLowerCase() === '.json')) {
      entries.push(...cachedFileEntries('opencode', file, (text, source) => {
        const entry = openCodeMessage(jsonObject(text), path.basename(source, '.json'));
        return entry ? [entry] : [];
      }));
    }
  }
  return dedupKeepMax(entries);
}

function cursorMessage(object, key, database) {
  const tokenCount = object?.tokenCount;
  const date = dateValue(object?.createdAt);
  if (!tokenCount || !date) return null;
  return makeEntry({
    id: `cursor|${database}|${key}`,
    provider: 'Cursor',
    model: object.modelType,
    date,
    input: tokenCount.inputTokens,
    output: tokenCount.outputTokens,
  });
}

function readCursor(roots) {
  const entries = [];
  for (const file of filesUnderRoots(roots, (candidate) => path.basename(candidate).toLowerCase() === 'state.vscdb')) {
    entries.push(...cachedDatabaseEntries('cursor', file, (database) => {
      const rows = queryDatabase(database, "SELECT rowid, key, value FROM cursorDiskKV WHERE key GLOB 'bubbleId:*'");
      return (rows || []).flatMap((row) => {
        const entry = cursorMessage(jsonObject(row.value), String(row.key || row.rowid), database);
        return entry ? [entry] : [];
      });
    }));
  }
  return dedupKeepMax(entries);
}

function parseCopilotDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const normalized = text.includes(' ') ? text.replace(' ', 'T') : text;
  return dateValue(/[zZ]|[+-]\d\d:?\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
}

function readCopilot(roots) {
  const entries = [];
  for (const file of databaseFiles(roots, (name) => name === 'session-store.db')) {
    entries.push(...cachedDatabaseEntries('copilot', file, (database) => {
      const rows = queryDatabase(database, 'SELECT id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, created_at FROM assistant_usage_events');
      return (rows || []).flatMap((row) => {
        const cacheRead = finiteNumber(row.cache_read_tokens);
        const cacheWrite = finiteNumber(row.cache_write_tokens);
        const entry = makeEntry({
          id: `copilot|${database}|${row.id}`,
          provider: 'Copilot',
          model: row.model,
          date: parseCopilotDate(row.created_at),
          input: Math.max(0, finiteNumber(row.input_tokens) - cacheRead - cacheWrite),
          output: row.output_tokens,
          cacheRead,
          cacheWrite,
        });
        return entry ? [entry] : [];
      });
    }));
  }
  return dedupKeepMax(entries);
}

function jsonValueByteLength(value) {
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  if (typeof value === 'number' || typeof value === 'boolean') return Buffer.byteLength(String(value), 'utf8');
  if (Array.isArray(value)) return value.reduce((total, item) => total + jsonValueByteLength(item), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce((total, item) => total + jsonValueByteLength(item), 0);
  return 0;
}

function kiroFieldByteLength(value) {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return Object.entries(value).reduce((total, [key, item]) => key === 'images' ? total : total + jsonValueByteLength(item), 0);
  return jsonValueByteLength(value);
}

function kiroConversationEntries(conversationId, object, database) {
  if (!Array.isArray(object?.history)) return [];
  let cumulativeHistoryBytes = jsonValueByteLength(object.latest_summary || 0);
  const entries = [];
  for (const turn of object.history) {
    const userBytes = kiroFieldByteLength(turn?.user);
    const assistantBytes = kiroFieldByteLength(turn?.assistant);
    const metadata = turn?.request_metadata;
    if (metadata) {
      const date = dateValue(metadata.request_start_timestamp_ms);
      if (date) {
        const entry = makeEntry({
          id: `kiro|${conversationId}|${finiteNumber(metadata.request_start_timestamp_ms)}`,
          provider: 'Kiro',
          model: metadata.model_id,
          date,
          input: Math.floor((cumulativeHistoryBytes + userBytes) / 4),
          output: Math.floor(finiteNumber(metadata.response_size) / 4),
        });
        if (entry) entries.push(entry);
      }
    }
    cumulativeHistoryBytes += userBytes + assistantBytes;
  }
  return entries;
}

function readKiro(roots) {
  const entries = [];
  for (const file of databaseFiles(roots, (name) => name === 'data.sqlite3')) {
    entries.push(...cachedDatabaseEntries('kiro', file, (database) => {
      const oldRows = queryDatabase(database, 'SELECT conversation_id, value FROM conversations_v2') || [];
      const currentRows = queryDatabase(database, 'SELECT value FROM conversations') || [];
      const parsed = [];
      for (const row of oldRows) {
        const object = jsonObject(row.value);
        parsed.push(...kiroConversationEntries(String(row.conversation_id || object?.conversation_id || database), object, database));
      }
      for (const row of currentRows) {
        const object = jsonObject(row.value);
        if (object?.conversation_id)
          parsed.push(...kiroConversationEntries(String(object.conversation_id), object, database));
      }
      return parsed;
    }));
  }
  return dedupKeepMax(entries);
}

function readVarint(buffer, start) {
  let value = 0n;
  let shift = 0n;
  let index = start;
  while (index < buffer.length) {
    const byte = buffer[index++];
    value |= BigInt(byte & 0x7f) << shift;
    if (!(byte & 0x80)) return { value, next: index };
    shift += 7n;
    if (shift > 63n) return null;
  }
  return null;
}

function walkProto(buffer, visit) {
  let index = 0;
  while (index < buffer.length) {
    const key = readVarint(buffer, index);
    if (!key) return;
    index = key.next;
    const field = Number(key.value >> 3n);
    const wire = Number(key.value & 7n);
    if (field <= 0) return;
    if (wire === 0) {
      const value = readVarint(buffer, index);
      if (!value) return;
      index = value.next;
      if (visit(field, value.value, null) === false) return;
    } else if (wire === 1) {
      if (index + 8 > buffer.length) return;
      index += 8;
    } else if (wire === 2) {
      const length = readVarint(buffer, index);
      if (!length || length.value > BigInt(buffer.length - length.next)) return;
      const end = length.next + Number(length.value);
      if (visit(field, 0n, buffer.subarray(length.next, end)) === false) return;
      index = end;
    } else if (wire === 5) {
      if (index + 4 > buffer.length) return;
      index += 4;
    } else return;
  }
}

function protoMessage(buffer, wantedField) {
  let result = null;
  walkProto(buffer, (field, value, payload) => {
    if (field === wantedField && payload) {
      result = payload;
      return false;
    }
    return true;
  });
  return result;
}

function protoVarint(buffer, wantedField) {
  let result = null;
  walkProto(buffer, (field, value, payload) => {
    if (field === wantedField && !payload) {
      result = value;
      return false;
    }
    return true;
  });
  return result;
}

function protoString(buffer, wantedField) {
  const payload = protoMessage(buffer, wantedField);
  if (!payload) return null;
  return stringValue(payload.toString('utf8'));
}

function protoTimestamp(buffer, wantedField) {
  const stamp = protoMessage(buffer, wantedField);
  if (!stamp) return null;
  const seconds = protoVarint(stamp, 1);
  if (seconds == null || seconds < 1_000_000_000n || seconds > 4_102_444_800n) return null;
  const nanos = protoVarint(stamp, 2);
  const milliseconds = Number(seconds) * 1000 + (nanos != null && nanos < 1_000_000_000n ? Number(nanos) / 1_000_000 : 0);
  return dateValue(milliseconds);
}

function readAntigravityDatabase(database) {
  const rows = queryDatabase(database, 'SELECT idx, data FROM gen_metadata WHERE data IS NOT NULL ORDER BY idx');
  if (!rows) return [];
  const stepDates = new Map();
  const steps = queryDatabase(database, 'SELECT metadata FROM steps WHERE metadata IS NOT NULL ORDER BY idx') || [];
  for (const row of steps) {
    const metadata = toBuffer(row.metadata);
    if (!metadata) continue;
    const date = protoTimestamp(metadata, 8) || protoTimestamp(metadata, 1);
    if (!date) continue;
    const responseModel = protoMessage(metadata, 9);
    const responseId = responseModel ? protoString(responseModel, 11) : null;
    const executionId = protoString(metadata, 12);
    if (responseId) stepDates.set(`response:${responseId}`, date);
    if (executionId && !stepDates.has(`execution:${executionId}`)) stepDates.set(`execution:${executionId}`, date);
  }
  let fallbackDate = dateValue(fs.statSync(database).mtimeMs) || new Date();
  return rows.flatMap((row) => {
    const data = toBuffer(row.data);
    if (!data) return [];
    const chatModel = protoMessage(data, 1);
    const usage = chatModel ? protoMessage(chatModel, 4) : null;
    if (!chatModel || !usage) return [];
    const responseId = protoString(usage, 11);
    const executionId = protoString(data, 4);
    const start = protoMessage(chatModel, 9);
    const date = (start ? protoTimestamp(start, 4) : null)
      || (responseId ? stepDates.get(`response:${responseId}`) : null)
      || (executionId ? stepDates.get(`execution:${executionId}`) : null)
      || fallbackDate;
    const entry = makeEntry({
      id: responseId ? `antigravity|${responseId}` : `antigravity|${database}|${row.idx}`,
      provider: 'Antigravity',
      model: `antigravity/${protoString(chatModel, 19) || 'unknown'}`,
      date,
      input: protoToken(usage, 2),
      output: protoToken(usage, 3),
      cacheWrite: protoToken(usage, 4),
      cacheRead: protoToken(usage, 5),
    });
    return entry ? [entry] : [];
  });
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return null;
}

function protoToken(buffer, field) {
  const value = protoVarint(buffer, field);
  if (value == null || value > 1_000_000_000n) return 0;
  return Number(value);
}

function readAntigravity(roots) {
  const entries = [];
  for (const file of databaseFiles(roots, () => true))
    entries.push(...cachedDatabaseEntries('antigravity', file, readAntigravityDatabase));
  return dedupKeepMax(entries);
}

async function readLocalProviderUsage(now = new Date(), options = {}) {
  const env = options.env || process.env;
  const definitions = providerDefinitions(options.home || userHome(env), env);
  const overrides = options.roots || {};
  const entries = [];
  for (const definition of definitions) {
    const roots = overrides[definition.id] || definition.roots;
    try {
      entries.push(...await definition.read(Array.isArray(roots) ? roots : [roots]));
    } catch {}
  }
  return aggregateEntries(dedupKeepMax(entries), now);
}

module.exports = {
  providerDefinitions,
  readLocalProviderUsage,
  aggregateEntries,
  dedupKeepMax,
  makeEntry,
  localDayKey,
};
