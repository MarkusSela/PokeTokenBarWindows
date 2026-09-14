const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
  screen,
  dialog,
  shell,
} = require("electron");
const isLinuxPlatform = process.platform === "linux";
app.setName(isLinuxPlatform ? "PokeTokenBar" : "PokeTokenBar Windows Lab");
app.setAppUserModelId(
  isLinuxPlatform ? "com.poketokenbar.desktop" : "com.poketokenbar.windows.lab",
);
const path = require("path");
const {
  Game,
  BALANCE,
  phaseThreshold,
  eggProgress,
  eggTokensToHatch,
} = require("./core/game.cjs");
const { loadState, saveState } = require("./core/state-store.cjs");
const { cloneExportState } = require("./core/local-service.cjs");
const { readHermesUsage } = require("./core/hermes-usage.cjs");
const { readLocalProviderUsage } = require("./core/provider-usage.cjs");
const { scanAdditionalFolders } = require("./core/local-scan.cjs");
const { LiveUsageDisplay } = require("./core/live-usage.cjs");
const { normalizeLimitWindows } = require("./core/provider-limits.cjs");
const { PokeApi, choosePath } = require("./core/pokeapi.cjs");
const { placePopoverBounds } = require("./core/popover-placement.cjs");
const {
  createFloatingPetController,
} = require("./core/floating-pet-controller.cjs");
const { shouldHidePopoverOnBlur } = require("./core/popover-focus-policy.cjs");
const { publishSnapshot } = require("./core/live-update.cjs");
const { clampPopoverHeight, MIN_POPOVER_HEIGHT } = require("./core/popover-size.cjs");
const {
  resolvePlatformPaths,
  resolveCompanionStateFilePath,
} = require("./core/platform-paths.cjs");
const { buildCapabilities } = require("./core/capabilities.cjs");
const { checkLatestRelease: checkLatestReleaseForPlatform } = require("./core/release-check.cjs");
const { syncAutostart } = require("./core/linux-autostart.cjs");
let win,
  tray,
  petWin,
  goldWin,
  petController,
  quitting = false,
  refreshTimer = null,
  deferredRefreshTimer = null,
  deferredCandySaveTimer = null,
  blurTimer = null,
  lastRefreshAt = 0,
  lastUsage = null,
  liveUsageDisplay = null,
  popoverHeight = 600;
const POPOVER_WIDTH = 360;
const CANDY_BACKGROUND_REFRESH_DELAY_MS = 250;
const diagnosticOpen =
  process.argv.includes("--open") || process.env.PTB_OPEN === "1";
const desktopCapabilities = buildCapabilities({
  mode: "desktop-local",
  platform: process.platform,
  env: process.env,
  notificationAvailable: Notification.isSupported?.() !== false,
});
const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) app.quit();
const LAB_DATA_DIR = "PokeTokenBarWindows-Lab";
function stateFile() {
  if (isLinuxPlatform)
    return resolveCompanionStateFilePath({ platform: "linux", env: process.env });
  return resolveCompanionStateFilePath({
    platform: "win32",
    env: process.env,
    fallbackDir: path.join(app.getPath("appData"), LAB_DATA_DIR),
  });
}
function syncLinuxAutostart() {
  if (!isLinuxPlatform) return;
  const paths = resolvePlatformPaths({ platform: "linux", env: process.env });
  syncAutostart({
    configHome: paths.configHome,
    execPath: app.getPath("exe"),
    enabled: Boolean(game?.state?.settings?.launchAtLogin),
  });
}
let game, api;
function icon() {
  const runtimePath = app.isPackaged
    ? path.join(process.resourcesPath, "app-icon.png")
    : path.join(__dirname, "assets", "app-icon.png");
  const image = nativeImage.createFromPath(runtimePath);
  return image.isEmpty() ? nativeImage.createEmpty() : image;
}
function save() {
  saveState(stateFile(), game.state);
}
function activeName(a) {
  const id = a?.pathIds?.[a.stageIndex];
  const value = a?.names?.[id];
  const names =
    typeof value === "string" ? { en: value, it: value } : value || {};
  const preferred = game?.state?.settings?.language === "it" ? "it" : "en";
  return names[preferred] || names.en || names.it || (a ? `#${id}` : null);
}
function representative() {
  const pinned = game?.representativeSubject?.();
  if (!pinned || pinned.speciesId == null) return null;
  return {
    id: pinned.speciesId,
    name: pinned.name || `#${pinned.speciesId}`,
    shiny: Boolean(pinned.isShiny ?? pinned.shiny),
    rarity: pinned.rarity || "common",
  };
}
function petFollowsActive() {
  const a = game?.state?.active;
  if (!a) return false;
  const p = representative();
  return !p || p.id === a.pathIds?.[a.stageIndex];
}
function spriteUrl(a) {
  return a
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${(a.shiny && !a.dittoDisguise) || a.dittoRevealed ? "shiny/" : ""}${a.pathIds[a.stageIndex]}.gif`
    : null;
}
function representativeSprite() {
  const p = representative();
  return p
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${p.shiny ? "shiny/" : ""}${p.id}.gif`
    : null;
}
function compact(value) {
  const n = Number(value || 0);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(".0", "")}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".0", "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(".0", "")}K`;
  return String(n);
}
function menuLabel(en, it) {
  return game?.state?.settings?.language === "it" ? it : en;
}
function rebuildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: menuLabel("Open PokeTokenBar", "Apri PokeTokenBar"),
        click: createWindow,
      },
      {
        label: menuLabel("Refresh tokens", "Aggiorna token"),
        click: () => refresh(),
      },
      { type: "separator" },
      {
        label: menuLabel("Quit", "Esci"),
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}
function updateTrayTooltip(usage) {
  if (!tray) return;
  const settings = game.state.settings || {};
  const parts = [];
  if (settings.menuTodayTokens)
    parts.push(`${compact(usage?.today?.tokens)} token oggi`);
  if (settings.menuTodayCost && Number(usage?.today?.cost) > 0)
    parts.push(`$${Number(usage.today.cost).toFixed(2)}`);
  const p = representative(),
    name = p?.name || activeName(game.state.active);
  tray.setToolTip(
    parts.length
      ? `PokeTokenBar — ${name ? `${name} · ` : ""}${parts.join(" · ")}`
      : `PokeTokenBar${name ? ` — ${name}` : ""}`,
  );
}
async function checkLatestRelease() {
  return checkLatestReleaseForPlatform({
    currentVersion: app.getVersion(),
    platform: process.platform,
  });
}
function validExternalUrl(value) {
  try {
    const url = new URL(String(value));
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function representativeSnapshot() {
  const p = representative();
  return p ? { ...p, sprite: representativeSprite() } : null;
}
function mergeUsage(base, extra) {
  const add = (a, b) => ({
    tokens: (a?.tokens || 0) + (b?.tokens || 0),
    cost: (a?.cost || 0) + (b?.cost || 0),
    sessions: (a?.sessions || 0) + (b?.sessions || 0),
    input: (a?.input || 0) + (b?.input || 0),
    output: (a?.output || 0) + (b?.output || 0),
    cacheRead: (a?.cacheRead || 0) + (b?.cacheRead || 0),
    cacheWrite: (a?.cacheWrite || 0) + (b?.cacheWrite || 0),
    reasoning: (a?.reasoning || 0) + (b?.reasoning || 0),
  });
  const mergeProviders = (left = [], right = []) => {
    const merged = new Map(left.map((item) => [item.name, { ...item }]));
    for (const item of right) {
      const current = merged.get(item.name);
      merged.set(item.name, current ? add(current, item) : { ...item });
    }
    return [...merged.values()].sort((a, b) => b.tokens - a.tokens);
  };
  const providers = mergeProviders(base.providers, extra.providers);
  const extraProgressionRows =
    Array.isArray(extra.progressionRows) && extra.progressionRows.length
      ? extra.progressionRows
      : (extra.providers || []).map((provider) => ({
          key: `scan:${provider.name}`,
          provider: provider.name,
          tokens: Number(provider.tokens || 0),
          cost: Number(provider.cost || 0),
          input: Number(provider.input || 0),
          output: Number(provider.output || 0),
          cacheRead: Number(provider.cacheRead || 0),
          cacheWrite: Number(provider.cacheWrite || 0),
          reasoning: Number(provider.reasoning || 0),
        }));
  const progressionRows = [
    ...(base.progressionRows || []),
    ...extraProgressionRows,
  ];
  return {
    ...base,
    today: add(base.today, extra.today),
    week: add(base.week, extra.week),
    month: add(base.month, extra.month),
    block5h: add(base.block5h, extra.block5h),
    providers,
    todayProviders: mergeProviders(base.todayProviders, extra.todayProviders || extra.providers),
    progressionRows,
    additionalScanRows: extra.totalRows,
    additionalScanUnattributedRows: extra.unattributedRows,
    additionalScanTimeWindowedRows: extra.timeWindowedRows,
    limitWindows: base.limitWindows || extra.limitWindows || [],
  };
}
function snapshot(extra = {}) {
  const a = game.state.active;
  const visibleUsage = extra.usage
    ? (({ progressionRows, ...usage }) => usage)(extra.usage)
    : extra.usage;
  const limitWindows = normalizeLimitWindows(
    extra.usage?.limitWindows ?? lastUsage?.limitWindows,
  );
  return {
    mode: "desktop-local",
    readOnly: false,
    capabilities: desktopCapabilities,
    ...extra,
    ...(extra.usage ? { usage: visibleUsage } : {}),
    state: game.state,
    settings: game.state.settings,
    lastRefreshAt,
    wallet: game.wallet,
    balance: BALANCE,
    active: a
      ? {
          ...a,
          name: activeName(a),
          threshold: phaseThreshold(a.rarity, a.totalForms, a.stageIndex),
          shinyVisible: Boolean(
            (a.shiny && !a.dittoDisguise) || a.dittoRevealed,
          ),
        }
      : null,
    representative: representativeSnapshot(),
    egg: {
      progress: eggProgress(game.state.eggUsage),
      remaining: eggTokensToHatch(game.state.eggUsage),
      tier: game.state.eggTier,
      incubating: !game.state.active,
      sprite: "assets/emerald-egg-static.png",
      animatedSprite: "assets/emerald-egg.webp",
    },
    sprite: spriteUrl(a),
    limits: {
      officialAvailable: Boolean(extra.usage?.officialAvailable),
      windows: limitWindows,
      hiddenByPreference: Boolean(game.state.settings.keychainOptOut),
    },
  };
}
function companionProgressBefore() {
  const active = game.state.active;
  return {
    active: active
      ? { ...active, pathIds: [...(active.pathIds || [])] }
      : null,
    dexLength: Array.isArray(game.state.dex) ? game.state.dex.length : 0,
  };
}
function companionNotice(before) {
  const after = game.state.active;
  const italian = game.state.settings.language === "it";
  if (!before.active && after)
    return italian
      ? `Si è schiuso ${activeName(after)}!`
      : `${activeName(after)} hatched!`;
  if (
    before.active &&
    after &&
    !before.active.dittoRevealed &&
    after.dittoRevealed
  )
    return italian ? "È apparso Ditto!" : "Ditto appeared!";
  if (before.active && after && after.stageIndex > before.active.stageIndex)
    return italian
      ? `${activeName(after)} si è evoluto!`
      : `${activeName(after)} evolved!`;
  if (
    before.active &&
    !after &&
    game.state.dex.length > before.dexLength
  )
    return italian
      ? `Congratulazioni: ${activeName(before.active)} è arrivato alla forma finale!`
      : `Congratulations: ${activeName(before.active)} graduated!`;
  return null;
}
function notifyUser(title, body, preferPet = false) {
  if (!body || !game.state.settings.notificationsBubbles) return;
  if (preferPet && petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("pet-notice", body);
    return;
  }
  if (Notification.isSupported?.() !== false)
    new Notification({ title, body }).show();
}
function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  const minutes = Number(game?.state?.settings?.refreshMinutes || 0);
  if (minutes > 0) refreshTimer = setInterval(refresh, minutes * 60_000);
}
function scheduleDeferredRefresh(effect = null) {
  if (deferredRefreshTimer) return;
  deferredRefreshTimer = setTimeout(() => {
    deferredRefreshTimer = null;
    refresh(effect);
  }, CANDY_BACKGROUND_REFRESH_DELAY_MS);
  if (typeof deferredRefreshTimer.unref === "function") deferredRefreshTimer.unref();
}
function scheduleDeferredCandySave() {
  if (deferredCandySaveTimer) return;
  deferredCandySaveTimer = setImmediate(() => {
    deferredCandySaveTimer = null;
    save();
  });
}
async function refresh(effect = null) {
  try {
    const before = companionProgressBefore();
    const hermes = await readHermesUsage(),
      localProviders = await readLocalProviderUsage(),
      providerUsage = mergeUsage(hermes, localProviders);
    game.seedUsageRows(localProviders.progressionRows);
    const rawUsage = mergeUsage(
        providerUsage,
        await scanAdditionalFolders(game.state.settings.additionalScanFolders),
      );
    game.applyUsageRows(rawUsage.progressionRows || []);
    const liveUsageDelta = game.lastUsageDelta.liveDisplayReady === false
      ? {}
      : game.lastUsageDelta;
    const usage = liveUsageDisplay.apply(rawUsage, liveUsageDelta);
    game.state.liveUsageDisplay = liveUsageDisplay.exportState();
    const grants = game.evaluateCandyGrants(
      normalizeLimitWindows(usage.limitWindows),
    );
    if (grants.length && game.state.settings.limitAlerts)
      notifyUser(
        "PokeTokenBar",
        `Limit reward: ${grants.reduce((sum, item) => sum + item.count, 0)} Rare Candy`,
      );
    if (!game.state.active && game.state.eggUsage >= BALANCE.eggHatch) {
      api ??= new PokeApi(path.join(app.getPath("userData"), "pokeapi-cache"));
      game.setCatalog(await api.baseIndex());
      const isShiny = game.rollShiny();
      const base = game.chooseBase({
        avoidOwned: game.shouldAvoidPokeDollDuplicates(isShiny),
      });
      if (base) {
        const line = choosePath(
          await api.line(base.id),
          game.state.collectedFinals,
          game.rng,
        );
        game.hatchLine(line, { isShiny });
      }
      game.setCatalog([]);
    }
    const notice = companionNotice(before);
    if (notice && game.state.settings.companionEvents)
      notifyUser("PokeTokenBar", notice, true);
    lastRefreshAt = Date.now();
    game.state.lastRefreshAt = lastRefreshAt;
    lastUsage = usage;
    save();
    updateTrayTooltip(usage);
    syncFloatingPet();
    const evolved = Boolean(
      before.active &&
      game.state.active &&
      game.state.active.stageIndex > before.active.stageIndex,
    );
    if (petFollowsActive() && (evolved || effect === "sparkle") && petWin && !petWin.isDestroyed())
      petWin.webContents.send("pet-effect", "sparkle");
    const result = snapshot({ usage });
    publishSnapshot(win, result);
    return result;
  } catch (error) {
    const result = snapshot({ error: error.message });
    publishSnapshot(win, result);
    return result;
  }
}
function workAreaForBounds(bounds) {
  try {
    return screen.getDisplayMatching(bounds).workArea;
  } catch {
    return screen.getPrimaryDisplay().workArea;
  }
}
function virtualWorkArea() {
  const displays = screen.getAllDisplays();
  const left = Math.min(...displays.map((display) => display.bounds.x));
  const top = Math.min(...displays.map((display) => display.bounds.y));
  const right = Math.max(
    ...displays.map((display) => display.bounds.x + display.bounds.width),
  );
  const bottom = Math.max(
    ...displays.map((display) => display.bounds.y + display.bounds.height),
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
}
function placePopover() {
  let bounds = {
    x: screen.getPrimaryDisplay().workArea.x + screen.getPrimaryDisplay().workArea.width - 24,
    y: screen.getPrimaryDisplay().workArea.y + screen.getPrimaryDisplay().workArea.height - 24,
    width: 16,
    height: 16,
  };
  try {
    const actual = tray?.getBounds?.();
    if (actual) bounds = actual;
  } catch {}
  const popup = placePopoverBounds(
    bounds,
    workAreaForBounds(bounds),
    POPOVER_WIDTH,
    popoverHeight,
  );
  win.setBounds(popup);
}
function resizePopoverHeight(requestedHeight) {
  if (!win || win.isDestroyed()) return false;
  const area = workAreaForBounds(win.getBounds());
  const next = clampPopoverHeight(requestedHeight, area.height - 16);
  if (next === popoverHeight) return false;
  popoverHeight = next;
  win.setSize(POPOVER_WIDTH, popoverHeight, false);
  placePopover();
  return true;
}
function resetPopoverHome() {
  if (win && !win.isDestroyed()) win.webContents.send("popover-reset-home");
}
function hidePopover() {
  resetPopoverHome();
  if (win && !win.isDestroyed()) {
    win.setSkipTaskbar(true);
    win.hide();
  }
}
function createWindow() {
  if (win && win.isDestroyed()) win = null;
  if (win) {
    placePopover();
    win.show();
    win.focus();
    win.webContents.send("popover-opened");
    return;
  }
  win = new BrowserWindow({
    width: 360,
    height: 600,
    icon: icon(),
    show: false,
    frame: false,
    skipTaskbar: Boolean(desktopCapabilities.tray),
    resizable: false,
    hasShadow: true,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile("index.html");
  win.once("ready-to-show", () => {
    placePopover();
    win.show();
    win.focus();
    win.webContents.send("popover-opened");
  });
  win.on("blur", () => {
    if (!desktopCapabilities.tray) return;
    clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      const hide = shouldHidePopoverOnBlur({
        quitting,
        focused: win.isFocused(),
        cursor: screen.getCursorScreenPoint(),
        bounds: win.getBounds(),
      });
      if (hide) hidePopover();
    }, 150);
  });
  win.on("focus", () => {
    clearTimeout(blurTimer);
    blurTimer = null;
  });
  win.on("close", (event) => {
    if (!quitting && desktopCapabilities.tray) {
      event.preventDefault();
      hidePopover();
    }
  });
  win.on("closed", () => {
    win = null;
  });
}
function placeFloatingPet() {
  if (!petWin || petWin.isDestroyed()) return;
  const size = Number(game?.state?.settings?.floatingPetSize || 96);
  const saved = game?.state?.floatingPetPosition;
  const area = workAreaForBounds(
    Number.isFinite(saved?.x) && Number.isFinite(saved?.y)
      ? { x: saved.x, y: saved.y, width: size, height: size + 28 }
      : screen.getPrimaryDisplay().workArea,
  );
  const minimumX = area.x,
    minimumY = area.y,
    maximumX = area.x + area.width - size,
    maximumY = area.y + area.height - size - 28;
  const x = Math.max(
    minimumX,
    Math.min(
      maximumX,
      Number.isFinite(saved?.x) ? saved.x : maximumX - 24,
    ),
  );
  const y = Math.max(
    minimumY,
    Math.min(
      maximumY,
      Number.isFinite(saved?.y) ? saved.y : maximumY - 24,
    ),
  );
  petWin.setPosition(Math.round(x), Math.round(y));
}
function petData() {
  const p = representative(),
    a = game.state.active;
  return {
    name: p?.name || activeName(a) || "Egg",
    sprite: p?.sprite || representativeSprite() || spriteUrl(a) || "assets/emerald-egg-static.png",
    tokens: lastUsage?.today?.tokens ?? 0,
    egg: a ? null : {
      progress: eggProgress(game.state.eggUsage),
      tier: game.state.eggTier,
    },
    shiny: Boolean(
      p?.shiny || (a?.shiny && !a?.dittoDisguise) || a?.dittoRevealed,
    ),
  };
}
function createFloatingPet() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.show();
    petWin.webContents.send("pet-updated", petData());
    return;
  }
  if (petWin?.isDestroyed()) {
    petWin = null;
    petController?.cancelDrag();
    petController = null;
  }
  const size = Number(game?.state?.settings?.floatingPetSize || 96);
  const created = new BrowserWindow({
    width: size,
    height: size + 28,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  petWin = created;
  petController = createFloatingPetController({
    window: created,
    savePosition: (position) => {
      game.state.floatingPetPosition = position;
      save();
    },
  });
  created.loadFile("floating.html");
  created.once("ready-to-show", () => {
    if (created.isDestroyed()) return;
    petController?.setSize(size);
    placeFloatingPet();
    created.show();
    created.webContents.send("pet-updated", petData());
  });
  created.on("closed", () => {
    if (petWin === created) petWin = null;
    if (petController && petWin === null) petController.cancelDrag();
    if (petWin === null) petController = null;
  });
}
function syncFloatingPet() {
  if (!desktopCapabilities.floatingPet) {
    const closing = petWin;
    petWin = null;
    petController?.cancelDrag();
    petController = null;
    closing?.close();
    return;
  }
  if (!game?.state?.settings?.showFloatingPet) {
    const closing = petWin;
    petWin = null;
    petController?.cancelDrag();
    petController = null;
    closing?.close();
    return;
  }
  if (!petWin || petWin.isDestroyed()) createFloatingPet();
  else {
    petWin.show();
    petWin.webContents.send("pet-updated", petData());
  }
}
function goldConfig() {
  return {
    enabled: Boolean(game?.state?.settings?.showGoldWalking),
    size: Number(game?.state?.settings?.goldWalkingSize || 76),
  };
}
function goldOverlayBounds() {
  const area = virtualWorkArea();
  return { x: area.x, y: area.y, width: area.width, height: area.height };
}
function createGoldWalkingWindow() {
  if (goldWin && !goldWin.isDestroyed()) return;
  const created = new BrowserWindow({
    ...goldOverlayBounds(),
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  created.setIgnoreMouseEvents(true, { forward: true });
  goldWin = created;
  created.loadFile("gold.html");
  created.once("ready-to-show", () => {
    if (created.isDestroyed()) return;
    created.setBounds(goldOverlayBounds());
    created.webContents.send("gold-config", goldConfig());
    if (game?.state?.settings?.showGoldWalking) created.showInactive();
  });
  created.on("closed", () => {
    if (goldWin === created) goldWin = null;
  });
}
function syncGoldWalking() {
  if (isLinuxPlatform) return;
  const enabled = Boolean(game?.state?.settings?.showGoldWalking);
  if (!enabled) {
    if (goldWin && !goldWin.isDestroyed()) {
      goldWin.webContents.send("gold-config", goldConfig());
      goldWin.hide();
    }
    return;
  }
  createGoldWalkingWindow();
  if (goldWin && !goldWin.isDestroyed()) {
    goldWin.setBounds(goldOverlayBounds());
    goldWin.webContents.send("gold-config", goldConfig());
    goldWin.showInactive();
  }
}
ipcMain.on("pet-drag-start", (_event, { x, y }) =>
  petController?.beginDrag(x, y),
);
ipcMain.on("pet-move", (_event, { x, y }) => petController?.moveDrag(x, y));
ipcMain.on("pet-drag-end", (_event, { x, y }) => petController?.endDrag(x, y));
ipcMain.on("pet-open", () => createWindow());
ipcMain.on("pet-context", () => {
  if (!petWin) return;
  Menu.buildFromTemplate([
    {
      label: menuLabel("Open PokeTokenBar", "Apri PokeTokenBar"),
      click: createWindow,
    },
    {
      label: menuLabel("Hide floating pet", "Nascondi pet flottante"),
      click: () => {
        game.updateSetting("showFloatingPet", false);
        save();
        syncFloatingPet();
      },
    },
    { type: "separator" },
    {
      label: menuLabel("Quit", "Esci"),
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]).popup({ window: petWin });
});
app.on("second-instance", () => createWindow());
app.whenReady().then(() => {
  game = new Game({ state: loadState(stateFile()), catalog: [] });
  liveUsageDisplay = new LiveUsageDisplay(game.state.liveUsageDisplay);
  lastRefreshAt = Number(game.state.lastRefreshAt || 0);
  if (isLinuxPlatform) syncLinuxAutostart();
  else
    app.setLoginItemSettings({
      openAtLogin: Boolean(game.state.settings.launchAtLogin),
    });
  if (desktopCapabilities.tray) {
    try {
      tray = new Tray(icon());
      tray.setToolTip("PokeTokenBar");
      tray.on("click", () =>
        win?.isVisible() ? hidePopover() : createWindow(),
      );
    } catch {
      tray = null;
      desktopCapabilities.tray = false;
      desktopCapabilities.companionFallback = "home";
    }
  }
  const realignDisplayWindows = () => {
    if (win && !win.isDestroyed() && win.isVisible()) placePopover();
    if (petWin && !petWin.isDestroyed()) placeFloatingPet();
    if (goldWin && !goldWin.isDestroyed())
      goldWin.setBounds(goldOverlayBounds());
  };
  for (const event of [
    "display-added",
    "display-removed",
    "display-metrics-changed",
  ])
    screen.on(event, realignDisplayWindows);
  rebuildTrayMenu();
  syncGoldWalking();
  ipcMain.on("popover-content-height", (_event, height) => {
    resizePopoverHeight(height);
  });
  ipcMain.handle("snapshot", refresh);
  ipcMain.handle("action", async (_, { type, value }) => {
    let ok = false;
    if (type === "buy") ok = game.buyItem(value);
    if (type === "pokedoll") ok = game.activatePokeDoll();
    if (type === "candy") ok = game.useRareCandy();
    if (type === "mint") ok = game.useMint();
    if (type === "egg") ok = game.buyEgg(value ?? null);
    if (type === "setting-live" && value && typeof value.key === "string") {
      game.updateSetting(value.key, value.value);
      if (value.key === "floatingPetSize" && petWin && !petWin.isDestroyed()) {
        petController?.setSize(game.state.settings.floatingPetSize);
        placeFloatingPet();
      }
      if (value.key === "showGoldWalking" || value.key === "goldWalkingSize")
        syncGoldWalking();
      save();
      return { ok: true };
    }
    if (type === "setting" && value && typeof value.key === "string") {
      game.updateSetting(value.key, value.value);
      if (value.key === "launchAtLogin")
        if (isLinuxPlatform) syncLinuxAutostart();
        else
          app.setLoginItemSettings({
            openAtLogin: game.state.settings.launchAtLogin,
          });
      if (value.key === "language") rebuildTrayMenu();
      if (value.key === "floatingPetSize" && petWin && !petWin.isDestroyed()) {
        petController?.setSize(game.state.settings.floatingPetSize);
        placeFloatingPet();
      }
      scheduleRefresh();
      syncFloatingPet();
      syncGoldWalking();
      ok = true;
    }
    if (type === "check-update") {
      return { ...snapshot(), update: await checkLatestRelease(), ok: true };
    }
    if (type === "open-external") {
      const url = validExternalUrl(value);
      if (!url) return { ...snapshot(), ok: false, error: "Invalid external URL" };
      await shell.openExternal(url);
      return { ...snapshot(), ok: true };
    }
    if (type === "choose-scan-folders") {
      const result = await dialog.showOpenDialog(win, {
        title: "Add read-only usage folder",
        properties: ["openDirectory", "multiSelections"],
      });
      if (result.canceled) return { ...snapshot(), ok: false };
      game.updateSetting("additionalScanFolders", [
        ...new Set([
          ...(game.state.settings.additionalScanFolders || []),
          ...result.filePaths,
        ]),
      ]);
      save();
      return { ...(await refresh()), ok: true };
    }
    if (type === "clear-scan-folders") {
      game.updateSetting("additionalScanFolders", []);
      save();
      return { ...(await refresh()), ok: true };
    }
    if (type === "pin") {
      const requestedId =
        value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "id")
          ? value.id
          : value;
      ok = game.setRepresentativeSpecies(requestedId);
      if (ok) {
        save();
        updateTrayTooltip(lastUsage);
        syncFloatingPet();
      }
    }
    if (type === "grant-one-time" && value?.key)
      ok = game.grantOneTimeProgress(value.key, value.delta);
    if (type === "export-save") {
      const result = await dialog.showSaveDialog(win, {
        title: "Export PokeTokenBar save",
        defaultPath: "poketokenbar-save.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePath)
        return { ...snapshot(), ok: false };
      saveState(result.filePath, cloneExportState(game.state));
      return { ...snapshot(), ok: true };
    }
    if (type === "import-save") {
      const result = await dialog.showOpenDialog(win, {
        title: "Import PokeTokenBar save",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePaths[0])
        return { ...snapshot(), ok: false };
      const imported = loadState(result.filePaths[0]);
      if (
        !imported ||
        typeof imported !== "object" ||
        (!imported.active &&
          !Array.isArray(imported.dex) &&
          !imported.inventory)
      )
        return { ...snapshot(), ok: false, error: "Invalid companion save" };
      game = new Game({ state: imported, catalog: [] });
      liveUsageDisplay = new LiveUsageDisplay(game.state.liveUsageDisplay);
      syncGoldWalking();
      save();
      scheduleRefresh();
      return { ...(await refresh()), ok: true };
    }
    if (type === "quit") {
      quitting = true;
      app.quit();
      return { ...snapshot(), ok: true };
    }
    if (ok && type !== "candy") save();
    if (ok && type === "candy") {
      scheduleDeferredCandySave();
      syncFloatingPet();
      scheduleDeferredRefresh("sparkle");
      return { ...snapshot(), ok };
    }
    const result = await refresh(
      ok && (type === "mint" || type === "candy") ? "sparkle" : null,
    );
    if (ok && type === "candy") syncFloatingPet();
    return { ...result, ok };
  });
  scheduleRefresh();
  refresh();
  if (game.state.settings.updateNotifications)
    checkLatestRelease().then((update) => {
      if (update.updateAvailable)
        notifyUser(
          "PokeTokenBar update",
          `PokeTokenBar release ${update.latestVersion} is available.`,
        );
    });
  if (diagnosticOpen || !tray) createWindow();
});
app.on("window-all-closed", (e) => {
  if (desktopCapabilities.tray) e.preventDefault();
  else quitting = true;
});
app.on("before-quit", () => {
  quitting = true;
  if (refreshTimer) clearInterval(refreshTimer);
  if (deferredCandySaveTimer) {
    clearImmediate(deferredCandySaveTimer);
    deferredCandySaveTimer = null;
    if (game) save();
  }
  if (goldWin && !goldWin.isDestroyed()) goldWin.destroy();
});
