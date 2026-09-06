# Changelog

All notable changes to PokeTokenBar are documented here.

## [0.1.12] — Poké Doll initial egg and larger Windows icon

- Allow the Poké Doll to arm the initial free egg, whose `eggTier` is intentionally `null`.
- Expose explicit egg-incubation state to the Bag renderer so the activation button updates correctly.
- Remove transparent padding from the supplied tray/taskbar icon and regenerate the multi-resolution Windows ICO.

## [0.1.1] — Mint icon and Poké Doll follow-up

- Finalized the consumable Poké Doll flow in the desktop release documentation.
- Added the supplied local Mint leaf PNG to Shop and Bag in the Electron and web renderers.
- Updated the synthetic Shop and Bag documentation captures to show the supplied Mint icon.
- Aligned the package, lockfile, README, release checklist, and Windows installer metadata on `0.1.1`.
- Rebuilt the local NSIS installer with publishing disabled.

## [0.1.0] — first release

- First packaged desktop release.
- Tray-first startup with a compact Home panel.
- Home and floating windows excluded from the taskbar.
- Added the consumable Poké Doll to Shop and Bag at 250,000,000 tokens.
- Poké Doll filters already-owned base species at the hatch decision point, keeps shiny variants valid, and stays armed if no normal species remains available.
- Updated the Mint item with the supplied local leaf PNG icon.
- Static high-resolution PNG/ICO application icon pipeline.
- Read-only local usage adapters for Hermes and supported AI coding tools.
- Local provider aggregation with explicit unavailable-limit states.
- Pokémon egg, evolution, Pokédex, Catch Log, Shop, Bag, notifications, and Settings flows.
- Optional read-only additional scan folders.
- Export and import of companion state through explicit user actions.
- NSIS installer, release audit, and Windows CI workflow.
