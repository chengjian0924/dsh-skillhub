# skillhub-plugin

[![CI](https://github.com/Tencent/skillhub/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Tencent/skillhub/actions/workflows/ci.yml?query=branch%3Amain)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

DeepSeek Harness 的 [SkillHub](https://skillhub.cn) 插件：在对话中搜索 SkillHub 技能、查看详情，并安装到 Harness 可发现的 skills 目录。

**本版本面向离线/私有化部署**：不启用鉴权，不含 DSH 插件市场，不含在线自更新，不与 npm registry、GitHub API 或 GitHub raw 内容发生运行时交互。Skill 的发现与下载只走配置中的 `apiBase`。

## 功能

- 用公开接口搜索或按分类浏览技能，展示可点击卡片（名称、分类、下载量、简介）
- 详情页包含概述、版本历史、TRACE 评测；标题栏显示 AI 评分、认证发布者与安全标记
- 通过 zip 下载安装到本机，可指定版本；支持列出与卸载
- 侧栏顶部导航 **Skill 广场**：按分类浏览、搜索、安装 Skill，支持「全部 / 已安装」切换
- 卡片在回复正文下方展示（`conversation.chat.turnTail`），不随「已调用工具」折叠
- 界面跟随 Harness 中英文
- 可插拔鉴权扩展点（默认关闭，见下文）

**不包含**：DSH 插件搜索/直装、插件广场、已安装插件 README 预览、设置页在线更新、一键重启宿主。

## 环境要求

- Node.js 22 或更高版本
- pnpm 11（见 `packageManager` 字段）
- DeepSeek Harness Web（按 `0.2.0-rc.2` 接口验证）或 Desktop（按 `0.2.1-rc.3` 接口验证）
- Desktop 仅用于加载插件；本版本不再调用桌面内置 CLI 管理入口安装其他插件

## 安装

在线环境从 npm 安装预构建包：

```sh
dsh plugin --profile web add skillhub-plugin
```

**离线环境**：先在联网机器取得预构建 tarball（GitHub Actions 的 `Build` 工件、`npm pack skillhub-plugin` 或内部 registry 导出），拷贝到内网后执行：

```sh
dsh plugin --profile desktop add /绝对路径/skillhub-plugin-0.2.18.tgz
```

装完重启 Harness（Web 还需强制刷新）。不要从 git 源安装：源码安装会触发 `prepare` 构建脚本，离线环境不具备条件。npm 上的无前缀名 `skillhub` 是另一个项目，请用 `skillhub-plugin`。

**平台构建产物**：`.github/workflows/build.yml` 在 `linux-x64` 与 `win32-x64` 两个 runner 上分别执行 typecheck、测试、构建和打包，产出 `skillhub-plugin-<版本>-<平台>.tgz` 及对应 `.sha256`，在 Actions 运行页的 Artifacts 下载。插件是纯 JavaScript、无原生依赖，两个平台的 `lib/` 逐字节相同；差异只在随包的 `PLATFORM.md`（平台专属安装说明）与 `skillhub.json.example`（`skillsDir` 路径模板）。分平台构建用于验证目标平台工具链并让分发包可追溯，不是提供不同的二进制。离线分发时按目标系统取包，并校验 SHA-256。当前不产出 ARM 专用包：纯 JS 产物在 ARM 上同样可运行。

本地开发：

```sh
dsh plugin --profile web add /绝对路径/to/skillhub/dsh-plugin
```

## 使用

可以直接对 Agent 说：

> 找个能处理 PDF 的 skill
>
> SkillHub 上搜一下周报
>
> 我装了哪些技能
>
> 把刚才那个卸载掉

搜索完成后对话中会显示可点击卡片；点开详情后再安装。

### Agent 工具

| 工具 | 作用 |
| --- | --- |
| `skillhub_search` | 搜索或浏览技能，并展示卡片 |
| `skillhub_install` | 按 slug 安装；可传 `version` |
| `skillhub_list` | 列出已安装技能 |
| `skillhub_uninstall` | 卸载本地技能目录 |

### Skill 广场

侧栏顶部导航的 **Skill 广场** 在主区域打开独立面板，可按分类浏览、关键词搜索并点卡片安装。面板顶部的 **全部 / 已安装** 切换器带已安装计数；「已安装」视图完全不请求远端，展示本机技能元信息（版本、slug、文件数、体积、更新时间），点开为本地概览抽屉，不浏览技能文件内容。

## 配置

打开 **设置 → 插件 → 插件配置 → SkillHub**：

| 项 | 说明 |
| --- | --- |
| API 地址 | 默认 `https://api.skillhub.cn`；私有源填内网地址，支持 `http://` |
| 安装目录 | 默认 `$DSH_HOME/skills`（通常是 `~/.dsh/skills`） |
| 搜索结果上限 | 每批返回的卡片数量，默认 12 |
| 插件 profile | 留空自动跟随宿主；可指定 `web`、`desktop` 或自定义 profile |

设置 UI 不暴露主页地址与鉴权字段。需要改 `webBase`（详情页「打开主页」的域名，默认 `https://skillhub.cn`）或鉴权开关时，编辑 `{DSH_HOME}/skillhub.json`：

```json
{
  "apiBase": "http://skillhub.internal/api",
  "webBase": "http://skillhub.internal",
  "skillsDir": "/data/skills",
  "profile": "desktop",
  "authEnabled": false,
  "authProvider": "none",
  "maxResults": 12,
  "timeoutMs": 20000,
  "sortBy": "score"
}
```

`authOptions` 不会写入该覆盖文件；它只来自宿主配置，避免密钥落到本地 UI 配置。

## 鉴权扩展点

当前构建 `authEnabled: false`，所有请求只带 `user-agent` 与 `accept`，不发送任何凭据。后续需要鉴权时：

1. 在 `src/auth.ts` 实现 `AuthProvider`：`headers(context)` 返回请求头，可读取 `context.options` 与 `context.config`。
2. 调用 `registerAuthProvider(provider)` 注册名称。
3. 宿主配置设置 `authEnabled: true`、`authProvider: '<名称>'`，并把参数放在宿主持有的 `authOptions` 中。

业务代码只需调用统一入口 `authHeaders(cfg)`；`api.ts` 的 `fetchOpts()` 会把返回值交给 `http.ts` 合并。**图标代理 `/skillhub/icon` 刻意不调用该入口**：图标 URL 来自第三方元数据，绝不能携带私有凭据。

## 数据与网络

插件只请求 `apiBase` 下的 SkillHub 公开 API，并把技能包写到配置的 skills 目录。

| 用途 | 请求 |
| --- | --- |
| 搜索 / 浏览 | `GET {apiBase}/api/skills` |
| 技能详情 | `GET {apiBase}/api/v1/skills/{slug}` |
| 版本历史 | `GET {apiBase}/api/v1/skills/{slug}/versions` |
| TRACE 评测 | `GET {apiBase}/api/v1/skills/{slug}/evaluation` |
| 内容签名 | `GET {apiBase}/api/v1/open/skills/{slug}/versions/{version}/signature` |
| 安装包 | `GET {apiBase}/api/v1/download?slug={slug}&source=dsh` |

私有源必须实现搜索、详情与下载；下载需返回 zip 且解压结果含 `SKILL.md`。评测与签名失败会被忽略，版本接口失败会导致详情页版本页报错。图标地址必须是 `https://`（代理端限制）；内网纯 `http` 图标不会显示。

除上述接口外，插件不访问其他远端服务；不请求 GitHub、npm registry 或任何在线鉴权端点。

## 开发

```sh
git clone https://github.com/Tencent/skillhub.git
cd skillhub/dsh-plugin
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

源码在 `src/`，构建输出到 `lib/`。`lib/` 不进版本库。

| 文件 | 作用 |
| --- | --- |
| `src/host.ts` | Cordis 入口：工具注册、systemPrompt、settings、本机路由 |
| `src/api.ts` | 搜索、详情映射与统一 `fetchOpts()` |
| `src/auth.ts` | 鉴权接口、注册表与 `authHeaders()` 统一入口 |
| `src/config-store.ts` | 默认值与 `skillhub.json` 覆盖 |
| `src/local-api.ts` | 本机 `/skillhub` HTTP（搜索、安装、广场、详情）与图标代理 |
| `src/client.js` | 搜索卡片、回复下方卡片、详情弹窗、设置页、Skill 广场 |
| `src/install.ts` / `src/unzip.ts` | zip 下载、解压与本地安装 / 卸载 |
| `src/skill-detail.ts` | 版本历史与 TRACE 评测 |
| `src/runtime-profile.ts` | 识别当前宿主 profile 与 DSH_HOME |

修改 Host（`src/*.ts`）后需要重启 `dsh web`。修改 Client（`src/client.js`）后复制到 `lib/client.js` 并强制刷新即可。

## 安全

安装第三方技能等于在本机落下可被 Agent 读取的文件。zip 安装会拒绝路径穿越，并要求解压结果含 `SKILL.md`。请只安装已验证且你信任的来源。鉴权凭据只应存在于宿主配置，不应写入可被客户端读取的覆盖文件。

漏洞请按 [SECURITY.md](SECURITY.md) 私下报告，不要发公开 Issue。

## 许可证

[MIT](LICENSE)

SkillHub、DeepSeek 等名称归其各自所有者。本项目与它们没有从属或背书关系。
