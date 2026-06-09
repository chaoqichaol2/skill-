# 设计 Skill 雷达自动化

这个自动化每天 09:00（Asia/Shanghai）在 GitHub Actions 运行，检索新近出现或近期更新的 skill 线索，按综合相关度排序后把 Top 10 推送到飞书。

当前有两条日报：

- `Daily Design Skill Radar`：设计相关 skill。
- `Daily All Skill Radar`：全量 skill，不限主题领域。

默认会检索 GitHub。配置 `OPENAI_API_KEY` 后，会先用 OpenAI web search 做全网候选召回，再合并 GitHub 搜索和 GitHub 评分。配置 `DEEPSEEK_API_KEY` 后，会在候选结果上做 AI 重排和上榜理由润色。

## 排序逻辑

脚本不是只看关键词。每个候选项会合成这些分数：

- 设计相关度：Figma、design system、UI/UX、visual design、brand、prototype、image generation 等命中情况。
- Skill 信号：`SKILL.md`、Codex skill、Claude skill、agent skill、MCP、prompt 等命中情况。
- GitHub 热度：stars 和 forks。
- 新鲜度：近期更新、近期新建仓库。

推送内容会包含排名、综合分、stars/forks、更新时间、链接和上榜原因。

## GitHub Secrets

在仓库的 `Settings` -> `Secrets and variables` -> `Actions` 里添加：

- `FEISHU_WEBHOOK`：必填，飞书自定义机器人 Webhook。
- `FEISHU_SECRET`：选填，如果飞书机器人开启了签名校验就填写。
- `OPENAI_API_KEY`：推荐，用于启用全网 web search 候选召回。
- `DEEPSEEK_API_KEY`：选填，用于对 GitHub 候选结果做 AI 重排和中文上榜原因优化。

`GITHUB_TOKEN` 不需要手动添加，GitHub Actions 会自动提供。

## 手动测试

本地只看结果，不推送飞书：

```bash
DRY_RUN=1 GITHUB_TOKEN=你的_github_token node scripts/design-skill-radar.mjs
```

推送测试可以在 GitHub Actions 页面手动触发 `Daily Design Skill Radar` workflow。
