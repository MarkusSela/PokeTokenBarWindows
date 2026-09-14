const nodePath = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

function pathForPlatform(platform = process.platform) {
  return platform === 'win32' ? nodePath.win32 : nodePath.posix;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstEnvironmentPath(value, pathApi) {
  return text(value)
    .split(',')
    .map((item) => item.trim())
    .find((item) => item && pathApi.isAbsolute(item)) || '';
}

function absoluteOrFallback(value, fallback, pathApi) {
  const candidate = text(value);
  return candidate && pathApi.isAbsolute(candidate) ? candidate : fallback;
}

function homeDirectory(platform, env, pathApi, explicitHome) {
  const supplied = text(explicitHome);
  if (supplied && pathApi.isAbsolute(supplied)) return supplied;
  const candidates = platform === 'win32'
    ? [env.USERPROFILE, env.HOME]
    : [env.HOME, env.USERPROFILE];
  return candidates
    .map(text)
    .find((candidate) => candidate && pathApi.isAbsolute(candidate))
    || pathApi.normalize(os.homedir());
}

function canonicalPath(value, pathApi, platform) {
  const lexical = pathApi.resolve(value);
  if (platform !== process.platform) return lexical;
  const realpath = fs.realpathSync.native || fs.realpathSync;
  let current = lexical;
  const suffix = [];
  while (true) {
    try {
      return pathApi.resolve(realpath(current), ...suffix);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') return null;
      try {
        if (fs.lstatSync(current).isSymbolicLink()) return null;
      } catch (lstatError) {
        if (lstatError.code !== 'ENOENT' && lstatError.code !== 'ENOTDIR') return null;
      }
      const parent = pathApi.dirname(current);
      if (parent === current) return lexical;
      suffix.unshift(pathApi.basename(current));
      current = parent;
    }
  }
}

function pathsOverlap(left, right, pathApi, platform) {
  const first = canonicalPath(left, pathApi, platform);
  const second = canonicalPath(right, pathApi, platform);
  if (!first || !second) return true;
  const comparable = (value) => platform === 'win32'
    ? pathApi.normalize(value).toLowerCase()
    : pathApi.normalize(value);
  const normalizedFirst = comparable(first);
  const normalizedSecond = comparable(second);
  const firstToSecond = pathApi.relative(normalizedFirst, normalizedSecond);
  const secondToFirst = pathApi.relative(normalizedSecond, normalizedFirst);
  const isContained = (relative) =>
    relative === '' || (!relative.startsWith('..') && !pathApi.isAbsolute(relative));
  return isContained(firstToSecond) || isContained(secondToFirst);
}

function disjointHermesHome({ defaultHermesHome, homeDir, companionDirs, pathApi, platform }) {
  const candidates = [];
  const seen = new Set();
  const addCandidate = (candidate) => {
    const normalized = pathApi.normalize(candidate);
    const key = platform === 'win32' ? normalized.toLowerCase() : normalized;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(normalized);
  };

  addCandidate(defaultHermesHome);
  addCandidate(pathApi.join(pathApi.dirname(defaultHermesHome), '.hermes-data'));
  addCandidate(pathApi.join(homeDir, '.hermes-data'));
  let ancestor = homeDir;
  for (let index = 0; index < 16; index += 1) {
    const parent = pathApi.dirname(ancestor);
    if (parent === ancestor) break;
    addCandidate(pathApi.join(parent, '.hermes'));
    addCandidate(pathApi.join(parent, `${pathApi.basename(homeDir)}-hermes`));
    ancestor = parent;
  }

  const candidate = candidates.find((item) =>
    companionDirs.every((directory) => !pathsOverlap(item, directory, pathApi, platform)));
  if (candidate) return candidate;
  throw new Error('Hermes and companion paths overlap');
}

function resolvePlatformPaths({
  platform = process.platform,
  env = process.env,
  home,
} = {}) {
  const pathApi = pathForPlatform(platform);
  const homeDir = homeDirectory(platform, env, pathApi, home);
  const isLinux = platform === 'linux';
  const isWindows = platform === 'win32';
  const windowsAppData = absoluteOrFallback(
    env.APPDATA,
    pathApi.join(homeDir, 'AppData', 'Roaming'),
    pathApi,
  );
  const windowsLocalAppData = absoluteOrFallback(
    env.LOCALAPPDATA,
    pathApi.join(homeDir, 'AppData', 'Local'),
    pathApi,
  );

  const configHome = isLinux
    ? absoluteOrFallback(env.XDG_CONFIG_HOME, pathApi.join(homeDir, '.config'), pathApi)
    : isWindows
      ? windowsAppData
      : pathApi.join(homeDir, 'Library', 'Application Support');
  const dataHome = isLinux
    ? absoluteOrFallback(env.XDG_DATA_HOME, pathApi.join(homeDir, '.local', 'share'), pathApi)
    : isWindows
      ? windowsLocalAppData
      : pathApi.join(homeDir, 'Library', 'Application Support');
  const stateHome = isLinux
    ? absoluteOrFallback(env.XDG_STATE_HOME, pathApi.join(homeDir, '.local', 'state'), pathApi)
    : isWindows
      ? windowsLocalAppData
      : pathApi.join(homeDir, 'Library', 'Application Support');
  const cacheHome = isLinux
    ? absoluteOrFallback(env.XDG_CACHE_HOME, pathApi.join(homeDir, '.cache'), pathApi)
    : isWindows
      ? windowsLocalAppData
      : pathApi.join(homeDir, 'Library', 'Caches');

  const defaultHermesHome = isWindows
    ? pathApi.join(windowsLocalAppData, 'hermes')
    : pathApi.join(homeDir, '.hermes');
  let hermesHome = absoluteOrFallback(
    firstEnvironmentPath(env.HERMES_HOME, pathApi),
    defaultHermesHome,
    pathApi,
  );
  const companionName = isWindows ? 'PokeTokenBarWindows-Lab' : 'poketokenbar';
  const companionDirs = [
    pathApi.join(configHome, companionName),
    pathApi.join(dataHome, companionName),
    pathApi.join(stateHome, companionName),
    pathApi.join(cacheHome, companionName),
  ];
  if (companionDirs.some((directory) => pathsOverlap(hermesHome, directory, pathApi, platform)))
    hermesHome = disjointHermesHome({ defaultHermesHome, homeDir, companionDirs, pathApi, platform });
  if (companionDirs.some((directory) => pathsOverlap(hermesHome, directory, pathApi, platform)))
    throw new Error('Hermes and companion paths overlap');

  return {
    home: homeDir,
    hermesHome,
    configHome,
    dataHome,
    stateHome,
    cacheHome,
    companionConfigDir: pathApi.join(configHome, companionName),
    companionDataDir: pathApi.join(dataHome, companionName),
    companionStateDir: pathApi.join(stateHome, companionName),
    companionCacheDir: pathApi.join(cacheHome, companionName),
  };
}

function resolveHermesDbPath(options = {}) {
  const paths = resolvePlatformPaths(options);
  const pathApi = pathForPlatform(options.platform || process.platform);
  return paths.hermesHome.toLowerCase().endsWith('.db')
    ? paths.hermesHome
    : pathApi.join(paths.hermesHome, 'state.db');
}

function resolveCompanionStatePath(options = {}) {
  const env = options.env || process.env;
  const pathApi = pathForPlatform(options.platform || process.platform);
  const paths = resolvePlatformPaths(options);
  const requestedFallback = absoluteOrFallback(options.fallbackDir, paths.companionStateDir, pathApi);
  const fallbackDir = pathsOverlap(requestedFallback, paths.hermesHome, pathApi, options.platform || process.platform)
    ? paths.companionStateDir
    : requestedFallback;
  const override = absoluteOrFallback(env.PTB_STATE_DIR, '', pathApi);
  const directory = override && !pathsOverlap(override, paths.hermesHome, pathApi, options.platform || process.platform)
    ? override
    : fallbackDir;
  return pathApi.join(directory, 'companion-state.json');
}

function resolveCompanionStateFilePath(options = {}) {
  const env = options.env || process.env;
  const pathApi = pathForPlatform(options.platform || process.platform);
  const paths = resolvePlatformPaths(options);
  const candidate = text(env.PTB_STATE_FILE);
  if (
    candidate &&
    pathApi.isAbsolute(candidate) &&
    !pathsOverlap(candidate, paths.hermesHome, pathApi, options.platform || process.platform)
  ) return candidate;
  return resolveCompanionStatePath(options);
}

module.exports = {
  pathForPlatform,
  resolvePlatformPaths,
  resolveHermesDbPath,
  resolveCompanionStatePath,
  resolveCompanionStateFilePath,
};
