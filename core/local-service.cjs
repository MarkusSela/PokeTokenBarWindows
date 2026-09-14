const path = require('node:path');
const crypto = require('node:crypto');
const {
  Game,
  BALANCE,
  phaseThreshold,
  eggProgress,
  eggTokensToHatch,
} = require('./game.cjs');
const { buildCatchLogEntries, buildPokedexEntries } = require('./catch-log.cjs');
const { loadState, saveState } = require('./state-store.cjs');
const { readHermesUsage } = require('./hermes-usage.cjs');
const { readLocalProviderUsage } = require('./provider-usage.cjs');
const { scanAdditionalFolders } = require('./local-scan.cjs');
const { LiveUsageDisplay } = require('./live-usage.cjs');
const { normalizeLimitWindows } = require('./provider-limits.cjs');
const { buildCapabilities, actionAllowed } = require('./capabilities.cjs');
const { normalizeSettings } = require('./settings.cjs');
const { checkLatestRelease } = require('./release-check.cjs');
const {
  pathForPlatform,
  resolvePlatformPaths,
  resolveHermesDbPath,
  resolveCompanionStateFilePath,
} = require('./platform-paths.cjs');
const { sanitizeSnapshot } = require('./snapshot-contract.cjs');
const { version: packageVersion } = require('../package.json');

const METRICS = Object.freeze([
  'tokens',
  'cost',
  'sessions',
  'input',
  'output',
  'cacheRead',
  'cacheWrite',
  'reasoning',
]);
const DEFAULT_BACKGROUND_REFRESH_DELAY_MS = 250;
const WEB_SETTING_KEYS = new Set([
  'language',
  'refreshMinutes',
  'limitDisplay',
  'launchAtLogin',
  'menuTodayTokens',
  'menuTodayCost',
  'menuLimitPercent',
  'updateNotifications',
  'providerStatus',
  'keychainOptOut',
]);

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function stats(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(METRICS.map((key) => [
    key,
    key === 'sessions' ? Math.floor(number(source[key])) : number(source[key]),
  ]));
}

function addStats(left, right) {
  const a = stats(left);
  const b = stats(right);
  return Object.fromEntries(METRICS.map((key) => [key, a[key] + b[key]]));
}

function mergeProviders(left = [], right = []) {
  const merged = new Map();
  for (const item of [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]) {
    const name = String(item?.name || 'Sconosciuto');
    const current = merged.get(name) || { name };
    merged.set(name, { name, ...addStats(current, item) });
  }
  return [...merged.values()].sort((a, b) => b.tokens - a.tokens);
}

function providerRows(value = []) {
  return (Array.isArray(value) ? value : []).map((provider) => {
    const name = String(provider?.name || 'Sconosciuto');
    const key = crypto.createHash('sha256').update(`provider\0${name}`).digest('hex').slice(0, 24);
    return { key: `provider:${key}`, provider: name, ...stats(provider) };
  });
}

function mergeUsage(base = {}, extra = {}) {
  const progressionRows = Array.isArray(extra.progressionRows) && extra.progressionRows.length
    ? extra.progressionRows
    : providerRows(extra.providers);
  return {
    ...base,
    date: String(base.date || extra.date || ''),
    today: addStats(base.today, extra.today),
    week: addStats(base.week, extra.week),
    month: addStats(base.month, extra.month),
    block5h: addStats(base.block5h, extra.block5h),
    providers: mergeProviders(base.providers, extra.providers),
    todayProviders: mergeProviders(base.todayProviders, extra.todayProviders || extra.providers),
    progressionRows: [
      ...(Array.isArray(base.progressionRows) ? base.progressionRows : []),
      ...progressionRows,
    ],
    additionalScanRows: Number(extra.totalRows || 0),
    additionalScanUnattributedRows: Number(extra.unattributedRows || 0),
    additionalScanTimeWindowedRows: Number(extra.timeWindowedRows || 0),
    officialAvailable: Boolean(base.officialAvailable || extra.officialAvailable),
    limitWindows: Array.isArray(base.limitWindows) && base.limitWindows.length
      ? base.limitWindows
      : Array.isArray(extra.limitWindows) ? extra.limitWindows : [],
  };
}

function activeName(game, active) {
  if (!active) return null;
  const id = active.pathIds?.[active.stageIndex];
  const value = active.names?.[id];
  const names = typeof value === 'string' ? { en: value, it: value } : value || {};
  const language = game.state.settings.language === 'it' ? 'it' : 'en';
  return names[language] || names.en || names.it || `#${id}`;
}

function spriteUrl(active) {
  if (!active) return null;
  const id = active.pathIds?.[active.stageIndex];
  const shiny = Boolean((active.shiny && !active.dittoDisguise) || active.dittoRevealed);
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${shiny ? 'shiny/' : ''}${id}.gif`;
}

function representativeSnapshot(game) {
  const subject = game.representativeSubject?.();
  if (!subject || subject.speciesId == null) return null;
  return {
    id: subject.speciesId,
    name: subject.name || `#${subject.speciesId}`,
    shiny: Boolean(subject.isShiny ?? subject.shiny),
    rarity: subject.rarity || 'common',
  };
}

function cloneExportState(state) {
  const exported = JSON.parse(JSON.stringify(state && typeof state === 'object' ? state : {}));
  if (exported.settings && typeof exported.settings === 'object')
    delete exported.settings.additionalScanFolders;
  const safeKey = (key) => {
    const value = String(key || '');
    return value.length <= 512 && !/[\\/]/.test(value);
  };
  const rowLedger = exported.claimedUsageByRow && typeof exported.claimedUsageByRow === 'object'
    ? exported.claimedUsageByRow
    : {};
  const safeKeys = new Set(Object.keys(rowLedger).filter(safeKey));
  if (Object.keys(rowLedger).length !== safeKeys.size) exported.usageBaselineSet = false;
  if (safeKeys.size) exported.claimedUsageByRow = Object.fromEntries(
    [...safeKeys].map((key) => [key, rowLedger[key]]),
  );
  else delete exported.claimedUsageByRow;
  const metricLedger = exported.claimedUsageMetricsByRow && typeof exported.claimedUsageMetricsByRow === 'object'
    ? exported.claimedUsageMetricsByRow
    : {};
  const safeMetricKeys = [...safeKeys].filter((key) => Object.prototype.hasOwnProperty.call(metricLedger, key));
  if (safeMetricKeys.length) exported.claimedUsageMetricsByRow = Object.fromEntries(
    safeMetricKeys.map((key) => [key, metricLedger[key]]),
  );
  else delete exported.claimedUsageMetricsByRow;
  return exported;
}

function importedState(value, currentFolders = [], gameOptions = {}) {
  const source = value && typeof value === 'object' ? value : null;
  if (!source || !Array.isArray(source.dex) || !source.settings || typeof source.settings !== 'object')
    return null;
  const normalized = new Game({ ...gameOptions, state: source }).state;
  const next = normalized;
  next.inventory = next.inventory && typeof next.inventory === 'object' && !Array.isArray(next.inventory)
    ? next.inventory
    : {};
  next.dex = Array.isArray(next.dex) ? next.dex : [];
  next.collectedFinals = Array.isArray(next.collectedFinals) ? next.collectedFinals : [];
  next.candyGrantTier = next.candyGrantTier && typeof next.candyGrantTier === 'object'
    ? next.candyGrantTier
    : {};
  next.oneTimeGrants = next.oneTimeGrants && typeof next.oneTimeGrants === 'object'
    ? next.oneTimeGrants
    : {};
  next.claimedUsageByRow = next.claimedUsageByRow && typeof next.claimedUsageByRow === 'object'
    ? next.claimedUsageByRow
    : {};
  next.claimedUsageMetricsByRow = next.claimedUsageMetricsByRow && typeof next.claimedUsageMetricsByRow === 'object'
    ? next.claimedUsageMetricsByRow
    : {};
  next.settings = normalizeSettings({
    ...next.settings,
    additionalScanFolders: currentFolders,
  });
  return next;
}

function createLocalService({
  mode = 'web-local',
  platform = process.platform,
  env = process.env,
  home,
  readOnly = mode === 'public-readonly',
  state,
  stateFile = resolveCompanionStateFilePath({ platform, env, home }),
  hermesReader,
  localReader,
  scanReader,
  catalog,
  rng,
  now = () => new Date(),
  persist = !readOnly,
  trayAvailable = false,
  notificationAvailable = false,
  overlayAvailable,
  releaseChecker = () => checkLatestRelease({ currentVersion: packageVersion }),
  onBackgroundRefresh = null,
  backgroundRefreshDelayMs = DEFAULT_BACKGROUND_REFRESH_DELAY_MS,
  stateWriter = saveState,
} = {}) {
  const paths = resolvePlatformPaths({ platform, env, home });
  const pathApi = pathForPlatform(platform);
  const capabilities = buildCapabilities({
    mode,
    platform,
    env,
    readOnly,
    trayAvailable,
    notificationAvailable,
    overlayAvailable,
  });
  const initialState = state ?? loadState(stateFile);
  const gameOptions = { state: initialState, rng, now };
  if (catalog !== undefined) gameOptions.catalog = catalog;
  const game = new Game(gameOptions);
  let liveUsageDisplay = new LiveUsageDisplay(game.state.liveUsageDisplay);
  const readHermes = hermesReader || ((date) => readHermesUsage(
    date,
    resolveHermesDbPath({ platform, env, home }),
  ));
  const readLocal = localReader || ((date) => readLocalProviderUsage(date, { home: paths.home, env }));
  const readScan = scanReader || ((folders, options) => scanAdditionalFolders(folders, options));
  const writeState = typeof stateWriter === 'function' ? stateWriter : saveState;
  let lastUsage = null;
  let lastSnapshot = null;
  let lastRefreshAt = Number(game.state.lastRefreshAt || 0);
  let refreshing = null;
  let backgroundRefreshTimer = null;
  let persistenceTail = Promise.resolve();
  let persistenceKick = null;
  let persistencePending = false;

  function currentDate() {
    const value = now();
    const result = value instanceof Date ? new Date(value) : new Date(value);
    return Number.isNaN(result.getTime()) ? new Date() : result;
  }

  function rawSnapshot(usage = lastUsage, error = null) {
    const active = game.state.active;
    const representative = representativeSnapshot(game);
    const raw = {
      mode,
      readOnly,
      capabilities,
      state: game.state,
      settings: game.state.settings,
      lastRefreshAt,
      wallet: game.wallet,
      balance: BALANCE,
      active: active
        ? {
          ...active,
          name: activeName(game, active),
          threshold: phaseThreshold(active.rarity, active.totalForms, active.stageIndex),
          shinyVisible: Boolean((active.shiny && !active.dittoDisguise) || active.dittoRevealed),
        }
        : null,
      collection: {
        pokedex: buildPokedexEntries({ active, dex: game.state.dex }),
        catchLog: buildCatchLogEntries({ active, dex: game.state.dex }),
      },
      representative,
      egg: {
        progress: eggProgress(game.state.eggUsage),
        remaining: eggTokensToHatch(game.state.eggUsage),
        tier: game.state.eggTier,
        sprite: 'assets/emerald-egg-static.png',
        animatedSprite: 'assets/emerald-egg.webp',
      },
      sprite: spriteUrl(active),
      usage: usage || {},
      limits: {
        officialAvailable: Boolean(usage?.officialAvailable),
        windows: normalizeLimitWindows(usage?.limitWindows),
        hiddenByPreference: Boolean(game.state.settings.keychainOptOut),
      },
    };
    if (error) raw.error = error;
    return raw;
  }

  function safeSnapshot(usage = lastUsage, error = null) {
    return sanitizeSnapshot(rawSnapshot(usage, error), { mode, readOnly, capabilities });
  }

  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const date = currentDate();
      try {
        const [hermes, local, scanned] = await Promise.all([
          readHermes(date),
          readLocal(date),
          readScan(game.state.settings.additionalScanFolders || [], { now: date }),
        ]);
        const rawUsage = mergeUsage(mergeUsage(hermes, local), scanned);
        if (readOnly) {
          lastRefreshAt = date.getTime();
          lastUsage = rawUsage;
          lastSnapshot = safeSnapshot(rawUsage);
          return lastSnapshot;
        }
        game.seedUsageRows(rawUsage.progressionRows || []);
        game.applyUsageRows(rawUsage.progressionRows || []);
        const liveDelta = game.lastUsageDelta?.liveDisplayReady === false
          ? {}
          : (game.lastUsageDelta || {});
        const usage = liveUsageDisplay.apply(rawUsage, liveDelta);
        game.state.liveUsageDisplay = liveUsageDisplay.exportState();
        game.evaluateCandyGrants(normalizeLimitWindows(usage.limitWindows));
        game.state.lastRefreshAt = date.getTime();
        lastRefreshAt = game.state.lastRefreshAt;
        lastUsage = usage;
        if (persist) writeState(stateFile, game.state);
        lastSnapshot = safeSnapshot(usage);
        return lastSnapshot;
      } catch (error) {
        lastSnapshot = safeSnapshot(lastUsage, error);
        return lastSnapshot;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  function scheduleBackgroundRefresh() {
    if (backgroundRefreshTimer) return;
    const requestedDelay = Number(backgroundRefreshDelayMs);
    const delay = Number.isFinite(requestedDelay) && requestedDelay >= 0
      ? requestedDelay
      : DEFAULT_BACKGROUND_REFRESH_DELAY_MS;
    backgroundRefreshTimer = setTimeout(() => {
      backgroundRefreshTimer = null;
      Promise.resolve(refresh()).then((snapshot) => {
        if (typeof onBackgroundRefresh === 'function') onBackgroundRefresh(snapshot);
      }).catch(() => {});
    }, delay);
    if (typeof backgroundRefreshTimer.unref === 'function') backgroundRefreshTimer.unref();
  }

  function scheduleDeferredPersistence() {
    persistencePending = true;
    if (persistenceKick) return;
    persistenceKick = new Promise((resolve) => {
      const handle = setImmediate(() => {
        persistenceKick = null;
        if (persistencePending) {
          persistencePending = false;
          persistenceTail = persistenceTail
            .catch(() => {})
            .then(() => writeState(stateFile, game.state))
            .catch(() => {});
        }
        resolve();
      });
    });
  }

  async function flushPersistence() {
    if (persistenceKick) await persistenceKick;
    await persistenceTail;
    if (persistencePending) {
      scheduleDeferredPersistence();
      await flushPersistence();
    }
  }

  async function executeAction(type, value) {
    if (!actionAllowed(capabilities, type))
      return { ok: false, error: { code: 'ACTION_NOT_ALLOWED', message: 'Action is not allowed' }, snapshot: safeSnapshot() };
    if (type === 'snapshot') return { ok: true, snapshot: await (lastSnapshot || safeSnapshot()) };
    if (type === 'refresh') return { ok: true, snapshot: await refresh() };
    if (type === 'check-update') {
      return { ok: true, update: await releaseChecker(), snapshot: safeSnapshot() };
    }
    if (type === 'export-save') {
      return { ok: true, save: cloneExportState(game.state), snapshot: safeSnapshot() };
    }
    let ok = false;
    if (type === 'buy') ok = game.buyItem(typeof value === 'string' ? value : '');
    if (type === 'candy') ok = game.useRareCandy();
    if (type === 'mint') ok = game.useMint();
    if (type === 'egg') ok = game.buyEgg(value == null ? null : value);
    if ((type === 'setting' || type === 'setting-live') && value && typeof value === 'object') {
      const key = typeof value.key === 'string' ? value.key : '';
      if (WEB_SETTING_KEYS.has(key)) {
        game.updateSetting(key, value.value);
        ok = true;
      }
    }
    if (type === 'add-scan-folder' && value && typeof value.folder === 'string') {
      const folder = value.folder.trim();
      const folders = game.state.settings.additionalScanFolders || [];
      if (folder && folder.length <= 1_024 && pathApi.isAbsolute(folder)) {
        const normalized = pathApi.normalize(folder);
        if (!folders.includes(normalized) && folders.length < 32) {
          game.updateSetting('additionalScanFolders', [...folders, normalized]);
          ok = true;
        }
      }
    }
    if (type === 'clear-scan-folders') {
      game.updateSetting('additionalScanFolders', []);
      ok = true;
    }
    if (type === 'import-save') {
      const candidate = value && typeof value === 'object' && value.state && typeof value.state === 'object'
        ? value.state
        : value;
      const next = importedState(candidate, game.state.settings.additionalScanFolders || [], {
        rng,
        now,
        catalog: game.catalog,
      });
      if (next) {
        game.state = next;
        liveUsageDisplay = new LiveUsageDisplay(game.state.liveUsageDisplay);
        lastUsage = null;
        ok = true;
      }
    }
    if (type === 'pin') {
      const id = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'id')
        ? value.id
        : value;
      ok = game.setRepresentativeSpecies(id);
    }
    if (type === 'grant-one-time' && value && typeof value.key === 'string')
      ok = game.grantOneTimeProgress(value.key, Number(value.delta));
    if (ok && persist && type !== 'candy') writeState(stateFile, game.state);
    if (type === 'candy' && ok) {
      const snapshot = safeSnapshot();
      lastSnapshot = snapshot;
      if (persist) scheduleDeferredPersistence();
      scheduleBackgroundRefresh();
      return { ok, snapshot };
    }
    const snapshot = type === 'setting-live' ? safeSnapshot() : await refresh();
    if (type === 'setting-live') lastSnapshot = snapshot;
    return { ok, snapshot };
  }

  let actionQueue = Promise.resolve();
  function handleAction(type, value) {
    const task = actionQueue.then(
      () => executeAction(type, value),
      () => executeAction(type, value),
    );
    actionQueue = task.catch(() => {});
    return task;
  }

  return {
    stateFile,
    paths,
    game,
    capabilities,
    getCapabilities: () => capabilities,
    getSnapshot: async () => lastSnapshot || safeSnapshot(),
    refresh,
    handleAction,
    flushPersistence,
  };
}

module.exports = {
  createLocalService,
  mergeUsage,
  cloneExportState,
  importedState,
};
