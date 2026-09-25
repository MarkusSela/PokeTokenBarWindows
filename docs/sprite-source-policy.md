# Sprite source policy

**Status: technical evidence complete; redistribution gate blocked pending rights decision**

This policy separates three questions that must not be conflated:

1. can a URL be resolved and decoded;
2. does the source map to the requested species/form and shiny state;
3. may the bytes be redistributed inside the Electron package.

A public repository, an HTTP 200 response, or an open-source code license answers none of those questions by itself.

## Versioned source order

The catalog records a source revision and a `licenseRef` for every candidate. The following order is the project policy, not the incidental order of JSON keys:

1. **Showdown animated** — technical online candidate only while the sprite-specific permission remains unresolved. Do not package it.
2. **PokeAPI game-version assets** — prefer the requested versioned style when the exact animated variant is present and verified. The current audit pinned `PokeAPI/sprites` master to `2ecb4eeacd5a1718621fc30f12772e3f60d830b9` using a read-only `git ls-remote`. Gen V black-and-white animated files are separate normal/shiny candidates.
3. **PokeAPI default/static assets** — retain exact entries for audit and rights tracking, but runtime `auto` and `pixel-gen5` never select them.
4. **Stable local asset** — retain only as recorded package coverage; a static local asset is not a runtime Pokémon-sprite fallback.

`auto` and `pixel-gen5` filter the chain to `animated: true` before any network or local load. If no animated candidate exists, the resolver returns the explicit local placeholder; it never silently displays a fixed sprite. `pixel-gen5` puts verified animated Gen V candidates before the remaining animated chain. It does not mean `speciesId <= 649`, and it does not convert a static or missing asset into an animated one.

## Verified online animated overrides

`assets/animated-sprite-overrides.json` is a small, reproducible metadata manifest for six targeted Showdown `xyani` candidates: Chespin (650), Sprigatito (906), and Annihilape (979), each in normal and shiny form. The URLs were individually fetched and decoded as multi-frame GIFs with distinct frame hashes; the visual probe is recorded outside the package by the N03 evidence path in that manifest.

These overrides are online technical candidates only. They retain `licenseRef: showdown-sprites-rights-pending`, `packageAllowed: false`, and no local bytes. The catalog builder validates the exact variant key and candidate fields, prepends them to the PokeAPI metadata for runtime resolution, and includes the manifest reference in the catalog source digest. Offline mode therefore continues to return an explicit placeholder for these species rather than packaging or selecting static art.

## Provider and rights matrix

| Provider | Technical evidence | Variant/coverage notes | Rights decision for this package |
|---|---|---|---|
| PokeAPI API v2 | Read-only GET API, pagination and local-cache guidance are documented.[3] | Suitable for metadata and source mapping; API openness is not an image license. | **Metadata allowed; image packaging not approved by this audit.** |
| `PokeAPI/sprites` at `2ecb4ee...` | README documents default sprites, Gen V normal/shiny/animated, Gen VI–IX paths and attribution.[1] | README explicitly distinguishes official and custom later-generation B&W sprites; exact form entries must be read from API data.[1] | **Blocked for unconditional packaging.** `LICENCE.txt` says image contents are Copyright The Pokémon Company while the repository is CC0, and says trademark/third-party clearance is not granted.[2] |
| Pokémon Showdown / Smogon sprites | `xyani/charizard.gif` decoded as GIF with 47 frames; `gen5/charizard.png` decoded as PNG. | Form slug `charizard-mega-x.gif` returned HTTP 404 in the audit; a failed lookup is not a candidate. | **Do not package.** Smogon says MIT covers code, while sprites belong to Nintendo/Game Freak/The Pokémon Company and community-created sprite licensing is still being determined; it asks users to talk to them first.[6] |
| Local project-owned assets | No approved Pokémon sprite set was identified in the workspace. | Synthetic fixture paths are tests only and contain no real bytes. | **Coverage unavailable.** Do not substitute invented or similarly named art. |

The PokeAPI license text also says no trademark or patent rights are waived and disclaims responsibility for clearing rights of other persons.[2] The policy therefore does not treat CC0 as a sublicense of Pokémon Company images, trademarks, or community contributions.

## Mapping and sample evidence

The audit used 17 explicit requests, not a bulk mirror. The machine-readable record is `agent-evidence/T04/sample-results.json`; downloaded bytes are confined to `agent-evidence/T04/samples/`.

- PokeAPI Gen I, Gen V normal/shiny, Gen VI, Gen VII, Gen VIII icon, Gen IX, Ditto, post-Gen-V static, and suffix-form samples returned HTTP 200 and decoded as PNG.
- PokeAPI Gen V `animated/25.gif` and `animated/shiny/25.gif` both returned HTTP 200, decoded as GIFs with 58 frames, and had distinct SHA-256 values.
- Showdown `xyani/charizard.gif` returned HTTP 200 and decoded to 47 frames; the exact sample URL is recorded in the ledger.[8] This is technical animation evidence, not a rights clearance.
- The pinned PokeAPI Gen V URL used for the normal sample is recorded in the ledger.[7]
- A PokeAPI `pokemon-form/10001` response maps variant ID `10001` to Pokémon/species ID `201`, form `b`, `is_default: false`, and sprite `201-b.png`.[4] The resolver must use that mapping, never assume that the variant ID is the species ID.
- The PokeAPI `mr-mime` response preserves the hyphenated API name `mr-mime` and ID `122`.[5] Names with punctuation or suffixes must be sourced from API identifiers and form mappings, not translated display labels.
- A successful response with one decoded frame is recorded as static. It is not claimed to be animated.
- The sample audit recorded HTTP status, response MIME, byte count, final URL, SHA-256, decoder result, dimensions and frame count. A 200 HTML response, missing MIME, failed decode, or unexpected redirect is rejected.

The current PokeAPI sprite repository README says it hosts sprite images and lists the versioned layout, including Gen V animated variants and Gen IX Scarlet–Violet assets.[1] The same README notes that later-generation B&W sprites include community-created material, so the catalog must preserve provider and rights metadata per candidate instead of assigning one license to the whole tree.[1]

## Packaging gate

Until an explicit permission or legal basis is recorded for each selected image set:

- do not copy PokeAPI or Showdown image bytes into `assets/`;
- do not include Showdown in a release package;
- do not label the app as fully offline-capable;
- allow synthetic fixtures and resolver tests to proceed;
- report online technical candidates separately from package-approved local coverage;
- keep missing shiny candidates as explicit empty arrays and use `missing-shiny` only in the resolver contract.

If rights are later cleared, rerun the same pinned sample audit, add notices and per-file SHA-256 values, verify decodability, and promote bytes atomically into the package. A permission for one provider, form, or generation does not automatically cover another.

## T04 gate result

- Technical source discovery: **PASS**.
- Exact form/name mapping samples: **PASS** for the samples listed above.
- MIME/bytes/decode/frame checks: **PASS** for 14 successful decoded images; one intentionally missing Showdown form returned 404 and was rejected; two JSON mapping responses were valid.
- Rights distinction and source order documented: **PASS**.
- Authorized local normal sprite for every Gen I–IX default species: **BLOCKED** — no source was unambiguously approved for redistribution, and no project-owned asset set was identified.
- Packaging/offline coverage: **BLOCKED/PARTIAL**, not silently downgraded.

The implementation may continue with metadata, synthetic fixtures, remote-candidate policy and placeholder behavior. T05 must not claim a complete offline catalog or package these samples without a separate rights decision.

## Sources

[1] https://github.com/PokeAPI/sprites/blob/2ecb4eeacd5a1718621fc30f12772e3f60d830b9/README.md
[2] https://github.com/PokeAPI/sprites/blob/2ecb4eeacd5a1718621fc30f12772e3f60d830b9/LICENCE.txt
[3] https://pokeapi.co/docs/v2
[4] https://pokeapi.co/api/v2/pokemon-form/10001
[5] https://pokeapi.co/api/v2/pokemon/mr-mime
[6] https://github.com/smogon/sprites/blob/master/README.md
[7] https://raw.githubusercontent.com/PokeAPI/sprites/2ecb4eeacd5a1718621fc30f12772e3f60d830b9/sprites/pokemon/versions/generation-v/black-white/25.png
[8] https://play.pokemonshowdown.com/sprites/xyani/charizard.gif
