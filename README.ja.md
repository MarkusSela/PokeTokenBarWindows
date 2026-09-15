<p align="center">
  <img src="assets/app-icon.png" width="144" alt="PokeTokenBar アプリアイコン">
</p>

<h1 align="center">PokeTokenBar</h1>

<p align="center">
  <strong>ローカルの AI コーディング利用量をポケモンの成長に変えます。</strong><br>
  通知領域に静かに常駐し、毎日の開発を小さなコレクションゲームに変えるデスクトップコンパニオンです。
</p>

<p align="center">
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows/actions/workflows/ci.yml"><img src="https://github.com/MarkusSela/PokeTokenBarWindows/actions/workflows/ci.yml/badge.svg" alt="ビルドステータス"></a>
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows/releases"><img src="https://img.shields.io/github/v/release/MarkusSela/PokeTokenBarWindows?display_name=tag&label=release" alt="最新リリース"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f" alt="MIT ライセンス"></a>
  <a href="https://ko-fi.com/marukoshi"><img src="https://img.shields.io/badge/Support%20on-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white" alt="Support on Ko-fi"></a>
</p>

<p align="center" aria-label="Language selector">
  <a href="README.md">🇬🇧 English</a>
  &nbsp;|&nbsp;
  <a href="README.zh-CN.md">🇨🇳 简体中文</a>
  &nbsp;|&nbsp;
  <a href="README.it.md">🇮🇹 Italiano</a>
  &nbsp;|&nbsp;
  <a href="README.ja.md">🇯🇵 <strong>日本語</strong></a>
  &nbsp;|&nbsp;
  <a href="README.ko.md">🇰🇷 한국어</a>
</p>

> **現在のリリース：v0.1.1**

## このプロジェクトについて

PokeTokenBar は、オリジナルの [PokeTokenBar プロジェクト](https://github.com/chattymin/PokeTokenBar) に着想を得た独立したデスクトップコンパニオンです。このリポジトリには Windows 版が含まれており、ローカルの AI コーディング利用量がタマゴになり、コンパニオンになり、やがて成長するポケモン図鑑になるというシンプルな考え方を引き継いでいます。

アプリは通知領域に常駐し、必要なときにコンパクトな Home パネルを開きます。プロバイダーのデータはコンピューター上に残り、コンパニオン自身の進行状態は分離して保存されます。

## ✨ できること

- 🥚 **利用量を進行に変換：** ローカルの利用量でアクティブなタマゴが進み、ふ化・進化・卒業します。
- 📊 **必要な数字を表示：** データソースが提供する場合、日次・週次・月次・ローリングの利用量を確認できます。
- 📚 **コレクションを作成：** 卒業したコンパニオンをポケモン図鑑に保存し、Catch Log で個体ごとの記録を確認できます。
- 🛍️ **小さな報酬ループ：** ショップとバッグでタマゴ、ふしぎなアメ、ミント、色違いのおまもり、消費アイテムのポケモンドールを扱えます。
- 🫧 **邪魔にならない：** 通知領域から Home を開くか、タスクバーのボタンを増やさずにオプションのフローティングコンパニオンを画面に表示できます。
- 📁 **追加のローカルソースに対応：** ツールが組み込み場所の外に利用量を保存する場合、JSON または JSONL フォルダーを追加できます。
- 🔒 **境界を明確に維持：** プロバイダーのデータは読み取り専用で扱い、サーバー、SSH、Tailscale、Home Assistant、リモート利用量サービスは必要ありません。

## 🔁 進行の仕組み

1. アプリが対応する利用メタデータをローカルで読み取ります。
2. 新しい利用量によってアクティブなタマゴが進みます。
3. ふ化の判定時に、タマゴが内蔵カタログからポケモンを選びます。
4. さらに進むと進化段階が解放され、最終的にコンパニオンが卒業します。
5. ポケモン図鑑と Catch Log がローカルのコレクション履歴を保持します。

進行状態は PokeTokenBar に属します。Hermes やプロバイダーのソースへ書き戻すことはありません。

### ポケモンドール

ポケモンドールはショップで購入できる消費アイテムで、価格は **250,000,000 tokens** です。タマゴを孵化中にバッグから有効化すると、次のふ化まで有効になります。その判定時点で、ポケモン図鑑にすでに登録されている通常種のポケモンは候補から除外されますが、色違いのバリエーションは有効です。つまり、ヒトカゲを持っていても色違いのヒトカゲは候補になります。ドールが影響するのは次のふ化だけで、アクティブなポケモンやタマゴの進行度は変更しません。

## 📸 スクリーンショット

以下のスクリーンショットには合成値と中立的なデモ用パスを使用しています。それぞれの画像の横に、その画面の目的を説明しています。個人アカウントや個人のデスクトップを撮影したものではありません。

<table class="screenshot-table">
  <thead>
    <tr>
      <th width="40%">スクリーンショット</th>
      <th align="left">表示内容</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-home.gif" width="300" alt="合成された利用量とコンパニオンの進行を表示するアニメーション Home パネル"><br>
        <strong>🏠 Home</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>ここから始めます。</strong><br>
        Home には、アクティブなタマゴまたはポケモン、次の段階までの進行、利用量の合計、プロバイダーの詳細、制限の状態がコンパクトにまとまっています。通知領域から開き、タスクバーに別のボタンを作りません。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/tray-and-popover.png" width="420" alt="通知領域のアイコンと Home パネルのイラスト"><br>
        <strong>📍 トレイからのアクセス</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>トレイを中心にしたデスクトップフロー。</strong><br>
        これは入口を示す中立的なイラストです。通知領域のアイコンから Home を開き、コンテキストメニューから更新または終了できます。パネルを閉じても PokeTokenBar はトレイで静かに動作し続けます。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-shop.png" width="275" alt="ポケモンドールを含む合成された進行アイテムの価格を表示するショップ"><br>
        <strong>🛍️ ショップ</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>進行トークンを使う場所。</strong><br>
        ショップでは、新しいタマゴ、レアタマゴ、付属のローカルな葉のアイコンを使ったミント、ふしぎなアメ、色違いのおまもり、ポケモンドールなどを扱います。ポケモンドールは 250,000,000 tokens で、次のふ化に備えて有効化すると消費されます。画像内の価格とウォレットは合成されたデモ値であり、請求データや実際のアカウント残高ではありません。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-bag.png" width="275" alt="合成されたふしぎなアメ、ミント、ポケモンドールのインベントリを表示するバッグ"><br>
        <strong>🎒 バッグ</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>手に入れたものを使う場所。</strong><br>
        バッグでは、付属のミントの葉のアイコンを含むローカルなアイテムインベントリを確認でき、各操作を明示します。ここでポケモンドールを次のふ化に備えて有効化できます。表示される個数と有効状態は合成データで、実際の購入履歴ではありません。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-pokedex.png" width="275" alt="合成された収集エントリーを表示するポケモン図鑑のグリッド"><br>
        <strong>📖 ポケモン図鑑</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>コレクションを一目で確認。</strong><br>
        ポケモン図鑑には、発見した段階、レア度フィルター、色違いの所持状態、トレイやフローティングコンパニオンに表示する代表ポケモンが記録されます。種族を選択しても変わるのはコンパニオンの表示だけで、プロバイダーのデータは変わりません。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-catchlog.png" width="275" alt="合成された日付と性格を表示する Catch Log"><br>
        <strong>🗂️ Catch Log</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>それぞれのコンパニオンの物語を保存。</strong><br>
        Catch Log ではアクティブなコンパニオンと卒業したコンパニオンを分け、個体ごとに進化系統、レア度、性格、中立的なデモ用日付を表示します。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/settings.png" width="195" alt="一般、トレイ、コンパニオン、更新、サポートの設定"><img src="docs/images/screenshot-scan-folders.png" width="195" alt="合成された追加スキャンフォルダーを表示する詳細設定"><br>
        <strong>⚙️ 設定と進行</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>2 枚の設定画像は同じフローに属します。</strong>
        <ul>
          <li><strong>一般：</strong>言語、更新間隔、制限の表示、ログイン時の起動、代表ポケモンを選択します。</li>
          <li><strong>トレイ：</strong>トレイのツールチップに表示する日次合計と制限の詳細を決めます。</li>
          <li><strong>コンパニオン：</strong>フローティングペットの表示・非表示とサイズを設定します。</li>
          <li><strong>更新：</strong>更新通知を受け取るか、リリースページを確認するかを選択します。</li>
          <li><strong>詳細スキャン：</strong>追加の JSON または JSONL フォルダーを登録します。`C:\Demo\AI-Logs` は合成された例で、これらのフォルダーは読み取り専用です。</li>
        </ul>
        これらの設定が変更するのは PokeTokenBar 自身の設定と進行表示だけです。Hermes や他のプロバイダーのファイルは変更しません。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/floating-pet.png" width="153" alt="静的なフローティングコンパニオンウィンドウ"><br>
        <strong>🫧 フローティングコンパニオン</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>独立したコンパニオンウィンドウ。</strong><br>
        Home を閉じている間も、オプションのペットを表示したままにできます。透明でタスクバーには表示されず、利用量の更新中も移動やサイズ変更をせず、選択した代表ポケモンに追従します。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/shiny-banner.png" width="275" alt="色違いコンパニオンの状態"><br>
        <strong>✨ 色違いの状態</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>独自の見た目を持つレアな結果。</strong><br>
        このバナーでは、色違いコンパニオンと通知の瞬間をアプリがどのように表示するかを示します。静的で合成されたドキュメント用の状態です。
      </td>
    </tr>
  </tbody>
</table>

完全な画像一覧と、ドキュメントのデータを匿名に保つためのルールについては [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md) を参照してください。

## 🔌 ローカルソース

アプリは各ソースを個別に確認し、インストールされていない場所はスキップします。現在、組み込みリーダーは次に対応しています。

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
- Hermes Agent のローカル SQLite 利用量

PokeTokenBar は合計と帰属に必要な利用メタデータを読み取ります。プロンプトやメッセージ本文は必要ありません。Hermes のデータは読み取り専用で開かれ、稼働中の SQLite WAL データベースにも対応します。

公式のクォータ値は、ローカルソースが提供する場合にのみ表示されます。利用できない場合は、パーセンテージやリセット時刻を推測せず、利用できないことを画面に示します。

## 🔒 プライバシーとローカルデータ

PokeTokenBar はローカルデータを中心に設計されています。

- テレメトリーや分析サービスはありません。
- 利用データをアップロードしません。
- リモートデータベースはありません。
- SSH、Tailscale、Home Assistant に依存しません。
- プロバイダーのデータベースとログファイルは読み取り専用です。
- プロンプト、認証情報、API キー、トークン、Cookie、接続文字列はリポジトリやリリースアセットに保存しません。
- コンパニオン自身の進行状態はリポジトリの外にある通常のアプリケーションデータディレクトリに保存されます。
- エクスポートはユーザーが明示的に行う操作であり、個人データとして扱う必要があります。

リリース監査では、個人の絶対パス、認証情報らしき値、ローカルデータベース、ログ、コンパニオンの状態を拒否します。詳しくは [`SECURITY.md`](SECURITY.md) と [`RELEASE.md`](RELEASE.md) を参照してください。

## 📦 インストール

現在のリリースは `v0.1.1` です。

1. [Releases ページ](https://github.com/MarkusSela/PokeTokenBarWindows/releases) を開きます。
2. `PokeTokenBar-Windows-Setup-<version>.exe` をダウンロードします。
3. 付属の `SHA256SUMS.txt` で SHA-256 値を確認します。
4. インストーラーを実行します。PokeTokenBar は通知領域で起動するので、アイコンをクリックして Home を開きます。

現在のインストーラーは Authenticode 署名されていないため、Windows SmartScreen が警告を表示する場合があります。インストール前にリリース元とチェックサムを確認してください。

## 🧰 ソースからビルド

必要なもの：

- Windows 10 または 11
- Node.js 22 以降
- npm

```shell
npm ci
npm test
node --check main.cjs
npm run audit:release
npm run dist
```

インストーラーは `dist/PokeTokenBar-Windows-Setup-<version>.exe` に出力され、展開されたアプリは `dist/win-unpacked/` に出力されます。

クリーンな検証を行うには、再ビルドの前に以前の PokeTokenBar プロセスを終了してください。通常の起動経路はトレイ中心のままです。診断用の起動は、ドキュメント化された `PTB_OPEN=1` テスト経路に限られます。

クロスプラットフォーム開発については [`docs/LINUX-WEB-DOCKER.md`](docs/LINUX-WEB-DOCKER.md) にまとめています。Linux AppImage/deb ターゲット、ローカルブラウザーの Home、読み取り専用 API の境界、Wayland フォールバック、ヘッドレス Docker プロファイルを説明しています。

Docker サーバー用の Compose プロファイルはループバックにバインドされ、`public-readonly` モードで起動します。明示された読み取り専用ディレクトリから Hermes を読み取り、コンパニオンの進行状態は別の `/data` バインドに保存します。ホストディレクトリの権限、LAN/Homepage の読み取り専用設定、ループバック限定の書き込みオプトインについては Docker のセクションを参照してください。

## 🤝 コントリビューション

Issue と Pull Request を歓迎します。次の点を守ってください。

- 最小限の再現手順を説明する。
- 可能な限り合成データを使う。
- プロバイダーのログ、Hermes データベース、プロンプト、認証情報、Cookie、エクスポートしたセーブデータを添付しない。
- トレイ中心のライフサイクルと、プロバイダーを読み取り専用にする境界を維持する。

ローカルのテストフローは [`CONTRIBUTING.md`](CONTRIBUTING.md) から始めてください。

## 🔗 リンク

- [プロジェクトリポジトリ](https://github.com/MarkusSela/PokeTokenBarWindows)
- [リリース](https://github.com/MarkusSela/PokeTokenBarWindows/releases)
- [Issue を報告](https://github.com/MarkusSela/PokeTokenBarWindows/issues/new)
- [オリジナルの PokeTokenBar プロジェクト](https://github.com/chattymin/PokeTokenBar)

## 💛 サポート

PokeTokenBar が役に立った場合は、[Ko-fi](https://ko-fi.com/marukoshi) でメンテナンスを支援できます。支援は保守、テスト、インターフェースの改善に役立ちますが、機能を解除するものではなく、利用データをどこかに送ることもありません。

## 🙏 謝辞

このビルドのコンパニオンのコンセプトと進行ループの着想を与えてくれた [オリジナルの PokeTokenBar プロジェクト](https://github.com/chattymin/PokeTokenBar) に感謝します。

このプロジェクトでは次も利用しています。

- デスクトップランタイムとしての [Electron](https://www.electronjs.org/)。
- ポケモンのデータと画像のための [PokéAPI](https://pokeapi.co/) と [PokéAPI sprites リポジトリ](https://github.com/PokeAPI/sprites)。
- 読み取り専用の集計を可能にするローカル AI ツールと、そのメンテナー。
- プライベートなログや認証情報を共有せず、再現可能なフィードバックを提供するテスターと Issue 報告者。

## 📄 ライセンス

このリポジトリのソースコードは [MIT ライセンス](LICENSE) で公開されています。ライセンスはこのプロジェクトのソースコードに適用され、第三者の商標、アートワーク、アプリがアクセスするデータの権利を与えるものではありません。

PokeTokenBar は非公式かつ非商用のファンプロジェクトです。Nintendo、Game Freak、Creatures Inc.、The Pokémon Company とは提携しておらず、承認、スポンサー、認可を受けていません。「Pokémon」および関連する名称、キャラクター、画像はそれぞれの権利者に帰属します。

本アプリケーションは「現状のまま」提供され、いかなる種類の保証もありません。この注意書きは法的助言ではありません。
