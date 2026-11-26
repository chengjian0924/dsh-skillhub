# SkillHub 插件 · Linux 包

适用于 DeepSeek Harness 桌面版 Linux 安装。插件本体为纯 JavaScript，Linux 与 Windows 包的功能完全一致，差异仅在默认路径示例与本机配置模板。

## 安装

在有网机器下载 tgz 后，于终端执行：

```bash
dsh plugin --profile desktop add /path/to/skillhub-plugin-<version>-linux.tgz
```

或使用内部 npm 源（需离线可达）：

```bash
npm install -g skillhub-plugin@<version>
dsh plugin --profile desktop add skillhub-plugin@<version>
```

不要用 git 源安装，源码安装会触发 `prepare` 中的 `tsc` 构建，离线环境会失败。

## 前置条件

- DeepSeek Harness 桌面版 ≥ 0.2.1-rc.3，且内置 `@deepseek-ai/dsh-desktop-host/lib/cli.js`。
- Node.js ≥ 22（由宿主提供）。
- 插件运行不需要公网：搜索、详情、安装均走 `skillhub.json` 里的 `apiBase`。

## 私有源配置

复制包内 `skillhub.json.example` 到 `$HOME/.dsh/skillhub.json`，按实际环境修改：

```json
{
  "apiBase": "http://skillhub.internal/api",
  "webBase": "http://skillhub.internal",
  "skillsDir": "/home/<用户名>/.dsh/skills"
}
```

`skillsDir` 用绝对路径。若 `$HOME` 未设置，需显式配置，否则会落到 `os.homedir()` 的回退值。`webBase` 不在设置页暴露，只能写文件。

## Linux 特有注意事项

- 文件系统大小写敏感：zip 内必须精确包含 `SKILL.md`，写成 `skill.md` 会被拒绝安装。
- `~/.dsh/skills` 依赖 `HOME` 环境变量，容器或服务账号下请显式配置 `skillsDir` 或 `DSH_HOME`。
- 自签证书需给 DSH 进程设置 `NODE_EXTRA_CA_CERTS`。
- 图标代理仅接受 `https://`，内网 `http` 图标不会显示。
