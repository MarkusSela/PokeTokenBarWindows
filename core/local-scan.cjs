const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const EXTENSIONS = new Set([".json", ".jsonl", ".ndjson", ".log"]);
const MAX_DEPTH = 5;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 500;
const KEYS = {
  input: ["input_tokens", "inputTokens", "prompt_tokens", "promptTokens"],
  output: [
    "output_tokens",
    "outputTokens",
    "completion_tokens",
    "completionTokens",
  ],
  cacheRead: ["cache_read_tokens", "cacheReadTokens"],
  cacheWrite: ["cache_write_tokens", "cacheWriteTokens"],
  reasoning: ["reasoning_tokens", "reasoningTokens"],
  cost: [
    "actual_cost_usd",
    "actualCostUsd",
    "estimated_cost_usd",
    "estimatedCostUsd",
  ],
};
const TIME_KEYS = [
  "timestamp",
  "created_at",
  "createdAt",
  "started_at",
  "startedAt",
  "time",
  "date",
];
function numberFrom(object, keys) {
  for (const key of keys) {
    const value = Number(object?.[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}
function rowUsage(object) {
  const input = numberFrom(object, KEYS.input),
    output = numberFrom(object, KEYS.output),
    cacheRead = numberFrom(object, KEYS.cacheRead),
    cacheWrite = numberFrom(object, KEYS.cacheWrite),
    reasoning = numberFrom(object, KEYS.reasoning),
    cost = numberFrom(object, KEYS.cost);
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    reasoning,
    cost,
    tokens: input + output + cacheRead + cacheWrite + reasoning,
  };
}
function timestampFrom(object) {
  for (const key of TIME_KEYS) {
    const value = object?.[key];
    if (value == null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(value < 1e12 ? value * 1000 : value);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}
function providerFrom(object) {
  for (const key of ["provider", "provider_name", "providerName"]) {
    const value = String(object?.[key] ?? "").trim();
    if (value) return value;
  }
  return null;
}
function empty(name) {
  return {
    name,
    tokens: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
    cost: 0,
    sessions: 0,
  };
}
function add(target, usage) {
  for (const key of [
    "tokens",
    "input",
    "output",
    "cacheRead",
    "cacheWrite",
    "reasoning",
    "cost",
  ])
    target[key] += usage[key];
  target.sessions++;
}
function providerFor(file, root) {
  const base = path.basename(root || path.dirname(file));
  return base || path.basename(file, path.extname(file));
}
function canonicalRoot(value) {
  const lexical = path.resolve(value);
  try {
    return path.normalize((fs.realpathSync.native || fs.realpathSync)(lexical));
  } catch {
    return lexical;
  }
}
function containsRoot(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function scanRoots(folders) {
  const candidates = [...new Set(
    (Array.isArray(folders) ? folders : [])
      .map((value) => typeof value === "string" ? value.trim() : "")
      .filter(Boolean)
      .map(canonicalRoot),
  )].sort((left, right) => left.length - right.length || left.localeCompare(right));
  const selected = [];
  for (const candidate of candidates)
    if (!selected.some((root) => containsRoot(root, candidate) || containsRoot(candidate, root)))
      selected.push(candidate);
  return selected;
}
function progressionKey(root, provider) {
  return `scan:${crypto.createHash("sha256").update(`${root}\0${provider}`).digest("hex").slice(0, 24)}`;
}
function filesUnder(root) {
  const out = [];
  function walk(current, depth) {
    if (out.length >= MAX_FILES || depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= MAX_FILES) break;
      if (
        entry.name.startsWith(".") ||
        ["node_modules", ".git", "cache"].includes(entry.name)
      )
        continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
        out.push(full);
    }
  }
  walk(root, 0);
  return out;
}
function parseFile(file) {
  let text;
  try {
    if (fs.statSync(file).size > MAX_FILE_BYTES) return [];
    text = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const rows = [];
  if (path.extname(file).toLowerCase() === ".json") {
    try {
      const value = JSON.parse(text);
      if (Array.isArray(value)) rows.push(...value);
      else rows.push(value);
    } catch {
      return [];
    }
  } else
    for (const line of text.split(/\r?\n/)) {
      try {
        if (line.trim()) rows.push(JSON.parse(line));
      } catch {}
    }
  return rows
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      usage: rowUsage(row),
      timestamp: timestampFrom(row),
      provider: providerFrom(row),
    }))
    .filter((row) => row.usage.tokens > 0 || row.usage.cost > 0);
}
function snapshot(bucket) {
  return {
    tokens: bucket.tokens,
    cost: bucket.cost,
    sessions: bucket.sessions,
    input: bucket.input,
    output: bucket.output,
    cacheRead: bucket.cacheRead,
    cacheWrite: bucket.cacheWrite,
    reasoning: bucket.reasoning,
  };
}
function startOfLocalDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}
function startOfLocalWeek(date) {
  const value = startOfLocalDay(date);
  const mondayOffset = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - mondayOffset);
  return value;
}
function startOfLocalMonth(date) {
  const value = startOfLocalDay(date);
  value.setDate(1);
  return value;
}
async function scanAdditionalFolders(folders = [], options = {}) {
  const total = empty("Additional scan");
  const providers = new Map();
  const todayProviders = new Map();
  const progression = new Map();
  const windows = {
    today: empty("Today"),
    week: empty("Week"),
    month: empty("Month"),
    block5h: empty("5-hour block"),
  };
  const now =
    options.now instanceof Date && !Number.isNaN(options.now.getTime())
      ? new Date(options.now)
      : new Date();
  const dayStart = startOfLocalDay(now);
  const weekStart = startOfLocalWeek(now);
  const monthStart = startOfLocalMonth(now);
  const blockStart = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  let unattributedRows = 0;
  for (const root of scanRoots(folders)) {
    if (!fs.existsSync(root)) continue;
    for (const file of filesUnder(root)) {
      const fileProvider = providerFor(file, root);
      for (const record of parseFile(file)) {
        const name = record.provider || fileProvider;
        const bucket = providers.get(name) || empty(name);
        const rootKey = `${root}\0${name}`;
        const rootBucket = progression.get(rootKey) || empty(name);
        add(bucket, record.usage);
        add(rootBucket, record.usage);
        add(total, record.usage);
        progression.set(rootKey, rootBucket);
        if (!record.timestamp || record.timestamp >= dayStart) {
          const todayBucket = todayProviders.get(name) || empty(name);
          add(todayBucket, record.usage);
          todayProviders.set(name, todayBucket);
        }
        if (!record.timestamp) {
          add(windows.today, record.usage);
          unattributedRows++;
          providers.set(bucket.name, bucket);
          continue;
        }
        if (record.timestamp >= dayStart) add(windows.today, record.usage);
        if (record.timestamp >= weekStart) add(windows.week, record.usage);
        if (record.timestamp >= monthStart) add(windows.month, record.usage);
        if (record.timestamp >= blockStart) add(windows.block5h, record.usage);
        providers.set(bucket.name, bucket);
      }
    }
  }
  return {
    source: "additional scan",
    today: snapshot(windows.today),
    week: snapshot(windows.week),
    month: snapshot(windows.month),
    block5h: snapshot(windows.block5h),
    providers: [...providers.values()].sort((a, b) => b.tokens - a.tokens),
    todayProviders: [...todayProviders.values()].sort((a, b) => b.tokens - a.tokens),
    progressionRows: [...progression.entries()]
      .map(([key, bucket]) => ({ key: progressionKey(...key.split("\0")), provider: bucket.name, ...snapshot(bucket) }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    totalRows: total.sessions,
    unattributedRows,
    timeWindowedRows: total.sessions - unattributedRows,
  };
}
module.exports = { scanAdditionalFolders, rowUsage };
