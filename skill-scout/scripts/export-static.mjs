import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, ".pages");
const recommendations = JSON.parse(
  await readFile(path.join(projectRoot, "data/recommendations.json"), "utf8"),
);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const { issue, watchlist } = recommendations;
const dimensions = issue.dimensions
  .map(
    ({ label, value, note }) => `
      <div class="dimension"><div><span>${escapeHtml(label)}</span><strong>${Number(value).toFixed(1)}</strong></div><p>${escapeHtml(note)}</p></div>`,
  )
  .join("");
const useCases = issue.useCases.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
const candidates = watchlist
  .map(
    (item, index) => `
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer"><article><span class="candidate-index">0${index + 2}</span><div><span>${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.note)}</p></div><strong>${escapeHtml(item.score)}</strong></article></a>`,
  )
  .join("");

const title = "Skill Scout｜每两天一个真能提效的 Skill";
const description = "每天收集候选，每两天实测并推荐一个真正能提升效率的 Agent Skill。";
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://skills.tideflow.cloud/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="./favicon.svg">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main>
    <nav class="nav"><a class="brand" href="#top" aria-label="Skill Scout 首页"><span class="brand-mark">S</span><span>SKILL SCOUT</span></a><div class="nav-meta"><span class="status-dot"></span>${escapeHtml(issue.cadence)}</div></nav>
    <section class="hero" id="top">
      <div class="hero-copy"><p class="eyebrow">ISSUE ${String(issue.number).padStart(3, "0")} · ${escapeHtml(issue.date)}</p><h1>少一点收藏，<br><em>多一个真能用的 Skill。</em></h1><p class="lede">每两天实测一个 Agent Skill。只推荐能完成真实任务、节省明确时间、并且值得长期留在工具箱里的选择。</p><div class="hero-actions"><a class="primary" href="#pick">查看本期推荐</a><a class="text-link" href="#framework">评测框架 ↘</a></div></div>
      <aside class="issue-card" aria-label="本期推荐摘要"><span class="issue-label">EDITOR'S PICK</span><strong>${String(issue.number).padStart(2, "0")}</strong><div><span>本期结论</span><p>${escapeHtml(issue.summary)}</p></div></aside>
    </section>
    <section class="pick" id="pick"><div class="pick-head"><div><p class="eyebrow">本期推荐 · ${escapeHtml(issue.category)}</p><h2>${escapeHtml(issue.title)}</h2></div><div class="score"><strong>${Number(issue.score).toFixed(1)}</strong><span>/ 10</span></div></div><p class="verdict">${escapeHtml(issue.verdict)}</p><div class="pick-grid"><div class="use-case"><span>最适合</span><h3>${escapeHtml(issue.bestFor)}</h3><ul>${useCases}</ul><a class="source-link" href="${escapeHtml(issue.sourceUrl)}" target="_blank" rel="noreferrer">查看源码与安装说明 ↗</a></div><div class="dimensions">${dimensions}</div></div></section>
    <section class="framework" id="framework"><div class="section-title"><p class="eyebrow">THE REVIEW SYSTEM</p><h2>推荐不是热度榜，<br>而是一套淘汰机制。</h2></div><div class="framework-grid"><article><span>01</span><h3>先看任务</h3><p>它能完成什么真实工作？没有明确场景，不进入候选。</p></article><article><span>02</span><h3>再看证据</h3><p>检查文档、示例、近期维护、安装方式和边界说明。</p></article><article><span>03</span><h3>最后实测</h3><p>用同一个任务跑通，记录节省时间、失败点和替代方案。</p></article><article><span>04</span><h3>给出结论</h3><p>只分三档：推荐、观察、不推荐，并写明适合谁。</p></article></div></section>
    <section class="watchlist"><div class="section-title compact"><p class="eyebrow">NEXT IN LINE</p><h2>候选观察池</h2></div><div class="candidate-list">${candidates}</div></section>
    <footer><span>SKILL SCOUT · tideflow.cloud</span><p>每天收集信号，每两天发布一期。宁缺毋滥。</p></footer>
  </main>
</body>
</html>`;

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), html);
await writeFile(
  path.join(outputDir, "styles.css"),
  (await readFile(path.join(projectRoot, "app/globals.css"), "utf8")).replace(/^@import "tailwindcss";\s*/, ""),
);
await cp(path.join(projectRoot, "public/favicon.svg"), path.join(outputDir, "favicon.svg"));
await cp(path.join(projectRoot, "public/og.png"), path.join(outputDir, "og.png"));
await writeFile(path.join(outputDir, ".nojekyll"), "");

console.log(outputDir);
