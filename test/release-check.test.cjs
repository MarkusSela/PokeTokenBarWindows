const test = require('node:test');
const assert = require('node:assert/strict');
const { checkLatestRelease, compareVersions } = require('../core/release-check.cjs');

test('release checker compares semantic versions and selects a Windows asset', async () => {
  assert.equal(compareVersions('v1.2.0', '1.1.9') > 0, true);
  const result = await checkLatestRelease({
    currentVersion: '1.0.0',
    platform: 'win32',
    fetcher: async () => ({
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.0',
        html_url: 'https://github.com/example/project/releases/tag/v1.2.0',
        assets: [{ name: 'PokeTokenBar-Setup.exe', browser_download_url: 'https://github.com/example/project/releases/download/v1.2.0/PokeTokenBar-Setup.exe' }],
      }),
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.updateAvailable, true);
  assert.equal(result.windowsReleaseAvailable, true);
  assert.equal(result.latestVersion, '1.2.0');
  assert.match(result.assetUrl, /PokeTokenBar-Setup\.exe$/);
});

test('release checker selects a Linux artifact when running on Linux', async () => {
  const result = await checkLatestRelease({
    currentVersion: '1.0.0',
    platform: 'linux',
    fetcher: async () => ({
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.0',
        html_url: 'https://github.com/example/project/releases/tag/v1.2.0',
        assets: [
          { name: 'PokeTokenBar-Setup.exe', browser_download_url: 'https://github.com/example/project/releases/download/v1.2.0/PokeTokenBar-Setup.exe' },
          { name: 'PokeTokenBar-1.2.0-x64.AppImage', browser_download_url: 'https://github.com/example/project/releases/download/v1.2.0/PokeTokenBar-1.2.0-x64.AppImage' },
        ],
      }),
    }),
  });
  assert.equal(result.platformReleaseAvailable, true);
  assert.equal(result.windowsReleaseAvailable, true);
  assert.match(result.assetUrl, /\.AppImage$/);
  assert.equal(result.updateAvailable, true);
});

test('release checker fails closed without leaking transport errors', async () => {
  const result = await checkLatestRelease({
    fetcher: async () => { throw new Error('private transport detail'); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.updateAvailable, false);
  assert.doesNotMatch(result.error, /private transport detail/);
});
