<p align="center">
  <img src="assets/app-icon.png" width="144" alt="PokeTokenBar 앱 아이콘">
</p>

<h1 align="center">PokeTokenBar</h1>

<p align="center">
  <strong>로컬 AI 코딩 사용량을 포켓몬 성장으로 바꿉니다.</strong><br>
  알림 영역에 조용히 상주하며 일상적인 개발을 작은 수집 게임으로 바꾸는 데스크톱 동반자입니다.
</p>

<p align="center">
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows/actions/workflows/ci.yml"><img src="https://github.com/MarkusSela/PokeTokenBarWindows/actions/workflows/ci.yml/badge.svg" alt="빌드 상태"></a>
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows/releases"><img src="https://img.shields.io/github/v/release/MarkusSela/PokeTokenBarWindows?display_name=tag&label=release" alt="최신 릴리스"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f" alt="MIT 라이선스"></a>
  <a href="https://ko-fi.com/marukoshi"><img src="https://img.shields.io/badge/Support%20on-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white" alt="Support on Ko-fi"></a>
</p>

<p align="center" aria-label="Language selector">
  <a href="README.md">🇬🇧 English</a>
  &nbsp;|&nbsp;
  <a href="README.zh-CN.md">🇨🇳 简体中文</a>
  &nbsp;|&nbsp;
  <a href="README.it.md">🇮🇹 Italiano</a>
  &nbsp;|&nbsp;
  <a href="README.ja.md">🇯🇵 日本語</a>
  &nbsp;|&nbsp;
  <a href="README.ko.md">🇰🇷 <strong>한국어</strong></a>
</p>

> **현재 릴리스: v0.1.1**

## 프로젝트 소개

PokeTokenBar는 원본 [PokeTokenBar 프로젝트](https://github.com/chattymin/PokeTokenBar)에서 영감을 받은 독립형 데스크톱 동반자입니다. 이 저장소에는 Windows 빌드가 들어 있으며, 로컬 AI 코딩 사용량이 알이 되고, 동반자가 되고, 점점 커지는 포켓몬 도감이 된다는 단순한 아이디어를 이어갑니다.

앱은 알림 영역에 상주하며 필요할 때 작은 Home 패널을 엽니다. 공급자 데이터는 컴퓨터에 남고, 동반자의 진행 상태는 별도로 저장됩니다.

## ✨ 주요 기능

- 🥚 **사용량을 진행도로 변환:** 로컬 사용량이 현재 알을 진행시키고, 알은 부화하고 진화한 뒤 졸업할 수 있습니다.
- 📊 **중요한 수치를 표시:** 데이터 소스가 제공하는 경우 일간, 주간, 월간 및 롤링 사용량을 확인할 수 있습니다.
- 📚 **컬렉션을 구성:** 졸업한 동반자를 포켓몬 도감에 보관하고 Catch Log에서 개별 기록을 확인합니다.
- 🛍️ **작은 보상 순환을 추가:** 상점과 가방에서 알, Rare Candy, Mint, Shiny Charm, 소모품 Poké Doll을 관리합니다.
- 🫧 **방해 없이 실행:** 트레이에서 Home을 열거나 작업 표시줄 버튼을 추가하지 않고 선택 사항인 플로팅 동반자를 화면에 둘 수 있습니다.
- 📁 **추가 로컬 소스 지원:** 도구가 기본 위치 외부에 사용량을 저장하는 경우 JSON 또는 JSONL 폴더를 추가할 수 있습니다.
- 🔒 **경계를 명확하게 유지:** 공급자 데이터는 읽기 전용이며 서버, SSH, Tailscale, Home Assistant 또는 원격 사용량 서비스가 필요하지 않습니다.

## 🔁 진행 방식

1. 앱이 지원되는 사용량 메타데이터를 로컬에서 읽습니다.
2. 새로운 사용량이 현재 알을 진행시킵니다.
3. 부화 판정 시점에 알이 내장 카탈로그에서 포켓몬을 선택합니다.
4. 더 많은 진행을 달성하면 진화 단계가 열리고 결국 동반자가 졸업합니다.
5. 포켓몬 도감과 Catch Log가 로컬 컬렉션 기록을 보관합니다.

진행 상태는 PokeTokenBar에 속합니다. Hermes나 공급자 소스에 데이터를 다시 기록하지 않습니다.

### Poké Doll

Poké Doll은 상점에서 구매하는 소모품이며 가격은 **250,000,000 tokens**입니다. 알이 부화 중일 때 가방에서 활성화하면 다음 부화까지 준비 상태로 유지됩니다. 해당 판정 시점에 도감에 이미 등록된 일반 포켓몬 종은 제외되지만, 색이 다른 변형은 유효합니다. 따라서 Charmander를 보유하고 있어도 shiny Charmander는 후보가 될 수 있습니다. Doll은 다음 부화에만 영향을 주며 현재 포켓몬이나 알의 진행도를 변경하지 않습니다.

## 📸 스크린샷

아래 스크린샷은 합성 값과 중립적인 데모 경로를 사용합니다. 각 이미지 옆에 해당 화면의 용도를 설명했습니다. 개인 계정이나 개인 데스크톱을 캡처한 자료가 아닙니다.

<table class="screenshot-table">
  <thead>
    <tr>
      <th width="40%">스크린샷</th>
      <th align="left">표시 내용</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-home.gif" width="300" alt="합성 사용량과 동반자 진행도를 보여 주는 애니메이션 Home 패널"><br>
        <strong>🏠 Home</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>시작하는 곳입니다.</strong><br>
        Home은 현재 알 또는 포켓몬, 다음 단계까지의 진행도, 사용량 합계, 공급자 정보와 제한 상태를 하나의 작은 패널에 보여 줍니다. 트레이에서 열리며 작업 표시줄에 두 번째 버튼을 만들지 않습니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/tray-and-popover.png" width="420" alt="알림 영역 아이콘과 Home 패널을 보여 주는 그림"><br>
        <strong>📍 트레이 접근</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>트레이 중심의 데스크톱 흐름입니다.</strong><br>
        진입점을 보여 주는 중립적인 그림입니다. 알림 영역 아이콘으로 Home을 열고, 컨텍스트 메뉴에서 새로 고침 또는 종료를 할 수 있으며, 패널을 닫아도 PokeTokenBar는 트레이에서 조용히 실행됩니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-shop.png" width="275" alt="Poké Doll을 포함한 합성 진행 아이템 가격을 보여 주는 상점"><br>
        <strong>🛍️ 상점</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>진행 토큰을 사용하는 곳입니다.</strong><br>
        상점에서는 새 알, Rare Egg, 제공된 로컬 잎사귀 아이콘이 있는 Mint, Rare Candy, Shiny Charm 및 Poké Doll을 선택적으로 제공합니다. Poké Doll은 250,000,000 tokens이며 다음 부화를 위해 활성화하면 소모됩니다. 스크린샷의 가격과 지갑 잔액은 합성 데모 값이며 청구 데이터나 실제 계정 잔액이 아닙니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-bag.png" width="275" alt="합성 Rare Candy, Mint 및 Poké Doll 인벤토리를 보여 주는 가방"><br>
        <strong>🎒 가방</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>획득한 아이템을 사용하는 곳입니다.</strong><br>
        가방에는 제공된 Mint 잎사귀 아이콘을 포함한 로컬 아이템 인벤토리가 표시되고, 각 작업을 명확하게 선택할 수 있습니다. 여기서 다음 부화를 위해 Poké Doll을 활성화할 수 있습니다. 표시된 수량과 활성화 상태는 합성 데이터이며 실제 구매 기록을 나타내지 않습니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-pokedex.png" width="275" alt="합성 수집 항목을 보여 주는 포켓몬 도감 격자"><br>
        <strong>📖 포켓몬 도감</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>컬렉션을 한눈에 확인합니다.</strong><br>
        도감에는 발견한 단계, 희귀도 필터, shiny 보유 상태와 트레이 또는 플로팅 동반자에 표시할 대표 포켓몬이 기록됩니다. 종을 선택하면 동반자 표시만 바뀌며 공급자 데이터는 바뀌지 않습니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-catchlog.png" width="275" alt="합성 날짜와 성격을 보여 주는 Catch Log"><br>
        <strong>🗂️ Catch Log</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>각 동반자의 이야기를 보관합니다.</strong><br>
        Catch Log는 현재 동반자와 졸업한 동반자를 분리하고, 각 개체의 진화 계열, 희귀도, 성격 및 중립적인 데모 날짜를 보여 줍니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/settings.png" width="195" alt="일반, 트레이, 동반자, 업데이트 및 지원 설정"><img src="docs/images/screenshot-scan-folders.png" width="195" alt="합성 추가 스캔 폴더를 보여 주는 고급 설정"><br>
        <strong>⚙️ 설정 및 진행</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>두 설정 이미지는 하나의 흐름으로 묶여 있습니다.</strong>
        <ul>
          <li><strong>일반:</strong> 언어, 새로 고침 주기, 제한 표시, 로그인 시 실행 및 대표 포켓몬을 선택합니다.</li>
          <li><strong>트레이:</strong> 트레이 툴팁에 표시할 일일 합계와 제한 세부 정보를 결정합니다.</li>
          <li><strong>동반자:</strong> 플로팅 펫을 표시하거나 숨기고 크기를 조절합니다.</li>
          <li><strong>업데이트:</strong> 업데이트 알림을 받을지와 릴리스 페이지를 확인할지를 선택합니다.</li>
          <li><strong>고급 스캔:</strong> JSON 또는 JSONL 폴더를 추가합니다. `C:\Demo\AI-Logs`는 합성 예시이며 이 폴더들은 읽기 전용입니다.</li>
        </ul>
        이 설정은 PokeTokenBar 자체의 설정과 진행 표시만 변경합니다. Hermes나 다른 공급자의 파일은 수정하지 않습니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/floating-pet.png" width="153" alt="정적인 플로팅 동반자 창"><br>
        <strong>🫧 플로팅 동반자</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>별도의 동반자 창입니다.</strong><br>
        Home을 닫은 동안에도 선택 사항인 펫을 계속 표시할 수 있습니다. 투명하고 작업 표시줄에서 제외되며 사용량이 새로 고쳐지는 동안 이동하거나 크기가 바뀌지 않고 선택한 대표 포켓몬을 따릅니다.
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/shiny-banner.png" width="275" alt="Shiny 동반자 상태"><br>
        <strong>✨ Shiny 상태</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>고유한 시각적 표현을 가진 희귀한 결과입니다.</strong><br>
        이 배너는 앱이 shiny 동반자와 알림 순간을 어떻게 표현하는지 보여 줍니다. 정적이고 합성된 문서용 상태입니다.
      </td>
    </tr>
  </tbody>
</table>

전체 이미지 색인과 문서 데이터를 익명으로 유지하는 규칙은 [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md)를 참조하세요.

## 🔌 로컬 소스

앱은 각 소스를 독립적으로 확인하고 설치되지 않은 위치는 건너뜁니다. 현재 기본 제공 리더는 다음을 지원합니다.

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
- Hermes Agent 로컬 SQLite 사용량

PokeTokenBar는 합계와 귀속에 필요한 사용량 메타데이터를 읽습니다. 프롬프트나 메시지 본문은 필요하지 않습니다. Hermes 데이터는 읽기 전용으로 열리며 사용 중인 SQLite WAL 데이터베이스와 호환됩니다.

공식 쿼터 값은 로컬 소스가 제공하는 경우에만 표시됩니다. 데이터를 사용할 수 없으면 인터페이스가 그 사실을 표시하며 임의의 백분율이나 재설정 시간을 만들어 내지 않습니다.

## 🔒 개인정보 보호와 로컬 데이터

PokeTokenBar는 로컬 데이터를 중심으로 설계되었습니다.

- 텔레메트리나 분석 서비스가 없습니다.
- 사용량 데이터를 업로드하지 않습니다.
- 원격 데이터베이스가 없습니다.
- SSH, Tailscale 또는 Home Assistant에 의존하지 않습니다.
- 공급자 데이터베이스와 로그 파일은 읽기 전용입니다.
- 프롬프트, 자격 증명, API 키, 토큰, 쿠키 및 연결 문자열을 저장소나 릴리스 자산에 보관하지 않습니다.
- 동반자의 진행 상태는 저장소 외부의 일반 애플리케이션 데이터 디렉터리에 보관됩니다.
- 내보내기는 사용자가 명시적으로 수행하는 작업이며 개인정보로 취급해야 합니다.

릴리스 감사는 개인 절대 경로, 자격 증명처럼 보이는 값, 로컬 데이터베이스 파일, 로그와 동반자 상태를 거부합니다. 자세한 내용은 [`SECURITY.md`](SECURITY.md)와 [`RELEASE.md`](RELEASE.md)를 참조하세요.

## 📦 설치

현재 릴리스는 `v0.1.1`입니다.

1. [Releases 페이지](https://github.com/MarkusSela/PokeTokenBarWindows/releases)를 엽니다.
2. `PokeTokenBar-Windows-Setup-<version>.exe`를 다운로드합니다.
3. 첨부된 `SHA256SUMS.txt`로 SHA-256 값을 확인합니다.
4. 설치 프로그램을 실행합니다. PokeTokenBar는 알림 영역에서 시작하며 아이콘을 클릭하면 Home이 열립니다.

현재 설치 프로그램에는 Authenticode 서명이 없으므로 Windows SmartScreen이 경고를 표시할 수 있습니다. 설치하기 전에 릴리스 출처와 체크섬을 확인하세요.

## 🧰 소스에서 빌드

필요 조건:

- Windows 10 또는 11
- Node.js 22 이상
- npm

```shell
npm ci
npm test
node --check main.cjs
npm run audit:release
npm run dist
```

설치 프로그램은 `dist/PokeTokenBar-Windows-Setup-<version>.exe`에 생성되고 압축이 풀린 애플리케이션은 `dist/win-unpacked/`에 생성됩니다.

깨끗하게 검증하려면 다시 빌드하기 전에 기존 PokeTokenBar 프로세스를 닫으세요. 일반 실행 경로는 계속 트레이 우선이며 진단용 실행은 문서화된 `PTB_OPEN=1` 테스트 경로에서만 사용합니다.

크로스 플랫폼 개발은 [`docs/LINUX-WEB-DOCKER.md`](docs/LINUX-WEB-DOCKER.md)에 문서화되어 있습니다. Linux AppImage/deb 대상, 로컬 브라우저 Home, 읽기 전용 API 경계, Wayland 폴백 및 헤드리스 Docker 프로필을 다룹니다.

Docker 서버의 Compose 프로필은 루프백에 바인딩되고 `public-readonly` 모드로 시작합니다. 명시된 읽기 전용 디렉터리에서 Hermes를 읽고 동반자 진행 상태는 별도의 `/data` 바인드에 저장합니다. 호스트 디렉터리 권한, LAN/Homepage 읽기 전용 구성과 루프백 전용 변경 허용에 대해서는 Docker 섹션을 참조하세요.

## 🤝 기여하기

Issue와 Pull Request를 환영합니다. 다음을 지켜 주세요.

- 가장 작은 재현 단계를 설명하세요.
- 가능한 경우 합성 데이터를 사용하세요.
- 공급자 로그, Hermes 데이터베이스, 프롬프트, 자격 증명, 쿠키 또는 내보낸 저장 파일을 첨부하지 마세요.
- 트레이 우선 수명 주기와 공급자 읽기 전용 경계를 유지하세요.

로컬 테스트 흐름은 [`CONTRIBUTING.md`](CONTRIBUTING.md)에서 시작하세요.

## 🔗 링크

- [프로젝트 저장소](https://github.com/MarkusSela/PokeTokenBarWindows)
- [릴리스](https://github.com/MarkusSela/PokeTokenBarWindows/releases)
- [문제 신고](https://github.com/MarkusSela/PokeTokenBarWindows/issues/new)
- [원본 PokeTokenBar 프로젝트](https://github.com/chattymin/PokeTokenBar)

## 💛 후원

PokeTokenBar가 유용하다면 [Ko-fi](https://ko-fi.com/marukoshi)에서 유지 관리 작업을 후원할 수 있습니다. 후원은 유지 관리, 테스트와 인터페이스 개선에 도움이 되며 기능을 잠금 해제하지 않고 사용량 데이터를 어디에도 보내지 않습니다.

## 🙏 감사의 말

이 빌드에 영감을 준 동반자 개념과 진행 순환을 제공한 [원본 PokeTokenBar 프로젝트](https://github.com/chattymin/PokeTokenBar)에 감사드립니다.

이 프로젝트는 다음도 사용합니다.

- 데스크톱 런타임을 위한 [Electron](https://www.electronjs.org/)
- 포켓몬 데이터와 이미지 제공을 위한 [PokéAPI](https://pokeapi.co/) 및 [PokéAPI sprites 저장소](https://github.com/PokeAPI/sprites)
- 읽기 전용 집계를 가능하게 하는 로컬 AI 도구와 해당 유지 관리자
- 비공개 로그나 자격 증명을 공유하지 않고 재현 가능한 피드백을 제공하는 테스터와 Issue 제보자

## 📄 라이선스

이 저장소의 소스 코드는 [MIT 라이선스](LICENSE)로 배포됩니다. 라이선스는 이 프로젝트의 소스 코드에 적용되며 제3자 상표, 아트워크 또는 앱이 접근하는 데이터에 대한 권리를 부여하지 않습니다.

PokeTokenBar는 비공식 비상업 팬 프로젝트입니다. Nintendo, Game Freak, Creatures Inc. 또는 The Pokémon Company와 제휴하거나 승인, 후원 또는 허가를 받지 않았습니다. "Pokémon"과 관련 명칭, 캐릭터 및 이미지는 각 소유자의 자산입니다.

애플리케이션은 어떤 종류의 보증도 없이 "있는 그대로" 제공됩니다. 이 고지는 법률 자문이 아닙니다.
