# Contributing to PokeTokenBar Windows

Thank you for helping improve the Windows companion. This repository is intentionally separate from the original [PokeTokenBar macOS project](https://github.com/chattymin/PokeTokenBar).

## Before opening an issue or pull request

- Reproduce the behavior with synthetic data where possible.
- Never attach provider logs, Hermes databases, prompts, screenshots from a personal desktop, credentials, API keys, cookies, or exported saves.
- Describe the Windows version, Node.js version, app version, and the smallest reproducible steps.
- Keep changes focused on Windows behavior and preserve the tray-first lifecycle.

## Local setup

```shell
npm ci
npm test
node --check main.cjs
npm run audit:release
```

To build the installer:

```shell
npm run dist
```

The build creates output under `dist/`, which is ignored by Git. Do not commit that directory.

## Development rules

- Keep provider reads read-only and local.
- Never hard-code a user name, home path, database path, prompt, token, cost, or credential.
- Use environment-variable or platform-path resolution for local sources.
- Keep the normal app tray-first. Diagnostic opening must remain opt-in.
- Preserve `skipTaskbar: true` for the compact Home window and floating windows.
- Add or update a regression test before changing behavior.
- Use the existing style and the smallest change that satisfies the test.
- Do not modify the macOS repository from this project.

## Pull requests

A pull request should include:

- a short summary of the user-visible change;
- tests run and their result;
- packaging/audit results when packaging code changed;
- a note if a screenshot was updated, confirming it contains synthetic values only.

See [`SECURITY.md`](SECURITY.md) for reporting sensitive problems and [`RELEASE.md`](RELEASE.md) for release-specific checks.
