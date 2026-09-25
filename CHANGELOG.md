# Changelog

All notable changes to PokeTokenBar are documented here.

## [0.2.0] — Catalogue, new Shop items, and Pokédex layout

### Collection and sprites

- Shipped the full 1,025-species catalogue covering generations I to IX, with per-line rarity metadata.
- Added animated sprites for every species that has an animated source, with an explicit static fallback for the eight species without one.
- Added the sprite-style setting with `Auto` and `Pixel Gen V`, and dedicated artwork per style for eggs and items.
- Rebased rarity on historical capture-rate data for generations I to V and on catalogue metadata for generations VI to IX, with explicit legendary and mythical classes.
- The Pokédex now shows one rarity per evolution line, matching the rarity of the egg that produced it.
- Species names are canonical English names everywhere, independent of the interface language.
- Reworked the Pokédex layout: four entries per row, a star in the top-right corner of every shiny entry, and the page bar pinned above the rarity filters.

### Shop and Bag

- Added three items: **Exp. Candy XL** (adds 250,000,000 progress to the active Pokémon, 1,000,000,000 tokens), **Hatch Incubator** (halves the requirement of the next egg, 250,000,000 tokens) and **Shiny Incense** (raises the next hatch shiny odds to 1/32, or 1/24 with Shiny Charm, 1,500,000,000 tokens).
- Hatch Incubator and Shiny Incense are consumables: they are armed for the next hatch and consumed only when that hatch happens.
- Added local artwork for every item, with pixel and Auto variants, and Auto-style artwork for the shop eggs.
- The Shop is now a three-column card grid with an icon, a short description and a compact price for each item; the full description and the exact price stay available on hover.
- The Bag and the Shop show a badge beside each item name, and Home stacks its badges two per row.

### Poké Doll and hatching

- The Poké Doll stays armed until it actually prevents a duplicate: a shiny hatch (where duplicates remain valid) or an unavailable species pool leaves it armed and unconsumed.
- Fixed the Hatch Incubator so the reduced egg requirement applies to the real hatch path instead of the base requirement.
- Home warns when an egg is incubating while the Poké Doll is not armed, from 40% Pokédex completion onward.
- Hatch messages now report the outcome: a species already in the Pokédex without an armed Doll, a shiny duplicate that leaves the Doll armed, or a consumed Doll.

### Maintenance

- Fixed a miscalculated Pokédex completion state that marked uncatalogued species as common.
- Aligned the package, lockfile, README, and Windows installer metadata on `0.2.0`.
- Rebuilt the local NSIS installer with publishing disabled.

## [0.1.13] — Mint icon and Poké Doll follow-up

- Finalized the consumable Poké Doll flow in the desktop release documentation.
- Added the supplied local Mint leaf PNG to Shop and Bag in the Electron renderer.
- Updated the synthetic Shop and Bag documentation captures to show the supplied Mint icon.
- Aligned the package, lockfile, README, release checklist, and Windows installer metadata on `0.1.13`.
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
