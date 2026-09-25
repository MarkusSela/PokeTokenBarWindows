# Evolution and egg rarity policy

PokeTokenBar uses one authoritative rarity for each evolutionary line. The same value drives egg selection and the Pokédex entry for every member of that line.

## Pokédex rarity

`collection.pokedex[].rarity` is the egg-line rarity:

- Bulbasaur, Ivysaur, and Venusaur all inherit the Bulbasaur line's `rare` value;
- every member of a two-stage line inherits that line's `uncommon` value;
- every member of a one-stage line inherits that line's `common` value;
- legendary or mythical lines remain `legendary`.

The Pokédex displays this one value as plain text. It does not display stage rarity and does not add a second `line ...` label or badge. Evolution stage remains internal metadata where progression needs it.

## Egg line rarity

`catalog.lines[].line.rarity` describes the whole evolution line and is the same value exposed as `collection.pokedex[].rarity`. It is the only rarity used to filter eggs. The egg pool contains root entries only; hatching starts from `line.baseId` and never starts from an evolved species.

The default line classification reuses the original pre-Gen-VI egg model from `assets/pokemon-catalog-gen1-5.json`:

- legendary/mythical root: `legendary`;
- capture rate `0–45`: `rare`;
- capture rate `46–120`: `uncommon`;
- capture rate `121–255`: `common`.

This model is based on the species capture-rate metadata, not on the number of evolution stages. It reproduces the historical Gen I–V line table exactly, including Caterpie as `common`. Gen VI–IX use the same capture-rate and legendary/mythical fields from the versioned PokéAPI species data, so the rule remains consistent across the expanded catalog.

This is intentionally independent of the stage currently shown in the Pokédex.

`assets/pokemon-rarity-overrides.json` is the explicit escape hatch for a line whose game design rarity should differ from the source-derived default.

A purchased egg tier accepts lines at that tier or above. For example, an `uncommon` egg can hatch an uncommon, rare, or legendary line, but never a common line. The line rarity remains the same for every species in the selected line.
