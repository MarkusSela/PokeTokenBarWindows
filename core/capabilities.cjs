const MUTATING_ACTIONS = Object.freeze([
  'buy',
  'candy',
  'mint',
  'egg',
  'setting',
  'setting-live',
  'pin',
  'grant-one-time',
  'add-scan-folder',
  'clear-scan-folders',
  'import-save',
]);

const READ_ACTIONS = new Set(['snapshot', 'refresh', 'check-update', 'export-save']);
const MUTATING_ACTION_SET = new Set(MUTATING_ACTIONS);

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function booleanValue(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const text = normalized(value);
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  return fallback;
}

function detectSession(env = {}) {
  const sessionType = normalized(env.XDG_SESSION_TYPE);
  if (sessionType === 'wayland' || String(env.WAYLAND_DISPLAY || '').trim()) return 'wayland';
  if (sessionType === 'x11' || String(env.DISPLAY || '').trim()) return 'x11';
  return 'unknown';
}

function isDesktopMode(mode) {
  return String(mode || '').startsWith('desktop');
}

function isWebMode(mode) {
  return ['web-local', 'docker-local', 'public-readonly'].includes(mode);
}

function defaultNativeOverlaySupport(platform, session, env) {
  if (platform === 'win32' || platform === 'darwin') return true;
  return platform === 'linux' && session === 'x11' && Boolean(String(env.DISPLAY || '').trim());
}

function buildCapabilities({
  mode = 'desktop-local',
  platform = process.platform,
  env = process.env,
  readOnly,
  trayAvailable,
  notificationAvailable,
  overlayAvailable,
} = {}) {
  const desktop = isDesktopMode(mode);
  const web = isWebMode(mode);
  const session = mode === 'docker-local' ? 'container' : detectSession(env);
  const readOnlyMode = readOnly == null
    ? mode === 'public-readonly'
    : booleanValue(readOnly);
  const nativeOverlay = defaultNativeOverlaySupport(platform, session, env);
  const overlay = desktop && Boolean(
    overlayAvailable == null ? nativeOverlay : overlayAvailable,
  );
  const tray = desktop && Boolean(
    trayAvailable == null
      ? platform !== 'linux' || session === 'x11'
      : trayAvailable,
  );
  const notifications = desktop && Boolean(
    notificationAvailable == null
      ? platform !== 'linux'
      : notificationAvailable,
  );

  return {
    mode,
    platform,
    session,
    readOnly: readOnlyMode,
    home: true,
    snapshot: true,
    actions: !readOnlyMode,
    refresh: true,
    web,
    headless: mode === 'docker-local' || mode === 'public-readonly',
    tray,
    notifications,
    autostart: desktop,
    floatingPet: overlay,

    companionFallback: overlay ? null : 'home',
  };
}

function actionAllowed(capabilities, type) {
  const action = normalized(type);
  if (action === 'export-save' && capabilities?.readOnly) return false;
  if (READ_ACTIONS.has(action)) return Boolean(capabilities?.snapshot);
  return Boolean(capabilities?.actions) && MUTATING_ACTION_SET.has(action);
}

module.exports = {
  MUTATING_ACTIONS,
  READ_ACTIONS,
  detectSession,
  buildCapabilities,
  actionAllowed,
};
