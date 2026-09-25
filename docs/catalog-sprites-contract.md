# Catalogo e sprite — contratto v2

Questo documento fissa il confine tra catalogo incluso, stato di gioco, risoluzione degli sprite e cache. La fixture `test/fixtures/catalog-v2.json` è sintetica: dimostra la forma dei dati e non dimostra copertura reale, decodifica o diritti di redistribuzione.

## C1 — documento catalogo

`assets/pokemon-catalog.json` è un oggetto con:

- `schemaVersion: 2`.
- `catalogVersion`: SHA-256 del documento normalizzato, escluso il campo `catalogVersion` e gli eventuali campi volatili dichiarati sotto `source`. La normalizzazione ordina ricorsivamente le chiavi degli oggetti, conserva l'ordine degli array e serializza con JSON deterministico. La versione sorgente e la provenienza devono restare esplicite.
- `source`: provider, snapshot/revisione, generazioni incluse e provenienza verificabile. Una repository pubblica non è, da sola, un'autorizzazione a redistribuire immagini o marchi.
- `lines`: righe delle linee radice, compatibili con i consumatori esistenti: `{ id, captureRate, rarity, line }`. Dentro `line` restano `baseId`, `pathOptions`, `pathIds`, `rarity`, `names` almeno `en`/`it` e `captureRate`. `pathIds` è il percorso selezionato iniziale e deve essere uno dei `pathOptions`.
- `species`: mappa indicizzata dall'ID specie, con `generation`, nomi, metadati base e riferimenti alle varianti.
- `variants`: mappa con chiavi `pokemon:<idVariante>`. Ogni valore espone `speciesId`, `isDefault`, `formKey` e `sprites`.

Gli ID specie e gli ID variante non sono intercambiabili. Una specie può riferire una variante non-default con un ID Pokémon diverso; una forma non-default non diventa per questo una nuova radice catturabile.

Ogni lista `sprites.normal`/`sprites.shiny` contiene candidati con `provider`, `style` (`auto` o `pixel-gen5`), `animated`, `sourceUrl`, `localPath`, `sha256` e `licenseRef`. `localPath` è relativo al pacchetto, non assoluto e senza traversal. Un'assenza è rappresentata da array vuoto, non da una URL costruita per supposizione. `licenseRef` deve rimandare a una nota verificata di fonte/diritti.

Il manifest opzionale `assets/animated-sprite-overrides.json` è input del generatore, non packaging di immagini. Ogni override è indicato dalla variante esatta `pokemon:<variantId>` e può aggiungere soltanto un candidato remoto animato validato con `packageAllowed: false`; URL, hash dei byte, prove dei frame e riferimento ai diritti devono essere registrati prima dell'uso. Il manifest attuale copre solo i sei candidati 650/906/979 normal/shiny trovati nell'indagine N03.

Le linee selezionabili escludono Ditto (specie 132), ma `species` e `variants` possono rappresentarlo per la meccanica dedicata. Le evoluzioni moderne e ramificate restano nei percorsi della radice: non si tronca una catena a un limite storico e non si sostituisce la riga radice con una riga per ogni specie.

`loadShippedCatalog()` conserva il ritorno storico delle righe. Un accesso separato legge il documento completo v2; nessun chiamante legacy deve cambiare forma in modo silenzioso.

## C2 — rarità condivisa

`classifyEvolutionLine({ captureRate, legendary, mythical }, override)` assigns the egg rarity shared by the whole line:

1. override esplicito valido;
2. `legendary` o `mythical` → `legendary`;
3. capture rate `0–45` → `rare`;
4. capture rate `46–120` → `uncommon`;
5. capture rate `121–255` → `common`.

The historical `assets/pokemon-catalog-gen1-5.json` is the regression baseline for Generations I–V; Gen VI–IX use the same fields from the versioned PokeAPI species snapshot. Evolution path length is retained for progression and egg base-species selection, but it does not determine rarity.

`classifyRarity({ captureRate, legendary, mythical }, override)` remains available for the same threshold model and compatibility with individual species metadata. Capture rate missing, non-numeric or outside the contract is an error in the generator. The overrides reside in `assets/pokemon-rarity-overrides.json` and are reserved for explicit exceptions. The normalizer does not rewrite the saved active companion or saved catch-log records.

## C3 — resolver puro

`resolveSpriteCandidates(request, catalog)` non esegue I/O, rete, scritture o accesso al DOM.

Request:

```js
{ speciesId, variantKey?, shiny, style: 'auto' | 'pixel-gen5', offline }
```

Risposta: array ordinato e deduplicato di `{ src, provider, animated, shiny, fallbackKind }`.

- `auto`: usa candidati con `animated: true`, ordinati per priorità tecnica (Showdown, risorsa di gioco/versionata, Gen V animata). Solo quando la variante non ha alcuna sorgente animata usa i candidati statici normali/shiny già presenti nel catalogo, marcandoli con `fallbackKind: 'static'`; se anche quelli non esistono viene restituito il placeholder locale esplicito.
- `pixel-gen5`: prova prima i candidati Gen V animati verificati, poi la stessa catena animata di `auto`; per le varianti senza alcuna animazione usa il candidato statico Gen V prima degli altri candidati statici.
- Per `shiny: true` sono ammessi solo candidati shiny. Se mancano tutti, si restituisce un placeholder locale con `fallbackKind: 'missing-shiny'`; non si usa lo sprite normale mantenendo un badge shiny.
- `offline: true` esclude candidati remoti e conserva solo candidati locali animati inclusi nel pacchetto; se non esiste un locale animato restituisce il placeholder offline.
- Il renderer tenta ogni candidato al massimo una volta e termina su un placeholder locale; non usa un ciclo `onerror` infinito. Una richiesta obsoleta non può sovrascrivere la selezione successiva.
- Il resolver non implementa la rivelazione o la maschera Ditto. Il main passa la specie visibile e lo shiny già determinati dal gioco. Uovo e Gold restano fuori da questa politica.

## C4 — offline e cache

L'avvio normale e la scelta delle linee usano prima il catalogo incluso; non richiedono una fetch. Le cache indice sono valide solo quando coincidono `schemaVersion` e `catalogVersion`, oltre alle normali regole di freschezza. Cache corrotta, vecchia o non scrivibile viene ignorata senza cancellazioni indiscriminate; il catalogo incluso resta utilizzabile.

Per ogni specie inclusa deve essere verificato almeno un candidato normale locale per la variante default, decodificabile e autorizzato secondo la policy di fonte. La copertura shiny e animata è contabilizzata separatamente. Un placeholder generico non conta come copertura offline specifica.

La compatibilità del salvataggio mantiene ID, `pathIds`, `plannedPathIds`, `stageIndex`, soglie, inventario, Pokédex, progressione, campi Ditto e impostazioni non correlate. Il nuovo catalogo non fa evolvere retroattivamente un attivo o un record già salvato.

## Gate T02

Il test `test/catalog-contract.test.cjs` verifica schema, digest deterministico, linee con ramo e evoluzione oltre Gen V, esclusione di Ditto dal pool, metadati Ditto, riferimenti specie/varianti, forma non-default, campi sprite, percorsi locali sicuri, URL sicure e stato v2 sintetico con impostazione sconosciuta. Il test non dichiara che il catalogo reale o gli asset siano completi.
