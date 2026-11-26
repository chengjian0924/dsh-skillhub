# SkillHub 插件 · Windows 包

适用于 DeepSeek Harness 桌面版 Windows 安装。插件本体为纯 JavaScript，Windows 与 Linux 包的功能完全一致，差异仅在默认路径示例与本机配置模板。

## 安装

在有网机器下载 tgz 后，于 Windows 终端执行：

```powershell
dsh plugin --profile desktop add C:\path\to\skillhub-plugin-<version>-windows.tgz
```

或使用内部 npm 源（需离线可达）：

```powershell
npm install -g skillhub-plugin@<version>
dsh plugin --profile desktop add skillhub-plugin@<version>
```

不要用 git 源安装，源码安装会触发 `prepare` 中的 `tsc` 构建，离线环境会失败。

## 前置条件

- DeepSeek Harness 桌面版 ≥ 0.2.1-rc.3，且内置 `@deepseek-ai/dsh-desktop-host/lib/cli.js`。
- Node.js ≥ 22（由宿主提供）。
- 插件运行不需要公网：搜索、详情、安装均走 `skillhub.json` 里的 `apiBase`。

## 私有源配置

复制包内 `skillhub.json.example` 到 `%USERPROFILE%\.dsh\skillhub.json`，按实际环境修改：

```json
{
  "apiBase": "http://skillhub.internal/api",
  "webBase": "http://skillhub.internal",
  "skillsDir": "C:\\Users\\<用户名>\\.dsh\\skills"
}
```

`skillsDir` 用 Windows 绝对路径或正斜杠形式均可，代码内统一做路径穿越校验。`webBase` 不在设置页暴露，只能写文件。

## Windows 特有注意事项

- 文件系统大小写不敏感，安装时 `SKILL.md` 键名检查比 Linux 宽松。
- 图标代理仅接受 `https://`，内网 `http` 图标不会显示。
- Linux 包不可在 Windows 上获得额外能力；两者 `lib/` 内容逐字节相同。
