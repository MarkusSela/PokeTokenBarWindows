# Screenshot index and privacy rules

This page documents the images used by the release README. Each screenshot is paired with the feature it explains. The images are documentation assets, not account screenshots.

## Visual index

| Screenshot | Feature | Description | Data policy |
| --- | --- | --- | --- |
| `screenshot-home.gif` | Home | The animated Home panel combines the active companion, progress, daily and period usage, provider details, and the limits status. | Synthetic rows, totals, and companion progress only. |
| `tray-and-popover.png` | Tray access | The notification-area icon opens Home without a separate taskbar button. Closing Home leaves the app resident in the tray. | Neutral illustration with no unrelated tray icons, clock, notifications, or personal app names. |
| `screenshot-shop.png` | Shop | Usage progress can be exchanged for optional eggs, Rare Candy, the Mint with its supplied leaf icon, Shiny Charm, and the consumable Poké Doll priced at 250,000,000 tokens. | Synthetic wallet and prices only. No billing or account balance. |
| `screenshot-bag.png` | Bag | The local inventory shows purchased items, including the supplied Mint leaf icon, and the explicit actions available for the active companion, including arming the Poké Doll for the next hatch. | Synthetic item counts and activation state only. |
| `screenshot-collection-pokedex.png` | Pokédex | The collection records discovered stages, rarity filters, shiny ownership, and the representative Pokémon used by the companion. | Synthetic species and collection state. |
| `screenshot-collection-catchlog.png` | Catch Log | The history view separates the active companion from graduated ones and keeps each evolution chain, nature, rarity, and date together. | Neutral demonstration dates and names only. |
| `settings.png` + `screenshot-scan-folders.png` | Settings and progression | The two images belong together: the first shows the main controls, while the second shows the advanced read-only scan-folder area. | `C:\Demo\AI-Logs` is a synthetic path. No personal folders or source databases are used. |
| `floating-pet.png` | Floating companion | The optional companion window can stay visible independently from Home and outside the taskbar. | Static synthetic Pokémon state with no surrounding desktop content. |
| `assets/gold-companion-walking.gif` | Gold walking overlay | Gold and his Pokémon can cross the screen independently from Home. The overlay is opt-in and has its own size control. | Static synthetic animation asset. |
| `shiny-banner.png` | Shiny state | A shiny companion receives a distinct visual treatment and notification moment. | Static synthetic state only. |


## Settings and progression

The Settings pair is intentionally kept in one README row so the reader can see the control surface and its advanced scan section together.

### General controls

- **Language** selects the interface language.
- **Refresh interval** chooses a periodic refresh from one to fifteen minutes, or manual refresh.
- **Limit display** chooses used or remaining values when official quota data is available.
- **Launch at login** controls startup behavior.
- **Representative Pokémon** selects the collected species shown in the tray and floating companion.

### Tray and companion controls

The tray tooltip can independently show today's tokens, today's cost, and official limit percentages. The floating companion can be enabled, hidden, and resized.

### Updates and support

Settings includes an explicit update check, an update-notification preference, a project link, an issue link, and the Ko-fi support link. Local usage aggregation does not depend on a remote service.

### Advanced scan folders

Additional folders are selected explicitly and read in JSON/JSONL counter-only mode. The app does not write to those folders, does not modify Hermes or provider databases, and does not need prompt or message bodies.

## Capture method

Prefer the packaged app launched with an isolated temporary state directory and isolated empty provider roots. If a desktop capture is necessary, use a clean Windows profile or crop and redact the entire surrounding desktop before saving.

Before adding an image:

1. inspect every visible pixel for usernames, home paths, clock and notification content, window titles, account values, and personal project names;
2. confirm the file is under `docs/images/`;
3. confirm documentation-only images are excluded from the packaged application;
4. record that the image uses synthetic values;
5. remove temporary demo profiles and untracked capture files outside the intended asset path.

Never use the live Hermes database or provider logs to produce a screenshot. Documentation images must not contain credentials, API keys, tokens, cookies, connection strings, or personal machine paths.

## README layout rule

Keep this relationship intact:

- one visual screenshot cell per feature explanation;
- the two Settings screenshots grouped in one visual cell with one detailed explanation beside them;
- the tray image labelled as an illustration;

- all values described as synthetic unless the item is a static bundled asset.
