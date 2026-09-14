const { booleanValue, normalizeSettings } = require("./settings.cjs");

const BALANCE = Object.freeze({
  eggHatch: 5_000_000,
  graduation: Object.freeze({
    common: 750_000_000,
    uncommon: 1_875_000_000,
    rare: 3_000_000_000,
    legendary: 6_000_000_000,
  }),
  rareCandy: Object.freeze({
    xp: 100_000_000,
    weeklyGrant: 5,
    price: 500_000_000,
  }),
  mint: Object.freeze({ price: 100_000_000 }),
  shinyCharm: Object.freeze({ price: 3_000_000_000, denominator: 48 }),
  freshEgg: Object.freeze({ price: 1_000_000_000 }),
  pokeDoll: Object.freeze({ price: 250_000_000 }),
});
const NATURES = Object.freeze([
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
]);
const DEFAULT_CATALOG = Object.freeze([
  {
    id: 1,
    captureRate: 45,
    line: {
      baseId: 1,
      pathIds: [1, 2, 3],
      names: { 1: "Bulbasaur", 2: "Ivysaur", 3: "Venusaur" },
      rarity: "rare",
    },
  },
]);

function rarity({ captureRate, legendary = false, mythical = false }) {
  if (legendary || mythical) return "legendary";
  if (captureRate <= 45) return "rare";
  if (captureRate <= 120) return "uncommon";
  return "common";
}
function phaseThreshold(rarityName, totalForms, stageIndex) {
  const k = Math.max(1, totalForms);
  return Math.round(
    (BALANCE.graduation[rarityName] * (stageIndex + 1)) / ((k * (k + 1)) / 2),
  );
}
function normalizedEggUsage(value) {
  return Math.max(0, Number(value) || 0);
}
function eggProgress(usage) {
  return Math.min(1, normalizedEggUsage(usage) / BALANCE.eggHatch);
}
function eggTokensToHatch(usage) {
  return Math.max(0, BALANCE.eggHatch - normalizedEggUsage(usage));
}
function emptyState() {
  return {
    version: 2,
    installBaselineSet: false,
    usedSinceInstall: 0,
    spentTokens: 0,
    eggUsage: 0,
    eggTier: null,
    pendingHatchId: null,
    pokeDollActive: false,
    claimedTodayTokensByProvider: null,
    usageBaselineSet: false,
    claimedUsageByRow: null,
    claimedUsageMetricsByRow: null,
    lastDate: "",
    lastRefreshAt: 0,
    active: null,
    dex: [],
    collectedFinals: [],
    inventory: {},
    candyGrantTier: {},
    candyFeatureSeeded: false,
    oneTimeGrants: {},
    settings: normalizeSettings(),
    language: "en",
    representativeSpeciesId: null,
  };
}
function namesFor(names, id) {
  const value = names?.[id];
  if (typeof value === "string") return { en: value, it: value };
  return value && typeof value === "object" ? value : {};
}
function ownedSpecies(state, id) {
  return Boolean(
    state.active?.pathIds?.includes(id) ||
    state.dex?.some((entry) => entry.chainOrder?.includes(id)),
  );
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback));
}
function integer(value, fallback = 0) {
  return Math.round(finite(value, fallback));
}
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function ids(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 100_000);
}
function normalizedNames(value) {
  const out = {};
  for (const [key, raw] of Object.entries(record(value))) {
    if (typeof raw === "string") out[key] = raw;
    else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const names = {};
      for (const language of ["en", "it"])
        if (typeof raw[language] === "string") names[language] = raw[language];
      if (Object.keys(names).length) out[key] = names;
    }
  }
  return out;
}
function normalizedActive(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const pathIds = ids(value.pathIds);
  if (!pathIds.length) return null;
  const plannedPathIds = ids(value.plannedPathIds);
  const plan = plannedPathIds.length ? plannedPathIds : [...pathIds];
  const stageIndex = Math.max(0, Math.min(pathIds.length - 1, integer(value.stageIndex)));
  const totalForms = Math.max(1, Math.min(plan.length, integer(value.totalForms, plan.length)));
  const baseId = Number(value.baseId);
  return {
    baseId: Number.isInteger(baseId) && baseId >= 1 ? baseId : pathIds[0],
    pathIds,
    plannedPathIds: plan,
    stageIndex,
    usedAtStage: nonNegative(value.usedAtStage),
    rarity: ["common", "uncommon", "rare", "legendary"].includes(value.rarity)
      ? value.rarity
      : "common",
    totalForms,
    shiny: booleanValue(value.shiny),
    nature: typeof value.nature === "string" && value.nature ? value.nature : NATURES[0],
    names: normalizedNames(value.names),
    dittoDisguise: booleanValue(value.dittoDisguise),
    dittoRevealed: booleanValue(value.dittoRevealed),
  };
}
function normalizedDex(value) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const chainOrder = ids(entry.chainOrder);
      const pathOrder = ids(entry.pathIds);
      const legacyOrder = ids([entry.baseId, entry.finalId]);
      const normalizedChainOrder = chainOrder.length
        ? chainOrder
        : pathOrder.length
          ? pathOrder
          : [...new Set(legacyOrder)];
      if (!normalizedChainOrder.length) return null;
      return {
        ...entry,
        id: String(entry.id || `graduated-${normalizedChainOrder[0]}-${normalizedChainOrder.at(-1)}`),
        baseId: normalizedChainOrder[0],
        finalId: normalizedChainOrder.at(-1),
        chainOrder: normalizedChainOrder,
        rarity: ["common", "uncommon", "rare", "legendary"].includes(entry.rarity)
          ? entry.rarity
          : "common",
        caughtAt: typeof entry.caughtAt === "string" ? entry.caughtAt : null,
        shiny: booleanValue(entry.shiny),
        nature: typeof entry.nature === "string" ? entry.nature : NATURES[0],
        names: normalizedNames(entry.names),
      };
    })
    .filter(Boolean);
}
function normalizedNumberMap(value) {
  return Object.fromEntries(
    Object.entries(record(value))
      .map(([key, raw]) => [String(key), nonNegative(raw)])
      .filter(([, number]) => Number.isFinite(number)),
  );
}
function normalizedInventory(value) {
  const out = {};
  for (const kind of ["rareCandy", "mint", "shinyCharm", "pokeDoll"])
    if (Object.prototype.hasOwnProperty.call(record(value), kind))
      out[kind] = integer(nonNegative(value[kind]));
  return out;
}
function normalizedMetrics(value) {
  const metrics = ["tokens", "cost", "input", "output", "cacheRead", "cacheWrite", "reasoning"];
  const out = {};
  for (const [key, raw] of Object.entries(record(value))) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    out[String(key)] = {
      ...(typeof raw.provider === "string" ? { provider: raw.provider } : {}),
      ...Object.fromEntries(metrics.map((metric) => [metric, nonNegative(raw[metric])])),
    };
  }
  return out;
}
function normalizeState(value) {
  const source = record(value);
  const out = { ...emptyState() };
  out.version = 2;
  out.installBaselineSet = booleanValue(source.installBaselineSet);
  out.usedSinceInstall = nonNegative(source.usedSinceInstall);
  out.spentTokens = nonNegative(source.spentTokens);
  out.eggUsage = nonNegative(source.eggUsage);
  out.eggTier = [null, "common", "uncommon", "rare"].includes(source.eggTier)
    ? source.eggTier
    : null;
  out.pendingHatchId = source.pendingHatchId == null ? null : String(source.pendingHatchId);
  out.pokeDollActive = booleanValue(source.pokeDollActive);
  out.claimedTodayTokensByProvider = source.claimedTodayTokensByProvider == null
    ? null
    : normalizedNumberMap(source.claimedTodayTokensByProvider);
  out.usageBaselineSet = booleanValue(source.usageBaselineSet);
  out.claimedUsageByRow = normalizedNumberMap(source.claimedUsageByRow);
  out.claimedUsageMetricsByRow = normalizedMetrics(source.claimedUsageMetricsByRow);
  out.lastDate = typeof source.lastDate === "string" ? source.lastDate : "";
  out.lastRefreshAt = nonNegative(source.lastRefreshAt);
  out.active = normalizedActive(source.active);
  out.dex = normalizedDex(source.dex);
  out.collectedFinals = (Array.isArray(source.collectedFinals) ? source.collectedFinals : [])
    .filter((item) => typeof item === "string" && item.length <= 256);
  out.inventory = normalizedInventory(source.inventory);
  out.candyGrantTier = normalizedNumberMap(source.candyGrantTier);
  out.candyFeatureSeeded = booleanValue(source.candyFeatureSeeded);
  out.oneTimeGrants = Object.fromEntries(
    Object.entries(record(source.oneTimeGrants))
      .filter(([, granted]) => booleanValue(granted))
      .map(([key]) => [String(key), true]),
  );
  out.settings = normalizeSettings(source.settings);
  out.language = typeof source.language === "string" ? source.language : "en";
  const representative = Number(source.representativeSpeciesId);
  out.representativeSpeciesId = Number.isInteger(representative) && representative >= 1
    ? representative
    : null;
  if (source.liveUsageDisplay && typeof source.liveUsageDisplay === "object" && !Array.isArray(source.liveUsageDisplay))
    out.liveUsageDisplay = source.liveUsageDisplay;
  if (source.floatingPetPosition && typeof source.floatingPetPosition === "object") {
    const x = finite(source.floatingPetPosition.x, NaN);
    const y = finite(source.floatingPetPosition.y, NaN);
    if (Number.isFinite(x) && Number.isFinite(y)) out.floatingPetPosition = { x, y };
  }
  return out;
}

class Game {
  static fresh(options = {}) {
    return new Game(options);
  }
  constructor({
    state,
    rng = Math.random,
    now = () => new Date(),
    catalog = DEFAULT_CATALOG,
  } = {}) {
    this.rng = rng;
    this.now = now;
    this.catalog = catalog;
    this.state = normalizeState(state);
  }
  get wallet() {
    return Math.max(0, this.state.usedSinceInstall - this.state.spentTokens);
  }
  itemCount(kind) {
    if (!Object.prototype.hasOwnProperty.call(this.state.inventory, kind)) return 0;
    const count = Number(this.state.inventory[kind]);
    return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  }
  setCatalog(catalog) {
    this.catalog = catalog;
  }
  updateSetting(key, value) {
    this.state.settings = normalizeSettings({
      ...this.state.settings,
      [key]: value,
    });
    return this.state.settings;
  }
  representativeSubject() {
    const id = this.state.representativeSpeciesId;
    if (id == null) {
      const shiny = Boolean(
        (this.state.active?.shiny && !this.state.active?.dittoDisguise) ||
        this.state.active?.dittoRevealed,
      );
      return { speciesId: null, shiny, isShiny: shiny };
    }
    const active = this.state.active?.pathIds?.includes(id)
      ? this.state.active
      : null;
    const entry = this.state.dex?.find((x) => x.chainOrder?.includes(id));
    const source = active || entry;
    const names = namesFor(source?.names, id);
    const shiny = Boolean(
      (active?.shiny && !active?.dittoDisguise) ||
      active?.dittoRevealed ||
      entry?.shiny,
    );
    return {
      speciesId: id,
      shiny,
      isShiny: shiny,
      name: names.en || names.it || `#${id}`,
      rarity: source?.rarity || "common",
    };
  }
  setRepresentativeSpecies(id) {
    if (id == null) {
      this.state.representativeSpeciesId = null;
      return true;
    }
    const value = Number(id);
    if (!Number.isInteger(value) || !ownedSpecies(this.state, value))
      return false;
    this.state.representativeSpeciesId = value;
    return true;
  }
  grantOneTimeProgress(key, delta) {
    if (
      this.state.oneTimeGrants[key] ||
      !this.state.active ||
      !Number.isFinite(delta) ||
      delta <= 0
    )
      return false;
    this.state.oneTimeGrants[key] = true;
    this.applyUsageToActive(Math.round(delta));
    return true;
  }
  applyUsageRows(rows) {
    const metrics = [
      "tokens",
      "cost",
      "input",
      "output",
      "cacheRead",
      "cacheWrite",
      "reasoning",
    ];
    const current = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const key = String(row?.key || "").trim();
      const tokens = Math.max(0, Math.floor(Number(row?.tokens) || 0));
      if (!key) continue;
      const item = current.get(key) || {
        provider: String(row?.provider || "Sconosciuto"),
        tokens: 0,
        cost: 0,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
      };
      item.tokens += tokens;
      for (const metric of metrics.slice(1))
        item[metric] += Math.max(0, Number(row?.[metric]) || 0);
      current.set(key, item);
    }
    const ledger = { ...(this.state.claimedUsageByRow ?? {}) };
    const metricLedger = { ...(this.state.claimedUsageMetricsByRow ?? {}) };
    let metricsMigrated = false;
    const emptyDelta = () =>
      Object.fromEntries([...metrics, "byProvider"].map((key) => [key, key === "byProvider" ? [] : 0]));
    this.lastUsageDelta = emptyDelta();
    if (!this.state.usageBaselineSet) {
      for (const [key, item] of current) ledger[key] = item.tokens;
      for (const [key, item] of current) metricLedger[key] = { ...item };
      this.state.claimedUsageByRow = ledger;
      this.state.claimedUsageMetricsByRow = metricLedger;
      this.state.usageBaselineSet = true;
      return 0;
    }
    const deltaTotals = Object.fromEntries(metrics.map((key) => [key, 0]));
    const byProvider = new Map();
    for (const [key, item] of current) {
      const tokens = item.tokens;
      const previous = Number(ledger[key]);
      const rowDelta = !Number.isFinite(previous)
        ? tokens
        : tokens >= previous
          ? tokens - previous
          : 0;
      const previousMetrics = metricLedger[key];
      if (!previousMetrics && Number.isFinite(previous)) metricsMigrated = true;
      const providerDelta = { name: item.provider };
      for (const metric of metrics) {
        const previousMetric = Number(previousMetrics?.[metric]);
        const metricDelta =
          metric === "tokens"
            ? rowDelta
            : !previousMetrics
              ? Number.isFinite(previous)
                ? 0
                : item[metric]
              : item[metric] >= previousMetric
                ? item[metric] - previousMetric
                : 0;
        deltaTotals[metric] += metricDelta;
        providerDelta[metric] = metricDelta;
      }
      if (rowDelta || Object.values(providerDelta).some((value) => value > 0)) {
        const existing = byProvider.get(item.provider) || { name: item.provider };
        for (const metric of metrics)
          existing[metric] = (existing[metric] || 0) + providerDelta[metric];
        byProvider.set(item.provider, existing);
      }
      ledger[key] = Number.isFinite(previous) ? Math.max(previous, tokens) : tokens;
      metricLedger[key] = {
        ...item,
        ...Object.fromEntries(metrics.map((metric) => {
          const previousMetric = Number(previousMetrics?.[metric]);
          const currentMetric = item[metric];
          return [
            metric,
            Number.isFinite(previousMetric)
              ? Math.max(previousMetric, currentMetric)
              : currentMetric,
          ];
        })),
      };
    }
    this.state.claimedUsageByRow = ledger;
    this.state.claimedUsageMetricsByRow = metricLedger;
    this.lastUsageDelta = {
      ...deltaTotals,
      byProvider: [...byProvider.values()]
        .sort((left, right) => right.tokens - left.tokens),
    };
    if (metricsMigrated) this.lastUsageDelta.liveDisplayReady = false;
    if (deltaTotals.tokens) this.applyUsage(deltaTotals.tokens);
    return deltaTotals.tokens;
  }
  seedUsageRows(rows) {
    const metrics = [
      "tokens",
      "cost",
      "input",
      "output",
      "cacheRead",
      "cacheWrite",
      "reasoning",
    ];
    const ledger = { ...(this.state.claimedUsageByRow ?? {}) };
    const metricLedger = { ...(this.state.claimedUsageMetricsByRow ?? {}) };
    for (const row of Array.isArray(rows) ? rows : []) {
      const key = String(row?.key || "").trim();
      if (!key || Object.prototype.hasOwnProperty.call(ledger, key)) continue;
      const item = Object.fromEntries(
        metrics.map((metric) => [
          metric,
          Math.max(0, Number(row?.[metric]) || 0),
        ]),
      );
      ledger[key] = item.tokens;
      metricLedger[key] = {
        provider: String(row?.provider || "Sconosciuto"),
        ...item,
      };
    }
    this.state.claimedUsageByRow = ledger;
    this.state.claimedUsageMetricsByRow = metricLedger;
    return 0;
  }
  applyProviderTotals(totals, date) {
    if (!this.state.installBaselineSet) {
      this.state.installBaselineSet = true;
      this.state.lastDate = date;
      this.state.claimedTodayTokensByProvider = { ...totals };
      return 0;
    }
    if (!Object.keys(totals).length) return 0;
    let delta = 0,
      ledger = { ...(this.state.claimedTodayTokensByProvider ?? {}) };
    if (date !== this.state.lastDate) {
      for (const p of Object.keys(ledger)) ledger[p] = 0;
      for (const [p, total] of Object.entries(totals)) {
        ledger[p] = total;
        delta += Math.max(0, total);
      }
      this.state.lastDate = date;
    } else
      for (const [p, total] of Object.entries(totals)) {
        if (!Object.prototype.hasOwnProperty.call(ledger, p)) ledger[p] = total;
        else if (total >= ledger[p]) {
          delta += total - ledger[p];
          ledger[p] = total;
        } else ledger[p] = total;
      }
    this.state.claimedTodayTokensByProvider = ledger;
    if (delta) this.applyUsage(delta);
    return delta;
  }
  applyUsage(delta) {
    this.state.usedSinceInstall += delta;
    if (!this.state.active) {
      this.state.eggUsage += delta;
      if (this.state.eggUsage >= BALANCE.eggHatch && this.catalog.length)
        this.hatch();
    } else this.applyUsageToActive(delta);
  }
  eggPool() {
    return this.catalog.filter(
      (x) =>
        !this.state.eggTier ||
        x.captureRate <=
          ({ uncommon: 120, rare: 45 }[this.state.eggTier] ?? 255),
    );
  }
  hasDexSpecies(id) {
    const speciesId = Number(id);
    return this.state.dex.some((entry) => {
      const ids = [
        ...(Array.isArray(entry.chainOrder) ? entry.chainOrder : []),
        ...(Array.isArray(entry.pathIds) ? entry.pathIds : []),
        entry.baseId,
        entry.finalId,
      ].map(Number);
      return ids.includes(speciesId);
    });
  }
  hasUnseenBase() {
    return this.eggPool().some((entry) => !this.hasDexSpecies(entry.id));
  }
  shouldAvoidPokeDollDuplicates(isShiny) {
    return Boolean(this.state.pokeDollActive && !isShiny);
  }
  rollShiny() {
    return this.rng() <
      1 / (this.itemCount("shinyCharm") ? BALANCE.shinyCharm.denominator : 64);
  }
  chooseBase({ avoidOwned = false } = {}) {
    const pool = this.eggPool();
    if (!pool.length) return null;
    const available = avoidOwned
      ? pool.filter((entry) => !this.hasDexSpecies(entry.id))
      : pool;
    const selectionPool = avoidOwned ? available : pool;
    if (!selectionPool.length) return null;
    const weights = selectionPool.map((x) =>
      this.state.collectedFinals.some((key) => key.startsWith(`${x.id}:`))
        ? Math.max(1, Math.floor(x.captureRate / 2))
        : Math.max(1, x.captureRate),
    );
    let roll = this.rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < selectionPool.length; i++) {
      roll -= weights[i];
      if (roll < 0) return selectionPool[i];
    }
    return selectionPool.at(-1);
  }
  hatch() {
    const isShiny = this.rollShiny();
    const pick = this.chooseBase({
      avoidOwned: this.shouldAvoidPokeDollDuplicates(isShiny),
    });
    if (!pick) return false;
    return this.hatchLine(
      pick.line ?? {
        baseId: pick.id,
        pathIds: [pick.id],
        rarity: rarity(pick),
        names: { [pick.id]: `#${pick.id}` },
      },
      { isShiny },
    );
  }
  hatchLine(line, options = {}) {
    const tier = this.state.eggTier;
    const ranks = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
    if (tier && ranks[line.rarity] < ranks[tier]) return false;
    const overflow = Math.max(0, this.state.eggUsage - BALANCE.eggHatch);
    const plan = line.pathIds?.length ? line.pathIds : [line.baseId];
    const isShiny =
      typeof options.isShiny === "boolean" ? options.isShiny : this.rollShiny();
    if (
      this.state.pokeDollActive &&
      !isShiny &&
      this.hasUnseenBase() &&
      this.hasDexSpecies(line.baseId)
    )
      return false;
    const nature = NATURES[Math.floor(this.rng() * NATURES.length)];
    const disguise =
      line.rarity === "common" && plan.length >= 2 && this.rng() < 1 / 128
        ? line.baseId
        : null;
    this.state.active = {
      baseId: line.baseId,
      pathIds: [line.baseId],
      plannedPathIds: plan,
      stageIndex: 0,
      usedAtStage: 0,
      rarity: line.rarity,
      totalForms: plan.length,
      shiny: isShiny,
      nature,
      names: line.names ?? {},
      dittoDisguise: disguise,
      dittoRevealed: false,
    };
    this.state.eggUsage = 0;
    this.state.eggTier = null;
    this.state.pokeDollActive = false;
    if (overflow) this.applyUsageToActive(overflow);
    return true;
  }
  applyUsageToActive(delta) {
    if (!this.state.active) return;
    this.state.active.usedAtStage += delta;
    this.progressActive();
  }
  progressActive() {
    let safety = 50;
    while (this.state.active && safety--) {
      const a = this.state.active,
        threshold = phaseThreshold(a.rarity, a.totalForms, a.stageIndex);
      if (a.usedAtStage < threshold) break;
      if (a.dittoDisguise && !a.dittoRevealed && a.stageIndex === 0) {
        this.revealDitto(threshold);
        continue;
      }
      a.usedAtStage -= threshold;
      if (a.stageIndex >= a.totalForms - 1) {
        this.graduate();
        break;
      }
      a.stageIndex += 1;
      a.pathIds.push(a.plannedPathIds[a.stageIndex]);
    }
  }
  revealDitto(threshold) {
    const a = this.state.active;
    if (!a || a.dittoRevealed) return false;
    const carry = Math.max(0, a.usedAtStage - threshold);
    a.baseId = 132;
    a.pathIds = [132];
    a.plannedPathIds = [132];
    a.stageIndex = 0;
    a.usedAtStage = carry;
    a.rarity = "rare";
    a.totalForms = 1;
    a.dittoRevealed = true;
    a.names = { 132: { en: "Ditto", it: "Ditto" } };
    return true;
  }
  graduate() {
    const a = this.state.active;
    if (!a) return;
    const finalId = a.pathIds.at(-1);
    this.state.collectedFinals = [
      ...new Set([...this.state.collectedFinals, `${a.baseId}:${finalId}`]),
    ];
    this.state.dex.push({
      id: `${this.now().toISOString()}-${a.baseId}-${finalId}`,
      baseId: a.baseId,
      finalId,
      chainOrder: [...a.pathIds],
      rarity: a.rarity,
      caughtAt: this.now().toISOString(),
      shiny: a.shiny,
      nature: a.nature,
      names: a.names,
    });
    this.state.active = null;
    this.state.eggUsage = 0;
  }
  buyItem(kind) {
    const items = {
      rareCandy: BALANCE.rareCandy,
      mint: BALANCE.mint,
      shinyCharm: BALANCE.shinyCharm,
      pokeDoll: BALANCE.pokeDoll,
    };
    const item = Object.prototype.hasOwnProperty.call(items, kind) ? items[kind] : null;
    if (
      !item ||
      this.wallet < item.price ||
      (kind === "shinyCharm" && this.itemCount(kind))
    )
      return false;
    this.state.spentTokens += item.price;
    this.state.inventory[kind] = this.itemCount(kind) + 1;
    return true;
  }
  activatePokeDoll() {
    if (
      this.state.active ||
      !this.state.eggTier ||
      this.state.pokeDollActive ||
      !this.itemCount("pokeDoll")
    )
      return false;
    this.state.inventory.pokeDoll--;
    this.state.pokeDollActive = true;
    return true;
  }
  useRareCandy() {
    if (!this.state.active || !this.itemCount("rareCandy")) return false;
    this.state.inventory.rareCandy--;
    this.applyUsageToActive(BALANCE.rareCandy.xp);
    return true;
  }
  useMint() {
    if (!this.state.active || !this.itemCount("mint")) return false;
    const choices = NATURES.filter((n) => n !== this.state.active.nature);
    this.state.active.nature = choices[Math.floor(this.rng() * choices.length)];
    this.state.inventory.mint--;
    return true;
  }
  buyEgg(tier = null) {
    const allowed = [null, "uncommon", "rare"];
    if (!allowed.includes(tier)) return false;
    const multiplier = tier
        ? BALANCE.graduation[tier] / BALANCE.graduation.common
        : 1,
      price = Math.round(BALANCE.freshEgg.price * multiplier);
    if (this.wallet < price) return false;
    this.state.spentTokens += price;
    this.state.active = null;
    this.state.eggUsage = 0;
    // A purchased basic egg is still a purchased egg: keep an explicit
    // common tier so the UI can distinguish it from the initial free egg.
    this.state.eggTier = tier ?? "common";
    this.state.pendingHatchId = null;
    return true;
  }
  evaluateCandyGrants(windows) {
    if (!this.state.candyFeatureSeeded) {
      for (const w of windows)
        if (w.utilization >= 100) this.state.candyGrantTier[w.key] = 1;
      this.state.candyFeatureSeeded = true;
      return [];
    }
    const grants = [];
    for (const w of windows) {
      if (w.utilization < 100) delete this.state.candyGrantTier[w.key];
      else if (!this.state.candyGrantTier[w.key]) {
        this.state.candyGrantTier[w.key] = 1;
        const count = w.kind === "weekly" ? BALANCE.rareCandy.weeklyGrant : 1;
        this.state.inventory.rareCandy = this.itemCount("rareCandy") + count;
        grants.push({ ...w, count });
      }
    }
    return grants;
  }
}
module.exports = {
  Game,
  BALANCE,
  NATURES,
  rarity,
  phaseThreshold,
  eggProgress,
  eggTokensToHatch,
  emptyState,
  normalizeState,
};
