# Skill Scout

单用户私有 Skill 评测后台。每天收集 Agent Skill 候选，每两天评测一个真正能提升效率的选择。

- 推荐内容：`data/recommendations.json`
- 自动候选池：`data/candidates.json`
- 推荐框架：`../docs/skill-scout-framework.md`

## 本地运行

```bash
npm install
npm run dev
```

本地运行前，在 `.env.local` 配置：

```bash
ADMIN_PASSWORD=你的后台密码
SESSION_SECRET=至少32位的随机字符串
```

使用 `npm run build` 验证生产构建。后台部署到 Vercel，密码仅保存在部署环境变量中，页面禁止搜索引擎收录。
