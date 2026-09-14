<p align="center">
  <img src="assets/app-icon.png" width="144" alt="Icona dell'app PokeTokenBar">
</p>

<h1 align="center">PokeTokenBar</h1>

<p align="center">
  <strong>Trasforma l'uso locale dell'IA per il coding in progressi Pokémon.</strong><br>
  Un compagno discreto nell'area di notifica che trasforma lo sviluppo quotidiano in un piccolo gioco di collezione.
</p>

<p align="center">
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows-Lab/actions/workflows/ci.yml"><img src="https://github.com/MarkusSela/PokeTokenBarWindows-Lab/actions/workflows/ci.yml/badge.svg" alt="Stato della build"></a>
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows-Lab/releases"><img src="https://img.shields.io/github/v/release/MarkusSela/PokeTokenBarWindows-Lab?display_name=tag&label=release" alt="Ultima release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f" alt="Licenza MIT"></a>
  <a href="https://ko-fi.com/marukoshi"><img src="https://img.shields.io/badge/Support%20on-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white" alt="Support on Ko-fi"></a>
</p>

<p align="center" aria-label="Language selector">
  <a href="README.md">🇬🇧 English</a>
  &nbsp;|&nbsp;
  <a href="README.zh-CN.md">🇨🇳 简体中文</a>
  &nbsp;|&nbsp;
  <a href="README.it.md">🇮🇹 <strong>Italiano</strong></a>
  &nbsp;|&nbsp;
  <a href="README.ja.md">🇯🇵 日本語</a>
  &nbsp;|&nbsp;
  <a href="README.ko.md">🇰🇷 한국어</a>
</p>

> **Versione corrente: v0.1.1**

## Informazioni sul progetto

PokeTokenBar è un compagno desktop indipendente ispirato al progetto originale [PokeTokenBar](https://github.com/chattymin/PokeTokenBar). Questa repository contiene la build Windows e mantiene la stessa idea semplice: l'uso locale dell'IA per il coding diventa un uovo, poi un compagno e infine un Pokédex sempre più grande.

L'app rimane nell'area di notifica e apre un pannello Home compatto quando serve. I dati del provider restano sul computer, mentre il compagno conserva separatamente il proprio stato di progressione.

## ✨ Cosa fa

- 🥚 **Trasforma l'uso in progressi:** l'uso locale alimenta l'uovo attivo, che può schiudersi, evolversi e diplomarsi.
- 📊 **Mostra i numeri importanti:** visualizza l'uso giornaliero, settimanale, mensile e progressivo quando la sorgente lo fornisce.
- 📚 **Costruisce una collezione:** conserva i compagni diplomati nel Pokédex e rivede ogni individuo nel Catch Log.
- 🛍️ **Aggiunge un piccolo ciclo di ricompense:** usa Negozio e Borsa per uova, Rare Candy, Mint, Shiny Charm e Poké Doll consumabile.
- 🫧 **Rimane discreto:** apri Home dalla tray oppure mantieni sullo schermo un compagno fluttuante opzionale senza aggiungere un altro pulsante alla barra delle applicazioni.
- 📁 **Accetta altre sorgenti locali:** aggiungi cartelle JSON o JSONL quando uno strumento conserva l'uso fuori dalle posizioni integrate.
- 🔒 **Mantiene chiari i confini:** i dati dei provider sono in sola lettura e l'app non richiede server, SSH, Tailscale, Home Assistant o un servizio remoto per l'uso.

## 🔁 Come funziona la progressione

1. L'app legge localmente i metadati di utilizzo supportati.
2. Il nuovo utilizzo fa avanzare l'uovo attivo.
3. Al momento della schiusa, l'uovo seleziona un Pokémon dal catalogo integrato.
4. Una maggiore progressione sblocca gli stadi evolutivi e infine porta il compagno al diploma.
5. Pokédex e Catch Log conservano la cronologia locale della collezione.

Lo stato di progressione appartiene a PokeTokenBar. L'app non scrive nuovamente nei dati di Hermes o in quelli di un provider.

### Poké Doll

La Poké Doll è un oggetto consumabile del Negozio dal prezzo di **250.000.000 token**. Attivala dalla Borsa quando un uovo è in incubazione: resterà armata fino alla schiusa successiva. In quel momento, le specie Pokémon normali già rappresentate nel Pokédex vengono escluse; le varianti shiny restano valide, quindi possedere Charmander non impedisce di ottenere Charmander shiny. La Doll influenza solo la schiusa successiva e non cambia mai il Pokémon attivo o il progresso dell'uovo.

## 📸 Screenshot

Gli screenshot seguenti usano valori sintetici e percorsi demo neutri. Ogni immagine è affiancata da una spiegazione dello scopo della schermata. Sono asset documentali, non catture di un account o di un desktop personale.

<table class="screenshot-table">
  <thead>
    <tr>
      <th width="40%">Screenshot</th>
      <th align="left">Cosa mostra</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-home.gif" width="300" alt="Pannello Home animato con uso e progressione del compagno sintetici"><br>
        <strong>🏠 Home</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Il punto di partenza.</strong><br>
        Home riunisce uovo o Pokémon attivo, progresso verso lo stadio successivo, totali d'uso, dettagli del provider e stato dei limiti in un pannello compatto. Si apre dalla tray e non crea un secondo pulsante nella barra delle applicazioni.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/tray-and-popover.png" width="420" alt="Illustrazione dell'icona nell'area di notifica e del pannello Home"><br>
        <strong>📍 Accesso dalla tray</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Un flusso desktop basato sulla tray.</strong><br>
        Questa è un'illustrazione neutra del punto di ingresso. L'icona nell'area di notifica apre Home, il menu contestuale può aggiornare o chiudere l'app e la chiusura del pannello lascia PokeTokenBar in esecuzione nella tray.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-shop.png" width="275" alt="Negozio con prezzi sintetici degli oggetti di progressione, inclusa la Poké Doll"><br>
        <strong>🛍️ Negozio</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Un posto dove spendere i token di progressione.</strong><br>
        Il Negozio offre oggetti opzionali come un uovo nuovo, Rare Egg, la Mint con la sua icona locale a forma di foglia, Rare Candy, Shiny Charm e Poké Doll. La Poké Doll costa 250.000.000 token e viene consumata quando viene armata per la schiusa successiva. Prezzi e saldo mostrati nello screenshot sono valori sintetici di dimostrazione, non dati di fatturazione o di un portafoglio reale.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-bag.png" width="275" alt="Borsa con inventario sintetico di Rare Candy, Mint e Poké Doll"><br>
        <strong>🎒 Borsa</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Usa ciò che hai guadagnato.</strong><br>
        La Borsa mantiene visibile l'inventario locale, inclusa l'icona a forma di foglia della Mint, e rende esplicita ogni azione. Qui puoi armare la Poké Doll per la schiusa successiva; quantità e stato di attivazione mostrati sono sintetici e non rappresentano una cronologia reale degli acquisti.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-pokedex.png" width="275" alt="Griglia del Pokédex con voci raccolte sintetiche"><br>
        <strong>📖 Pokédex</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Guarda la collezione in un colpo d'occhio.</strong><br>
        Il Pokédex registra gli stadi scoperti, i filtri di rarità, il possesso delle varianti shiny e il Pokémon rappresentativo mostrato nella tray o nel compagno fluttuante. Selezionare una specie cambia la visualizzazione del compagno, non i dati del provider.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-catchlog.png" width="275" alt="Catch Log con date e nature sintetiche"><br>
        <strong>🗂️ Catch Log</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Conserva la storia di ogni compagno.</strong><br>
        Il Catch Log separa il compagno attivo da quelli diplomati e mostra per ogni individuo la catena evolutiva, la rarità, la natura e date dimostrative neutre.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/settings.png" width="195" alt="Impostazioni con controlli generali, tray, compagno, aggiornamenti e supporto"><img src="docs/images/screenshot-scan-folders.png" width="195" alt="Impostazioni avanzate con una cartella di scansione aggiuntiva sintetica"><br>
        <strong>⚙️ Impostazioni e progressione</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Le due immagini delle Impostazioni fanno parte dello stesso flusso.</strong>
        <ul>
          <li><strong>Generale:</strong> scegli lingua, frequenza di aggiornamento, visualizzazione dei limiti, avvio con Windows e Pokémon rappresentativo.</li>
          <li><strong>Tray:</strong> scegli quali totali giornalieri e dettagli dei limiti compaiono nel tooltip della tray.</li>
          <li><strong>Compagno:</strong> mostra o nascondi il pet fluttuante e regolane la dimensione.</li>
          <li><strong>Aggiornamenti:</strong> scegli se ricevere notifiche e controlla la pagina delle release.</li>
          <li><strong>Scansione avanzata:</strong> aggiungi cartelle JSON o JSONL. `C:\Demo\AI-Logs` è un percorso sintetico; queste cartelle sono in sola lettura.</li>
        </ul>
        Questi controlli modificano solo le impostazioni e la visualizzazione della progressione di PokeTokenBar. Non modificano Hermes o i file di altri provider.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/floating-pet.png" width="153" alt="Finestra statica del compagno fluttuante"><br>
        <strong>🫧 Compagno fluttuante</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Una finestra separata per il compagno.</strong><br>
        Il pet opzionale può restare visibile mentre Home è chiuso. È trasparente, escluso dalla barra delle applicazioni e segue il rappresentante selezionato senza spostarsi o ridimensionarsi durante l'aggiornamento dell'uso.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/shiny-banner.png" width="275" alt="Stato di un compagno shiny"><br>
        <strong>✨ Stato shiny</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>Un risultato raro con una propria identità visiva.</strong><br>
        Questo banner mostra come l'app presenta un compagno shiny e il relativo momento di notifica. È uno stato documentale statico e sintetico.
      </td>
    </tr>
  </tbody>
</table>

Consulta [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md) per l'indice completo delle immagini e le regole usate per mantenere anonimi i dati della documentazione.

## 🔌 Sorgenti locali

L'app controlla ogni sorgente in modo indipendente e ignora le posizioni non installate. I lettori integrati coprono attualmente:

- Claude Code
- Gemini CLI
- Antigravity
- Codex
- OpenCode
- Cursor
- Grok CLI
- GitHub Copilot CLI
- Kiro CLI
- Pi Agent
- utilizzo locale di Hermes Agent su SQLite

PokeTokenBar legge i metadati necessari per i totali e l'attribuzione. Non richiede prompt o corpi dei messaggi. I dati Hermes vengono aperti in sola lettura e restano compatibili con un database SQLite WAL in uso.

I valori ufficiali delle quote compaiono solo quando una sorgente locale li fornisce. Se il dato non è disponibile, l'interfaccia lo dichiara invece di inventare percentuali o orari di reset.

## 🔒 Privacy e dati locali

PokeTokenBar è progettato per usare dati locali:

- nessun servizio di telemetria o analytics;
- nessun upload dei dati di utilizzo;
- nessun database remoto;
- nessuna dipendenza da SSH, Tailscale o Home Assistant;
- database e file di log dei provider in sola lettura;
- prompt, credenziali, chiavi API, token, cookie e stringhe di connessione non vengono conservati nella repository o negli asset di release;
- lo stato di progressione del compagno resta fuori dalla repository, nella normale cartella dei dati applicativi;
- un export è un'azione esplicita dell'utente e deve essere trattato come dato personale.

L'audit della release rifiuta percorsi assoluti personali, valori che sembrano credenziali, database locali, log e stato del compagno. Ulteriori dettagli sono disponibili in [`SECURITY.md`](SECURITY.md) e [`RELEASE.md`](RELEASE.md).

## 📦 Installazione

La release corrente è `v0.1.1`.

1. Apri la [pagina Releases](https://github.com/MarkusSela/PokeTokenBarWindows-Lab/releases).
2. Scarica `PokeTokenBar-Windows-Lab-Setup-<version>.exe`.
3. Verifica il valore SHA-256 con il file allegato `SHA256SUMS.txt`.
4. Avvia l'installer. PokeTokenBar parte nell'area di notifica; clicca l'icona per aprire Home.

L'installer corrente non è firmato con Authenticode, quindi Windows SmartScreen potrebbe mostrare un avviso. Controlla la fonte della release e il checksum prima di installare.

## 🧰 Compilare dal sorgente

Requisiti:

- Windows 10 o 11
- Node.js 22 o più recente
- npm

```shell
npm ci
npm test
node --check main.cjs
npm run audit:release
npm run dist
```

L'installer viene scritto in `dist/PokeTokenBar-Windows-Lab-Setup-<version>.exe`. L'applicazione non impacchettata viene scritta in `dist/win-unpacked/`.

Per una verifica pulita, chiudi i processi PokeTokenBar precedenti prima di ricompilare. Il percorso normale di avvio resta basato sulla tray; l'apertura diagnostica è riservata al percorso di test documentato `PTB_OPEN=1`.

Lo sviluppo multipiattaforma è documentato in [`docs/LINUX-WEB-DOCKER.md`](docs/LINUX-WEB-DOCKER.md). Il documento copre i target Linux AppImage/deb, la Home nel browser locale, il confine API in sola lettura, i fallback Wayland e il profilo Docker headless.

Per il server Docker, il profilo Compose fornito si lega all'indirizzo di loopback e parte in modalità `public-readonly`. Legge Hermes da una directory esplicitamente in sola lettura e conserva la progressione del compagno in un bind `/data` separato. Consulta la sezione Docker per i permessi delle directory host, la configurazione LAN/Homepage in sola lettura e l'opt-in esplicito alle mutazioni limitato al loopback.

## 🤝 Contribuire

Issue e pull request sono benvenute. Per favore:

- descrivi i passaggi minimi per riprodurre il problema;
- usa dati sintetici quando possibile;
- non allegare log dei provider, database Hermes, prompt, credenziali, cookie o salvataggi esportati;
- preserva il ciclo di vita basato sulla tray e il confine in sola lettura dei provider.

Inizia da [`CONTRIBUTING.md`](CONTRIBUTING.md) per il flusso di test locale.

## 🔗 Collegamenti

- [Repository del progetto](https://github.com/MarkusSela/PokeTokenBarWindows-Lab)
- [Release](https://github.com/MarkusSela/PokeTokenBarWindows-Lab/releases)
- [Segnala un problema](https://github.com/MarkusSela/PokeTokenBarWindows-Lab/issues/new)
- [Progetto PokeTokenBar originale](https://github.com/chattymin/PokeTokenBar)

## 💛 Supporto

Se PokeTokenBar ti è utile, puoi sostenere la manutenzione su [Ko-fi](https://ko-fi.com/marukoshi). Il supporto aiuta manutenzione, test e rifinitura dell'interfaccia. Non sblocca funzioni e non invia mai dati di utilizzo da nessuna parte.

## 🙏 Ringraziamenti

Grazie al [progetto PokeTokenBar originale](https://github.com/chattymin/PokeTokenBar) per il concetto di compagno e il ciclo di progressione che hanno ispirato questa build.

Questo progetto usa inoltre:

- [Electron](https://www.electronjs.org/) per il runtime desktop;
- [PokéAPI](https://pokeapi.co/) e la [repository degli sprite PokéAPI](https://github.com/PokeAPI/sprites) per dati e immagini Pokémon;
- i manutentori degli strumenti IA locali i cui formati di utilizzo rendono possibile l'aggregazione in sola lettura;
- tester e segnalatori di issue che forniscono feedback riproducibile senza condividere log privati o credenziali.

## 📄 Licenza

Il codice sorgente di questa repository è distribuito con la [licenza MIT](LICENSE). La licenza si applica al codice sorgente di questo progetto e non concede diritti su marchi, opere artistiche o dati di terze parti a cui l'app può accedere.

PokeTokenBar è un progetto fan non ufficiale e non commerciale. Non è affiliato, approvato, sponsorizzato o autorizzato da Nintendo, Game Freak, Creatures Inc. o The Pokémon Company. "Pokémon" e i relativi nomi, personaggi e immagini appartengono ai rispettivi proprietari.

L'applicazione è fornita "così com'è", senza garanzie di alcun tipo. Questa nota non costituisce consulenza legale.
