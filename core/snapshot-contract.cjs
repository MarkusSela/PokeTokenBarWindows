const { normalizeSettings } = require('./settings.cjs');

const SNAPSHOT_SCHEMA_VERSION = 1;
const ALLOWED_MODES = new Set([
  'desktop-local',
  'desktop-demo',
  'web-local',
  'docker-local',
  'public-readonly',
]);
const ALLOWED_RARITIES = new Set(['common', 'uncommon', 'rare', 'legendary']);
const NUMERIC_METRICS = Object.freeze([
  'tokens',
  'cost',
  'sessions',
  'input',
  'output',
  'cacheRead',
  'cacheWrite',
  'reasoning',
]);
const SAFE_SETTING_KEYS = Object.freeze([
  'language',
  'refreshMinutes',
  'limitDisplay',
  'launchAtLogin',
  'menuTodayTokens',
  'menuTodayCost',
  'menuLimitPercent',
  'showFloatingPet',
  'floatingPetSize',

  'notificationsBubbles',
  'updateNotifications',
  'limitAlerts',
  'warningPercent',
  'criticalPercent',
  'companionEvents',
  'providerStatus',
  'keychainOptOut',
]);
const SAFE_INVENTORY_KEYS = new Set(['rareCandy', 'mint', 'shinyCharm']);
const SAFE_CAPABILITY_KEYS = Object.freeze([
  'mode',
  'platform',
  'session',
  'readOnly',
  'home',
  'snapshot',
  'actions',
  'refresh',
  'web',
  'headless',
  'tray',
  'notifications',
  'autostart',
  'floatingPet',

  'companionFallback',
]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, number));
}

function safeInteger(value, fallback = 0) {
  return Math.floor(finiteNumber(value, fallback));
}

function safeText(value, fallback = '') {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, 160) : fallback;
}

function safeNames(names) {
  if (!names || typeof names !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(names)) {
    if (!/^\d+$/.test(key)) continue;
    if (typeof value === 'string') result[key] = safeText(value);
    else if (value && typeof value === 'object') {
      const localized = {};
      for (const language of ['en', 'it']) {
        if (typeof value[language] === 'string') localized[language] = safeText(value[language]);
      }
      if (Object.keys(localized).length) result[key] = localized;
    }
  }
  return result;
}

function safeIds(values) {
  return Array.isArray(values)
    ? values
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 100_000)
    : [];
}

function safeRarity(value) {
  const rarity = safeText(value).toLowerCase();
  return ALLOWED_RARITIES.has(rarity) ? rarity : 'common';
}

function sanitizeActive(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    baseId: safeInteger(value.baseId),
    pathIds: safeIds(value.pathIds),
    plannedPathIds: safeIds(value.plannedPathIds),
    stageIndex: safeInteger(value.stageIndex),
    name: safeText(value.name, null),
    usedAtStage: finiteNumber(value.usedAtStage),
    threshold: finiteNumber(value.threshold),
    rarity: safeRarity(value.rarity),
    totalForms: Math.max(1, safeInteger(value.totalForms, 1)),
    shiny: Boolean(value.shiny),
    shinyVisible: Boolean(value.shinyVisible),
    nature: safeText(value.nature),
    names: safeNames(value.names),
    dittoDisguise: value.dittoDisguise == null ? null : safeInteger(value.dittoDisguise),
    dittoRevealed: Boolean(value.dittoRevealed),
  };
}

function sanitizeDex(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 1000).map((entry, index) => ({
    id: safeText(entry?.id, `entry-${index}`),
    baseId: safeInteger(entry?.baseId),
    finalId: safeInteger(entry?.finalId),
    chainOrder: safeIds(entry?.chainOrder),
    rarity: safeRarity(entry?.rarity),
    caughtAt: safeText(entry?.caughtAt, null),
    shiny: Boolean(entry?.shiny),
    nature: safeText(entry?.nature),
    names: safeNames(entry?.names),
  }));
}

function sanitizeCollection(value) {
  const source = value && typeof value === 'object' ? value : {};
  const pokedex = Array.isArray(source.pokedex)
    ? source.pokedex.slice(0, 2_000).map((entry) => ({
      id: safeInteger(entry?.id),
      name: safeText(entry?.name, `#${safeInteger(entry?.id)}`),
      shiny: Boolean(entry?.shiny),
      isRaising: Boolean(entry?.isRaising),
      rarity: safeRarity(entry?.rarity),
    }))
    : [];
  const catchLog = Array.isArray(source.catchLog)
    ? source.catchLog.slice(0, 1_000).map((entry, index) => ({
      id: safeText(entry?.id, `entry-${index}`),
      kind: entry?.kind === 'active' ? 'active' : 'graduated',
      baseId: safeInteger(entry?.baseId),
      finalId: safeInteger(entry?.finalId),
      chainOrder: safeIds(entry?.chainOrder),
      rarity: safeRarity(entry?.rarity),
      caughtAt: safeText(entry?.caughtAt, null),
      shiny: Boolean(entry?.shiny),
      nature: safeText(entry?.nature),
      names: safeNames(entry?.names),
    }))
    : [];
  return { pokedex, catchLog };
}

function sanitizeInventory(value) {
  const result = {};
  if (!value || typeof value !== 'object') return result;
  for (const key of SAFE_INVENTORY_KEYS) {
    const count = safeInteger(value[key]);
    if (count > 0) result[key] = count;
  }
  return result;
}

function sanitizeSettings(value) {
  const normalized = normalizeSettings(value && typeof value === 'object' ? value : {});
  const result = {};
  for (const key of SAFE_SETTING_KEYS) result[key] = normalized[key];
  result.additionalScanFolderCount = Array.isArray(value?.additionalScanFolders)
    ? Math.min(100, value.additionalScanFolders.length)
    : 0;
  return result;
}

function sanitizeMetric(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(NUMERIC_METRICS.map((key) => [
    key,
    key === 'sessions' ? safeInteger(source[key]) : finiteNumber(source[key]),
  ]));
}

function sanitizeProvider(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    name: safeText(source.name, 'Sconosciuto'),
    ...sanitizeMetric(source),
  };
}

function sanitizeUsage(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    today: sanitizeMetric(source.today),
    week: sanitizeMetric(source.week),
    month: sanitizeMetric(source.month),
    block5h: sanitizeMetric(source.block5h),
    providers: Array.isArray(source.providers) ? source.providers.slice(0, 100).map(sanitizeProvider) : [],
    todayProviders: Array.isArray(source.todayProviders)
      ? source.todayProviders.slice(0, 100).map(sanitizeProvider)
      : [],
    additionalScanRows: safeInteger(source.additionalScanRows),
    additionalScanUnattributedRows: safeInteger(source.additionalScanUnattributedRows),
    additionalScanTimeWindowedRows: safeInteger(source.additionalScanTimeWindowedRows),
    officialAvailable: Boolean(source.officialAvailable),
  };
}

function sanitizeUrl(value) {
  const candidate = safeText(value);
  if (!candidate) return null;
  if (/^assets\/[A-Za-z0-9._/-]+$/.test(candidate) && !candidate.includes('..')) return candidate;
  try {
    const url = new URL(candidate);
    const decodedPath = decodeURIComponent(url.pathname);
    const pathSegments = decodedPath.split('/');
    if (
      url.protocol === 'https:' &&
      url.href === candidate &&
      url.hostname === 'raw.githubusercontent.com' &&
      url.host === 'raw.githubusercontent.com' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      decodedPath.startsWith('/PokeAPI/sprites/') &&
      !decodedPath.includes('\\') &&
      !pathSegments.includes('..')
    ) return url.href;
  } catch {}
  return null;
}

function sanitizeRepresentative(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    id: safeInteger(value.id),
    name: safeText(value.name, `#${safeInteger(value.id)}`),
    shiny: Boolean(value.shiny),
    rarity: safeRarity(value.rarity),
  };
}

function sanitizeBalance(value) {
  const source = value && typeof value === 'object' ? value : {};
  const result = {};
  for (const key of ['freshEgg', 'rareCandy', 'mint', 'shinyCharm']) {
    result[key] = { price: safeInteger(source[key]?.price) };
  }
  const common = result.freshEgg.price;
  const graduation = source.graduation && typeof source.graduation === 'object'
    ? source.graduation
    : {};
  const commonGraduation = Math.max(1, finiteNumber(graduation.common, 1));
  for (const tier of ['uncommon', 'rare']) {
    const multiplier = finiteNumber(graduation[tier], commonGraduation) / commonGraduation;
    result[`${tier}Egg`] = { price: safeInteger(Math.round(common * multiplier)) };
  }
  return result;
}

function sanitizeLimits(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    officialAvailable: Boolean(source.officialAvailable),
    hiddenByPreference: Boolean(source.hiddenByPreference),
    windows: Array.isArray(source.windows)
      ? source.windows.slice(0, 20).map((item, index) => ({
        key: safeText(item?.key, `window-${index}`),
        kind: item?.kind === 'weekly' ? 'weekly' : item?.kind === 'session' ? 'session' : 'session',
        utilization: Math.max(0, Math.min(100, finiteNumber(item?.utilization))),
        provider: safeText(item?.provider),
        resetAt: safeText(item?.resetAt, null),
      }))
      : [],
  };
}

function sanitizeCapabilities(value) {
  const source = value && typeof value === 'object' ? value : {};
  const result = {};
  for (const key of SAFE_CAPABILITY_KEYS) {
    if (key === 'mode' || key === 'platform' || key === 'session' || key === 'companionFallback')
      result[key] = source[key] == null ? null : safeText(source[key], null);
    else result[key] = Boolean(source[key]);
  }
  return result;
}

function sanitizeSnapshot(value, options = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const rawState = source.state && typeof source.state === 'object' ? source.state : {};
  const settings = sanitizeSettings(source.settings ?? rawState.settings);
  const active = sanitizeActive(source.active ?? rawState.active);
  const dex = sanitizeDex(rawState.dex);
  const state = {
    version: safeInteger(rawState.version),
    eggUsage: finiteNumber(rawState.eggUsage),
    eggTier: ALLOWED_RARITIES.has(rawState.eggTier) ? rawState.eggTier : null,
    active,
    dex,
    inventory: sanitizeInventory(rawState.inventory),
    settings,
    representativeSpeciesId: rawState.representativeSpeciesId == null
      ? null
      : safeInteger(rawState.representativeSpeciesId),
    lastRefreshAt: safeInteger(rawState.lastRefreshAt),
  };
  const modeCandidate = options.mode ?? source.mode ?? source.capabilities?.mode;
  const mode = ALLOWED_MODES.has(modeCandidate) ? modeCandidate : 'desktop-local';
  const readOnly = options.readOnly ?? source.readOnly ?? source.capabilities?.readOnly ?? false;
  const result = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    mode,
    readOnly: Boolean(readOnly),
    capabilities: sanitizeCapabilities(options.capabilities ?? source.capabilities),
    lastRefreshAt: safeInteger(source.lastRefreshAt ?? rawState.lastRefreshAt),
    wallet: finiteNumber(source.wallet),
    balance: sanitizeBalance(source.balance),
    settings,
    state,
    active,
    representative: sanitizeRepresentative(source.representative),
    collection: sanitizeCollection(source.collection),
    egg: {
      progress: Math.max(0, Math.min(1, finiteNumber(source.egg?.progress))),
      remaining: finiteNumber(source.egg?.remaining),
      tier: ALLOWED_RARITIES.has(source.egg?.tier) ? source.egg.tier : null,
      sprite: sanitizeUrl(source.egg?.sprite),
      animatedSprite: sanitizeUrl(source.egg?.animatedSprite),
    },
    sprite: sanitizeUrl(source.sprite),
    usage: sanitizeUsage(source.usage),
    limits: sanitizeLimits(source.limits),
  };
  if (source.error) result.error = {
    code: 'REFRESH_FAILED',
    message: 'Usage refresh unavailable',
  };
  return result;
}

module.exports = {
  SNAPSHOT_SCHEMA_VERSION,
  sanitizeSnapshot,
  sanitizeCapabilities,
  sanitizeUrl,
};
