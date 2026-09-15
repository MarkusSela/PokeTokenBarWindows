<p align="center">
  <img src="assets/app-icon.png" width="144" alt="PokeTokenBar 应用图标">
</p>

<h1 align="center">PokeTokenBar</h1>

<p align="center">
  <strong>将本地 AI 编程使用量转化为宝可梦成长。</strong><br>
  一个安静驻留在系统托盘中的桌面伴侣，将日常开发变成小型收集游戏。
</p>

<p align="center">
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows/actions/workflows/ci.yml"><img src="https://github.com/MarkusSela/PokeTokenBarWindows/actions/workflows/ci.yml/badge.svg" alt="构建状态"></a>
  <a href="https://github.com/MarkusSela/PokeTokenBarWindows/releases"><img src="https://img.shields.io/github/v/release/MarkusSela/PokeTokenBarWindows?display_name=tag&label=release" alt="最新版本"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f" alt="MIT 许可证"></a>
  <a href="https://ko-fi.com/marukoshi"><img src="https://img.shields.io/badge/Support%20on-Ko--fi-ff5e5b?logo=ko-fi&logoColor=white" alt="Support on Ko-fi"></a>
</p>

<p align="center" aria-label="Language selector">
  <a href="README.md">🇬🇧 English</a>
  &nbsp;|&nbsp;
  <a href="README.zh-CN.md">🇨🇳 <strong>简体中文</strong></a>
  &nbsp;|&nbsp;
  <a href="README.it.md">🇮🇹 Italiano</a>
  &nbsp;|&nbsp;
  <a href="README.ja.md">🇯🇵 日本語</a>
  &nbsp;|&nbsp;
  <a href="README.ko.md">🇰🇷 한국어</a>
</p>

> **当前版本：v0.1.1**

## 关于本项目

PokeTokenBar 是一个受原始 [PokeTokenBar 项目](https://github.com/chattymin/PokeTokenBar) 启发的独立桌面伴侣。本仓库包含 Windows 版本，延续了同一个简单想法：本地 AI 编程使用量会变成蛋，然后变成伙伴，最后成为不断扩大的宝可梦图鉴。

应用会驻留在通知区域，需要时打开紧凑的 Home 面板。你的提供商数据保留在本机，而伴侣会单独保存自己的成长进度。

## ✨ 功能概览

- 🥚 **将使用量转化为成长：** 本地使用量会推进当前的蛋，蛋可以孵化、进化并最终毕业。
- 📊 **展示重要数据：** 当数据源提供时，可查看每日、每周、每月和滚动使用量。
- 📚 **建立收藏：** 在宝可梦图鉴中保存已毕业的伙伴，并在捕获记录中查看每个个体。
- 🛍️ **加入轻量奖励循环：** 使用商店和背包管理蛋、神奇糖果、薄荷、闪耀护符和一次性使用的宝可梦玩偶。
- 🫧 **保持安静：** 从系统托盘打开 Home，或让可选的浮动伙伴停留在屏幕上，而不会增加另一个任务栏按钮。
- 📁 **支持额外本地来源：** 当工具把使用量存储在内置位置之外时，可以添加 JSON 或 JSONL 文件夹。
- 🔒 **边界清晰：** 提供商数据以只读方式访问，应用不需要服务器、SSH、Tailscale、Home Assistant 或远程使用量服务。

## 🔁 成长流程

1. 应用在本地读取受支持的使用元数据。
2. 新的使用量会推进当前的蛋。
3. 到达孵化判定点时，蛋会从内置目录中选择一只宝可梦。
4. 更多进度会解锁进化阶段，并最终让伙伴毕业。
5. 图鉴和捕获记录保存本地收藏历史。

成长状态属于 PokeTokenBar。应用不会把数据写回 Hermes 或任何提供商来源。

### 宝可梦玩偶

宝可梦玩偶是商店中的一次性消耗品，价格为 **250,000,000 tokens**。当有蛋正在孵化时，可以从背包中启用它；启用后会持续到下一次孵化。在做出选择时，图鉴中已经出现过的普通宝可梦种类会被排除；闪光变体仍然有效，因此拥有小火龙不会阻止再次获得闪光小火龙。玩偶只影响下一次孵化，不会改变当前宝可梦或蛋的进度。

## 📸 截图

下面的截图使用合成数据和中性的演示路径。每张图片旁边都有对该界面用途的说明。它们是文档素材，不是个人账户或桌面的截图。

<table class="screenshot-table">
  <thead>
    <tr>
      <th width="40%">截图</th>
      <th align="left">展示内容</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-home.gif" width="300" alt="显示合成使用量和伙伴进度的动态 Home 面板"><br>
        <strong>🏠 Home</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>从这里开始。</strong><br>
        Home 将当前的蛋或宝可梦、下一阶段进度、使用量总计、提供商详情和限制状态集中在一个紧凑面板中。它从系统托盘打开，不会创建第二个任务栏按钮。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/tray-and-popover.png" width="420" alt="通知区域图标和 Home 面板的示意图"><br>
        <strong>📍 托盘入口</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>以托盘为先的桌面流程。</strong><br>
        这是入口的中性示意图。通知区域图标可以打开 Home，右键菜单可以刷新或退出，关闭面板后 PokeTokenBar 仍会安静地留在系统托盘中。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-shop.png" width="275" alt="显示合成道具价格和宝可梦玩偶的商店"><br>
        <strong>🛍️ 商店</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>使用成长代币的地方。</strong><br>
        商店提供新蛋、稀有蛋、带有本地叶片图标的薄荷、神奇糖果、闪耀护符和宝可梦玩偶等可选道具。宝可梦玩偶售价 250,000,000 tokens，启用后会在下一次孵化时消耗。截图中的价格和钱包余额都是合成演示值，不是账单数据或账户余额。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-bag.png" width="275" alt="显示合成神奇糖果、薄荷和宝可梦玩偶库存的背包"><br>
        <strong>🎒 背包</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>使用已经获得的道具。</strong><br>
        背包会显示本地道具库存，包括随附的薄荷叶图标，并明确列出每个操作。可以在这里为下一次孵化启用宝可梦玩偶；图中的数量和启用状态是合成数据，不代表真实购买记录。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-pokedex.png" width="275" alt="显示合成收藏条目的宝可梦图鉴网格"><br>
        <strong>📖 宝可梦图鉴</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>一眼查看收藏。</strong><br>
        图鉴记录已发现的阶段、稀有度筛选、闪光收藏，以及托盘或浮动伙伴中显示的代表宝可梦。选择一个种类只会改变伙伴显示，不会改变提供商数据。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/screenshot-collection-catchlog.png" width="275" alt="显示合成日期和性格的捕获记录"><br>
        <strong>🗂️ 捕获记录</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>保存每个伙伴的故事。</strong><br>
        捕获记录将当前伙伴与已经毕业的伙伴分开，并为每个个体显示进化链、稀有度、性格和中性的演示日期。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/settings.png" width="195" alt="包含常规、托盘、伙伴、更新和支持选项的设置"><img src="docs/images/screenshot-scan-folders.png" width="195" alt="包含合成额外扫描文件夹的高级设置"><br>
        <strong>⚙️ 设置与成长</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>两张设置图片属于同一个流程。</strong>
        <ul>
          <li><strong>常规：</strong>选择界面语言、刷新频率、限制显示方式、登录时启动和代表宝可梦。</li>
          <li><strong>托盘：</strong>决定托盘提示中显示哪些每日总量和限制详情。</li>
          <li><strong>伙伴：</strong>显示或隐藏浮动伙伴并调整其大小。</li>
          <li><strong>更新：</strong>选择是否接收更新通知并检查发布页面。</li>
          <li><strong>高级扫描：</strong>添加额外的 JSON 或 JSONL 文件夹。`C:\Demo\AI-Logs` 是合成示例路径；这些文件夹只读。</li>
        </ul>
        这些选项只改变 PokeTokenBar 自身的设置和成长显示，不会修改 Hermes 或其他提供商的文件。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/floating-pet.png" width="153" alt="静态浮动伙伴窗口"><br>
        <strong>🫧 浮动伙伴</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>独立的伙伴窗口。</strong><br>
        Home 关闭时，可选伙伴仍然可以保持显示。它是透明的，不会出现在任务栏中，并会跟随所选代表宝可梦，而不会在使用量刷新时移动或调整大小。
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="docs/images/shiny-banner.png" width="275" alt="闪光伙伴状态"><br>
        <strong>✨ 闪光状态</strong>
      </td>
      <td class="screenshot-explanation">
        <strong>拥有独特视觉表现的稀有结果。</strong><br>
        该横幅展示应用如何呈现闪光伙伴及其通知时刻。这是静态的合成文档状态。
      </td>
    </tr>
  </tbody>
</table>

请参阅 [`docs/SCREENSHOTS.md`](docs/SCREENSHOTS.md)，了解完整图片索引和保持文档数据匿名的规则。

## 🔌 本地来源

应用会独立检查每个来源，并跳过未安装的位置。目前内置读取器覆盖：

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
- Hermes Agent 本地 SQLite 使用量

PokeTokenBar 只读取总量和归属所需的使用元数据，不需要提示词或消息正文。Hermes 数据以只读方式打开，并兼容正在使用 WAL 的 SQLite 数据库。

只有在本地来源提供官方配额值时，应用才会显示这些值。如果数据不可用，界面会明确说明，而不是编造百分比或重置时间。

## 🔒 隐私与本地数据

PokeTokenBar 围绕本地数据设计：

- 没有遥测或分析服务；
- 不上传使用量数据；
- 没有远程数据库；
- 不依赖 SSH、Tailscale 或 Home Assistant；
- 提供商数据库和日志文件以只读方式访问；
- 提示词、凭据、API 密钥、令牌、Cookie 和连接字符串不会存储在仓库或发布资源中；
- 伴侣自己的成长状态保存在正常的应用数据目录中，而不在仓库内；
- 导出是明确的用户操作，应当被视为个人数据。

发布审计会拒绝个人绝对路径、疑似凭据的值、本地数据库文件、日志和伴侣状态。更多细节请参阅 [`SECURITY.md`](SECURITY.md) 和 [`RELEASE.md`](RELEASE.md)。

## 📦 安装

当前版本为 `v0.1.1`。

1. 打开 [Releases 页面](https://github.com/MarkusSela/PokeTokenBarWindows/releases)。
2. 下载 `PokeTokenBar-Windows-Setup-<version>.exe`。
3. 使用随附的 `SHA256SUMS.txt` 验证 SHA-256 值。
4. 运行安装程序。PokeTokenBar 会启动在通知区域；点击其图标即可打开 Home。

当前安装程序没有 Authenticode 签名，因此 Windows SmartScreen 可能显示警告。安装前请检查发布来源和校验值。

## 🧰 从源码构建

要求：

- Windows 10 或 11
- Node.js 22 或更高版本
- npm

```shell
npm ci
npm test
node --check main.cjs
npm run audit:release
npm run dist
```

安装程序会写入 `dist/PokeTokenBar-Windows-Setup-<version>.exe`，解包后的应用会写入 `dist/win-unpacked/`。

为了进行干净的验证，重新构建前请关闭之前的 PokeTokenBar 进程。正常启动路径保持以托盘为先；诊断启动仅用于文档化的 `PTB_OPEN=1` 测试路径。

跨平台开发记录在 [`docs/LINUX-WEB-DOCKER.md`](docs/LINUX-WEB-DOCKER.md) 中，其中包括 Linux AppImage/deb 目标、本地浏览器 Home、只读 API 边界、Wayland 回退和无头 Docker 配置。

对于 Docker 服务器，随附的 Compose 配置绑定到回环地址，并以 `public-readonly` 模式启动。它从明确的只读目录读取 Hermes，并将伴侣成长状态存储在独立的 `/data` 绑定中。有关主机目录权限、局域网/Homepage 只读设置以及仅限回环地址的显式写入选项，请参阅 Docker 部分。

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request。请：

- 描述最小可复现步骤；
- 尽可能使用合成数据；
- 不要附加提供商日志、Hermes 数据库、提示词、凭据、Cookie 或导出的存档；
- 保持以托盘为先的生命周期和提供商只读边界。

本地测试流程请从 [`CONTRIBUTING.md`](CONTRIBUTING.md) 开始。

## 🔗 链接

- [项目仓库](https://github.com/MarkusSela/PokeTokenBarWindows)
- [Releases](https://github.com/MarkusSela/PokeTokenBarWindows/releases)
- [报告问题](https://github.com/MarkusSela/PokeTokenBarWindows/issues/new)
- [原始 PokeTokenBar 项目](https://github.com/chattymin/PokeTokenBar)

## 💛 支持

如果 PokeTokenBar 对你有帮助，可以在 [Ko-fi](https://ko-fi.com/marukoshi) 上支持维护工作。支持将用于维护、测试和界面打磨，不会解锁功能，也不会向任何地方发送使用量数据。

## 🙏 致谢

感谢原始 [PokeTokenBar 项目](https://github.com/chattymin/PokeTokenBar) 提供了本版本所受启发的伙伴概念和成长循环。

本项目还使用了：

- [Electron](https://www.electronjs.org/) 作为桌面运行时；
- [PokéAPI](https://pokeapi.co/) 和 [PokéAPI sprites 仓库](https://github.com/PokeAPI/sprites) 提供宝可梦数据和图像；
- 让只读聚合成为可能的本地 AI 工具及其维护者；
- 在不分享私有日志或凭据的前提下提供可复现反馈的测试者和 Issue 提交者。

## 📄 许可证

本仓库中的源代码以 [MIT 许可证](LICENSE) 发布。该许可证适用于本项目的源代码，但不授予第三方商标、艺术作品或应用访问的数据的权利。

PokeTokenBar 是一个非官方、非商业的同人项目，与 Nintendo、Game Freak、Creatures Inc. 或 The Pokémon Company 没有关联，也未获其认可、赞助或批准。“Pokémon”及相关名称、角色和图像属于各自所有者。

本应用按“现状”提供，不提供任何形式的保证。本声明不是法律建议。
