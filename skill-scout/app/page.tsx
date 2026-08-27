import { redirect } from "next/navigation";
import candidatesJson from "../data/candidates.json";
import recommendations from "../data/recommendations.json";
import { isAuthenticated } from "@/lib/auth";

type Candidate = {
  name?: string;
  title?: string;
  category?: string;
  score?: number;
  note?: string;
  summary?: string;
  reason?: string;
  url?: string;
};

type CandidateData = {
  generatedAt: string;
  items: Candidate[];
};

const { issue, watchlist } = recommendations;
const candidateData = candidatesJson as CandidateData;

const formatScanTime = (value: string) => new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date(value));

export default async function Dashboard() {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <a className="admin-brand" href="#overview" aria-label="Skill Scout 后台首页">
          <span className="brand-mark">S</span>
          <div><strong>SKILL SCOUT</strong><span>PRIVATE CONSOLE</span></div>
        </a>

        <nav className="side-nav" aria-label="后台导航">
          <a className="active" href="#overview"><span>⌂</span>总览</a>
          <a href="#current"><span>◎</span>本期评测</a>
          <a href="#queue"><span>◫</span>候选队列 <b>{candidateData.items.length}</b></a>
          <a href="#framework"><span>◇</span>评分框架</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-state"><i /><div><strong>自动扫描运行中</strong><span>每天 09:00 更新</span></div></div>
          <form action="/api/logout" method="post"><button className="logout-button" type="submit">退出登录 <span>↗</span></button></form>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p>工作台 / 总览</p><h1>早上好，今天看点什么？</h1></div>
          <div className="topbar-actions"><span className="private-pill"><i /> 私有空间</span><span className="avatar">T</span></div>
        </header>

        <div className="dashboard-content" id="overview">
          <section className="metric-grid" aria-label="评测概览">
            <article><div><span>本期评分</span><b className="trend">推荐</b></div><strong>{issue.score.toFixed(1)}</strong><p>{issue.title}</p></article>
            <article><div><span>观察池</span><b>个</b></div><strong>{watchlist.length}</strong><p>等待下一轮实测</p></article>
            <article><div><span>新候选</span><b>个</b></div><strong>{candidateData.items.length}</strong><p>最近扫描 {formatScanTime(candidateData.generatedAt)}</p></article>
            <article><div><span>评测节奏</span><b>天</b></div><strong>2</strong><p>每两天完成一期</p></article>
          </section>

          <section className="current-review" id="current">
            <div className="section-heading"><div><p>ISSUE {String(issue.number).padStart(3, "0")} · {issue.date}</p><h2>本期评测</h2></div><span className="status recommended">推荐</span></div>
            <article className="review-card">
              <div className="review-main">
                <div className="review-title"><div><span>{issue.category}</span><h3>{issue.title}</h3></div><div className="big-score"><strong>{issue.score.toFixed(1)}</strong><span>/ 10</span></div></div>
                <p className="review-verdict">{issue.verdict}</p>
                <div className="review-meta"><span><small>最适合</small>{issue.bestFor}</span><span><small>来源</small>{issue.sourceLabel}</span></div>
                <div className="review-actions"><a href={issue.sourceUrl} target="_blank" rel="noreferrer">打开 Skill 源码 <span>↗</span></a><span>下次评测：2 天后</span></div>
              </div>
              <div className="dimension-list">
                {issue.dimensions.map(({ label, value, note }) => (
                  <div className="dimension-row" key={label}>
                    <div><span>{label}</span><strong>{value.toFixed(1)}</strong></div>
                    <div className="score-track"><i style={{ width: `${value * 10}%` }} /></div>
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <div className="lower-grid">
            <section className="panel" id="queue">
              <div className="panel-heading"><div><p>NEXT IN LINE</p><h2>候选与观察池</h2></div><span>{watchlist.length + candidateData.items.length} 项</span></div>
              <div className="queue-list">
                {candidateData.items.map((item, index) => (
                  <a href={item.url || "#"} target={item.url ? "_blank" : undefined} rel={item.url ? "noreferrer" : undefined} key={`${item.name || item.title}-${index}`}>
                    <span className="queue-index">{String(index + 1).padStart(2, "0")}</span><div><small>{item.category || "自动候选"}</small><strong>{item.name || item.title || "未命名 Skill"}</strong><p>{item.note || item.summary || item.reason || "来自今日自动扫描，等待人工初筛。"}</p></div><b>{typeof item.score === "number" ? item.score : "NEW"}</b>
                  </a>
                ))}
                {watchlist.map((item, index) => (
                  <a href={item.url} target="_blank" rel="noreferrer" key={item.name}>
                    <span className="queue-index">{String(candidateData.items.length + index + 1).padStart(2, "0")}</span><div><small>{item.category}</small><strong>{item.name}</strong><p>{item.note}</p></div><b>{item.score}</b>
                  </a>
                ))}
              </div>
            </section>

            <aside className="panel framework-panel" id="framework">
              <div className="panel-heading"><div><p>REVIEW SYSTEM</p><h2>评分框架</h2></div></div>
              <ol>
                <li><span>01</span><div><strong>先看任务</strong><p>有明确场景才进入候选。</p></div></li>
                <li><span>02</span><div><strong>再看证据</strong><p>检查文档、维护与安装。</p></div></li>
                <li><span>03</span><div><strong>最后实测</strong><p>记录节省时间和失败点。</p></div></li>
                <li><span>04</span><div><strong>给出结论</strong><p>推荐、观察或淘汰。</p></div></li>
              </ol>
              <div className="legend"><span><i className="green" />推荐</span><span><i className="amber" />观察</span><span><i className="gray" />淘汰</span></div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
