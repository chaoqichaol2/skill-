# Skill Scout

每天收集 Agent Skill 候选，每两天评测并推荐一个真正能提升效率的选择。

- 推荐内容：`data/recommendations.json`
- 自动候选池：`data/candidates.json`
- 推荐框架：`../docs/skill-scout-framework.md`

## 本地运行

```bash
npm install
npm run dev
npm run build
npm run test:pages
```

站点保留 vinext 版本，同时由 `data/recommendations.json` 生成静态页面，并通过 GitHub Pages 自动发布。
