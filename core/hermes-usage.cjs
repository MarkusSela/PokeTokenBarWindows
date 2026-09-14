const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const {
  resolveHermesDbPath,
  resolvePlatformPaths,
} = require("./platform-paths.cjs");
let NativeDatabaseSync;
try {
  ({ DatabaseSync: NativeDatabaseSync } = require("node:sqlite"));
} catch {}
let sqlPromise;
function hermesHome(options = {}) {
  return resolvePlatformPaths(options).hermesHome;
}
function stateDbPath(options = {}) {
  return resolveHermesDbPath(options);
}
function localStart(kind, now = new Date()) {
  const d = new Date(now);
  if (kind === "day") d.setHours(0, 0, 0, 0);
  if (kind === "week") {
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
  }
  if (kind === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}
async function sql() {
  return (sqlPromise ??= initSqlJs({
    locateFile: (file) =>
      path.join(path.dirname(require.resolve("sql.js/dist/sql-wasm.js")), file),
  }));
}
function providerName(row) {
  const billing = String(row.billing_provider || "").trim();
  if (billing) return billing;
  const model = String(row.model || "").toLowerCase();
  if (model.includes("claude")) return "Claude Code";
  if (model.includes("gemini") || model.includes("gemma")) return "Gemini";
  if (
    model.includes("codex") ||
    model.includes("gpt") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("o4")
  )
    return "OpenAI";
  return row.model || "Sconosciuto";
}
function rowUsage(row) {
  return {
    tokens: [
      "input_tokens",
      "output_tokens",
      "cache_read_tokens",
      "cache_write_tokens",
      "reasoning_tokens",
    ].reduce((n, k) => n + Math.max(0, Number(row[k] || 0)), 0),
    input: Math.max(0, Number(row.input_tokens || 0)),
    output: Math.max(0, Number(row.output_tokens || 0)),
    cacheRead: Math.max(0, Number(row.cache_read_tokens || 0)),
    cacheWrite: Math.max(0, Number(row.cache_write_tokens || 0)),
    reasoning: Math.max(0, Number(row.reasoning_tokens || 0)),
    cost:
      Math.max(0, Number(row.actual_cost_usd || 0)) ||
      Math.max(0, Number(row.estimated_cost_usd || 0)),
  };
}
function mergeUsageRows(baseRows, auxiliaryRows = []) {
  return [...baseRows, ...auxiliaryRows];
}
function providerAggregates(rows, minimumStartedAt = Number.NEGATIVE_INFINITY) {
  const providers = new Map();
  for (const row of rows.filter((r) => Number(r.started_at) >= minimumStartedAt)) {
    const key = providerName(row),
      usage = rowUsage(row),
      item = providers.get(key) || {
        name: key,
        tokens: 0,
        cost: 0,
        sessions: 0,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        sessionIds: new Set(),
      };
    item.tokens += usage.tokens;
    item.cost += usage.cost;
    if (row.session_id == null) item.sessions++;
    else if (!item.sessionIds.has(String(row.session_id))) {
      item.sessionIds.add(String(row.session_id));
      item.sessions++;
    }
    item.input += usage.input;
    item.output += usage.output;
    item.cacheRead += usage.cacheRead;
    item.cacheWrite += usage.cacheWrite;
    item.reasoning += usage.reasoning;
    providers.set(key, item);
  }
  return [...providers.values()]
    .map(({ sessionIds, ...item }) => item)
    .sort((a, b) => b.tokens - a.tokens);
}
function queryRows(handle, query) {
  if (handle.native) {
    return handle.db.prepare(query).all().map((row) => ({ ...row }));
  }
  const [result = { columns: [], values: [] }] = handle.db.exec(query);
  return result.values.map((values) =>
    Object.fromEntries(result.columns.map((key, i) => [key, values[i]])),
  );
}
function openReadOnlyDatabase(file) {
  if (NativeDatabaseSync) {
    return {
      native: true,
      db: new NativeDatabaseSync(file, { readOnly: true, timeout: 1000 }),
    };
  }
  throw new Error('Native SQLite is unavailable');
}
async function openSqlJsDatabase(file) {
  if (fs.existsSync(`${file}-wal`) || fs.existsSync(`${file}-shm`))
    throw new Error('SQLite WAL requires native read-only SQLite support');
  const SQL = await sql();
  return { native: false, db: new SQL.Database(fs.readFileSync(file)) };
}
function closeDatabase(handle) {
  if (handle?.db) handle.db.close();
}
function emptyUsage(now, file) {
  const zero = () => ({
    tokens: 0,
    cost: 0,
    sessions: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
  });
  return {
    source: file,
    today: zero(),
    week: zero(),
    month: zero(),
    block5h: zero(),
    providers: [],
    todayProviders: [],
    progressionRows: [],
    totalRows: 0,
    date: now.toISOString().slice(0, 10),
    officialAvailable: false,
    limitWindows: [],
  };
}
async function readHermesUsage(now = new Date(), file = stateDbPath()) {
  if (!fs.existsSync(file)) return emptyUsage(now, file);
  let handle;
  try {
    handle = NativeDatabaseSync
      ? openReadOnlyDatabase(file)
      : await openSqlJsDatabase(file);
  } catch {
    return emptyUsage(now, file);
  }
  try {
    const query = `SELECT id as session_id,model,billing_provider,started_at,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,reasoning_tokens,estimated_cost_usd,actual_cost_usd FROM sessions WHERE model IS NOT NULL AND TRIM(model) != ''`;
    const rows = queryRows(handle, query);
    let auxiliaryRows = [];
    try {
      auxiliaryRows = queryRows(
        handle,
        `SELECT u.session_id,s.started_at,u.model,u.billing_provider,u.input_tokens,u.output_tokens,u.cache_read_tokens,u.cache_write_tokens,u.reasoning_tokens,u.estimated_cost_usd,u.actual_cost_usd,u.task FROM session_model_usage u JOIN sessions s ON s.id = u.session_id WHERE s.model IS NOT NULL AND TRIM(s.model) != '' AND u.task IS NOT NULL AND TRIM(u.task) != ''`,
      );
    } catch {}
    const allRows = mergeUsageRows(rows, auxiliaryRows);
    const progressionRows = [
      ...rows.map((row) => ({
        key: `session:${row.session_id}`,
        provider: providerName(row),
        ...rowUsage(row),
      })),
      ...auxiliaryRows.map((row) => ({
        key: `aux:${row.session_id}:${row.model}:${row.billing_provider || ""}:${row.task || ""}`,
        provider: providerName(row),
        ...rowUsage(row),
      })),
    ];
    const starts = {
      day: localStart("day", now).getTime() / 1000,
      week: localStart("week", now).getTime() / 1000,
      month: localStart("month", now).getTime() / 1000,
      block: (now.getTime() - 5 * 60 * 60 * 1000) / 1000,
    };
    const sum = (min) => {
      const out = allRows
        .filter((r) => Number(r.started_at) >= min)
        .reduce(
          (result, r) => {
            const usage = rowUsage(r);
            result.tokens += usage.tokens;
            result.cost += usage.cost;
            result.input += usage.input;
            result.output += usage.output;
            result.cacheRead += usage.cacheRead;
            result.cacheWrite += usage.cacheWrite;
            result.reasoning += usage.reasoning;
            return result;
          },
          {
            tokens: 0,
            cost: 0,
            sessions: 0,
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            reasoning: 0,
          },
        );
      out.sessions = rows.filter((r) => Number(r.started_at) >= min).length;
      return out;
    };
    return {
      source: file,
      today: sum(starts.day),
      week: sum(starts.week),
      month: sum(starts.month),
      block5h: sum(starts.block),
      providers: providerAggregates(allRows, starts.month),
      todayProviders: providerAggregates(allRows, starts.day),
      progressionRows,
      totalRows: rows.length,
      date: now.toLocaleDateString("en-CA"),
    };
  } finally {
    closeDatabase(handle);
  }
}
module.exports = {
  hermesHome,
  stateDbPath,
  localStart,
  providerName,
  providerAggregates,
  mergeUsageRows,
  rowUsage,
  readHermesUsage,
};
