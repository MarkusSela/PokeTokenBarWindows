# Release checklist

This document describes the controlled release process for `MarkusSela/PokeTokenBarWindows`.

## Release principles

- Every tagged version is a complete release with a clear version number.
- The Windows implementation remains separate from the original macOS repository.
- No credentials, database, local state, logs, prompts, caches, or personal paths enter Git or release assets.
- The release contains the installer and its checksum file, not a dump of the development directory.

## 1. Inspect the workspace

```shell
git status --short --untracked-files=all
npm ci
```

Confirm that the working tree contains no `.env`, key or certificate file, database, WAL/SHM sidecar, companion save, log, `node_modules/`, or build output intended for release.

## 2. Run the quality gates

```shell
npm test
node --check main.cjs
npm run audit:release
```

The audit must finish with no findings. If a finding names a personal path or secret, stop and remove it from the source rather than masking it in the report.

## 3. Build the Windows artifacts

Close all running instances of PokeTokenBar before building:

```shell
npm run dist
```

Expected outputs:

- `dist/PokeTokenBar-Windows-Setup-0.1.13.exe`
- `dist/win-unpacked/`

Verify the packaged output:

```shell
node scripts/audit-release.cjs dist/win-unpacked
```

The packaged audit must finish with no findings. Inspect the package file list and confirm that no `companion-state.json`, Hermes database, provider log, `.env`, key, or diagnostic directory is present.

## 4. Create the checksum

In Git Bash:

```shell
sha256sum dist/PokeTokenBar-Windows-Setup-0.1.13.exe > dist/SHA256SUMS.txt
```

In PowerShell, the equivalent is:

```powershell
(Get-FileHash .\\dist\\PokeTokenBar-Windows-Setup-0.1.13.exe -Algorithm SHA256).Hash
```

Do not include a personal machine path in the checksum file.

## 5. Verify the packaged app

Launch the unpacked executable or installer in a clean test profile. Confirm:

- normal startup is tray-first;
- clicking the tray icon opens Home;
- Home does not create a taskbar button;
- closing Home leaves the app resident in the tray;
- the context menu can open, refresh, and quit;
- settings persist only in the app's own local-data directory;
- provider reads remain read-only;
- no diagnostic CDP port or temporary test process remains active;
- no personal values appear in screenshots or release notes.

Use synthetic fixture data for screenshots and restore or remove that profile before the release is committed.

## 6. Prepare the GitHub release

Repository: <https://github.com/MarkusSela/PokeTokenBarWindows>

Release assets:

- `PokeTokenBar-Windows-Setup-0.1.13.exe`
- `SHA256SUMS.txt`

Release metadata:

- tag: `v0.1.13`
- title: `PokeTokenBar v0.1.13`

The release body should contain:

- a short feature summary;
- the exact test and audit result;
- the Windows version and architecture tested;
- the unsigned-installer and SmartScreen warning;
- checksum verification instructions;
- a reminder that release assets contain no personal data.

Do not upload screenshots from a personal desktop, state exports, logs, databases, or credential-bearing files. Documentation screenshots belong in `docs/images/` and must be synthetic.

## 7. Final review

Inspect the repository, release assets, and installer from a second clean view. Confirm that the version number is consistent across `package.json`, `CHANGELOG.md`, the release tag, and the installer name. Confirm that the release contains only the intended files before distributing it.
