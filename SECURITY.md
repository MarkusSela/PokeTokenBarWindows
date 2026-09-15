# Security and privacy

PokeTokenBar Windows reads local usage information so it can show a companion and usage summary. It is designed not to modify provider data or send usage data to a remote service.

## Do not disclose private data

Never place any of the following in a GitHub issue, pull request, screenshot, release asset, or chat message:

- API keys, OAuth tokens, passwords, cookies, certificates, private keys, or connection strings;
- Hermes `state.db`, `state.db-wal`, `state.db-shm`, provider databases, or raw provider logs;
- prompts, message bodies, project paths, Windows usernames, home directories, or exported companion saves;
- real costs, wallet values, or account-specific quota details unless deliberately redacted.

Use synthetic fixtures and redacted paths such as `C:\\Users\\Demo\\...` when reporting a parser issue.

## Reporting a vulnerability

For a security-sensitive problem, do not open a public issue with the details. Contact the repository owner through a private GitHub channel or create a private security advisory if that feature is enabled for the repository. Include only the minimum reproducible information and do not attach secrets.

For ordinary bugs, use the public issue template after the repository is made public, following the redaction rules above.

## Release guarantees

Before publishing an artifact, maintainers should run:

```shell
npm test
node --check main.cjs
npm run audit:release
npm run dist
node scripts/audit-release.cjs dist/win-unpacked
```

The audit must report no findings. Build output and local state must remain outside the commit and release asset set.
