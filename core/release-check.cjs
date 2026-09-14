const RELEASE_URL = 'https://api.github.com/repos/MarkusSela/PokeTokenBarWindows-Lab/releases/latest';

function versionParts(value) {
  const match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)] : [0, 0, 0];
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function platformAssetPattern(platform) {
  if (platform === 'win32') return /\.(?:exe|msi)$/i;
  if (platform === 'linux') return /\.(?:AppImage|deb)$/i;
  if (platform === 'darwin') return /\.(?:dmg|zip)$/i;
  return null;
}

async function checkLatestRelease({
  currentVersion = '0.1.0',
  platform = process.platform,
  fetcher = globalThis.fetch,
  releaseUrl = RELEASE_URL,
  userAgent = 'PokeTokenBarWindows-Lab',
} = {}) {
  if (typeof fetcher !== 'function')
    return {
      ok: false,
      currentVersion: String(currentVersion),
      latestVersion: null,
      updateAvailable: false,
      windowsReleaseAvailable: false,
      platformReleaseAvailable: false,
      url: null,
      assetUrl: null,
      error: 'Update check unavailable',
    };
  try {
    const response = await fetcher(releaseUrl, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': String(userAgent || 'PokeTokenBarWindows-Lab').slice(0, 128),
      },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(8_000) : undefined,
    });
    if (!response?.ok) throw new Error(`HTTP ${response?.status || 0}`);
    const payload = await response.json();
    const latestVersion = String(payload?.tag_name || '').replace(/^v/i, '').trim();
    if (!latestVersion) throw new Error('Missing release version');
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const windowsAsset = assets.find((asset) => /\.(?:exe|msi)$/i.test(String(asset?.name || '')));
    const platformPattern = platformAssetPattern(platform);
    const platformAsset = platformPattern
      ? assets.find((asset) => platformPattern.test(String(asset?.name || '')))
      : null;
    return {
      ok: true,
      currentVersion: String(currentVersion),
      latestVersion,
      updateAvailable: Boolean(
        platformAsset && compareVersions(latestVersion, currentVersion) > 0,
      ),
      windowsReleaseAvailable: Boolean(windowsAsset),
      platformReleaseAvailable: Boolean(platformAsset),
      url: typeof payload.html_url === 'string' ? payload.html_url : null,
      assetUrl: typeof platformAsset?.browser_download_url === 'string'
        ? platformAsset.browser_download_url
        : null,
    };
  } catch {
    return {
      ok: false,
      currentVersion: String(currentVersion),
      latestVersion: null,
      updateAvailable: false,
      windowsReleaseAvailable: false,
      platformReleaseAvailable: false,
      url: null,
      assetUrl: null,
      error: 'Update check unavailable',
    };
  }
}

module.exports = {
  RELEASE_URL,
  versionParts,
  compareVersions,
  platformAssetPattern,
  checkLatestRelease,
};
