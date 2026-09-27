# Screenshot index and privacy rules

This page documents the images used by the release README. Each screenshot is paired with the feature it explains. The images are documentation assets, not account screenshots.

## Visual index

| Screenshot | Feature | Description | Data policy |
| --- | --- | --- | --- |
| `screenshot-home.png` | Home | Static native popover capture with Pikachu: the Home panel combines the active companion, progress, daily and period usage, provider details, and the limits status. | Synthetic rows, totals, and companion progress only. |
| `tray-and-popover.png` | Tray access | The notification-area icon opens Home without a separate taskbar button. Closing Home leaves the app resident in the tray. | Neutral illustration with no unrelated tray icons, clock, notifications, or personal app names. |
| `screenshot-shop.png` | Shop | Native Shop popover capture showing the three-column item card grid, the three new items, item badges, synthetic prices and the synthetic wallet. | Synthetic wallet and prices only. No billing or account balance. |
| `screenshot-bag.png` | Bag | Native Bag popover capture showing item artwork, the adjacent Poké Doll heart, the silver Incubator badge, the ochre three-star Incense badge and explicit hatch actions. | Synthetic item counts and activation state only. |
| `screenshot-collection-pokedex.png` | Pokédex | Native Pokédex popover capture showing four entries per row, shiny stars in the top-right of shiny cards, the pinned page bar and rarity filters. | Synthetic species and collection state. |
| `screenshot-collection-catchlog.png` | Catch Log | The history view separates the active companion from graduated ones and keeps each evolution chain, nature, rarity, and date together. | Neutral demonstration dates and names only. |
| `settings.png` + `screenshot-scan-folders.png` | Settings and progression | The two images belong together: the first is a native Settings popover capture, while the second shows the advanced read-only scan-folder area. | `C:\Demo\AI-Logs` is a synthetic path. No personal folders or source databases are used. |
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

The current Home, Shop, Bag, Pokédex and primary Settings images are native popover captures from the isolated renderer; they contain only the app window, with no explanatory panels, artificial canvas or desktop chrome. Prefer the packaged app launched with an isolated temporary state directory and isolated empty provider roots. If a desktop capture is necessary, use a clean Windows profile or crop and redact the entire surrounding desktop before saving.

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
