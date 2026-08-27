# TokenPulse

一个原生 macOS 菜单栏应用，用于查看 Codex、Claude CLI 与 DeepSeek API 的额度、余额、重置时间和 Token 使用情况。

当前版本读取真实本地数据：

- Codex：读取 `~/.codex/sessions` 中的额度窗口、重置时间与累计 Token；仅从 `auth.json` 的 ID Token 解码并脱敏显示邮箱和方案，不显示或复制认证令牌。
- Claude CLI：读取 `~/.claude/projects` 中的 Token 与最近模型。
- DeepSeek API：在设置中连接 API Key，实时读取总余额、充值余额、赠金余额和可用状态；Key 仅保存在 macOS 钥匙串。
- 提醒：支持额度用完、额度重置与 DeepSeek 低余额提醒；提醒开关和金额阈值可在设置中调整。
- Codex 任务灯：菜单栏红点表示任务执行中，绿点表示刚刚完成，60 秒后恢复为灰色待机；完成时发送系统通知。
- 所有计算在本机完成，不上传对话正文或账号数据。
- 设置中可即时切换中文与 English；语言偏好会保存在本机并在下次启动时恢复。

首次启动会统计现有会话；应用只读取各 Codex 文件尾部的最新累计记录，避免重复扫描完整对话历史。

## 构建

```bash
chmod +x build.sh
./build.sh
open "TokenPulse.app"
```

要求 macOS 14 或更高版本。只依赖 Apple Command Line Tools，不要求完整安装 Xcode。
