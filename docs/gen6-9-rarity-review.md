# Gen VI–IX rarity review

## Decision

The historical Gen I–V egg model is capture-rate based, with legendary/mythical flags taking precedence. The same rule was audited against the Gen VI–IX catalog. No additional manual rarity overrides are justified by the reviewed sources, so `assets/pokemon-rarity-overrides.json` remains intentionally empty.

## Reviewed groups

| Group | Review result | Catalog rule |
|---|---|---|
| Starters | Base capture rate is 45, matching the historical starter treatment | `rare` |
| Fossil lines | Low capture rates identify them as rare | `rare` |
| Pseudo-legendary lines | Low capture rates identify them as rare | `rare` |
| Ultra Beasts | They are not classified as Legendary Pokémon by the external reference; do not promote them to `legendary` by assumption | capture-rate rarity, usually `rare` |
| Paradox Pokémon | They are not Legendary Pokémon except Koraidon/Miraidon; do not promote the group wholesale | capture-rate rarity |
| Legendary/Mythical Pokémon | PokéAPI flags are explicit and take precedence over capture rate | `legendary` |

## Examples checked

- Nihilego: capture rate 45, not legendary → `rare`.
- Stakataka: capture rate 30, not legendary → `rare`.
- Great Tusk: capture rate 30, not legendary → `rare`.
- Scream Tail: capture rate 50, not legendary → `uncommon`.
- Roaring Moon and Iron Valiant: capture rate 10, not legendary → `rare`.
- Terapagos: legendary flag → `legendary` despite capture rate 255.
- Pecharunt: mythical flag → `legendary` despite capture rate 3.

## Sources

- PokéAPI species field definitions: https://pokeapi.co/docs/v2
- Ultra Beasts are classified separately from Legendary Pokémon: https://bulbapedia.bulbagarden.net/wiki/Ultra_Beast
- Paradox Pokémon are not Legendary except Koraidon and Miraidon: https://bulbapedia.bulbagarden.net/wiki/Paradox_Pok%C3%A9mon

## Verification

The catalog audit found zero mismatches between all 540 line rarities and the capture-rate/legendary/mythical model. No manual override was added because every reviewed special group is explained by the authoritative metadata without an exception.
