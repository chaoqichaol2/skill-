import recommendations from "../data/recommendations.json";

const { issue, watchlist } = recommendations;

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#top" aria-label="Skill Scout 首页"><span className="brand-mark">S</span><span>SKILL SCOUT</span></a>
        <div className="nav-meta"><span className="status-dot" /> {issue.cadence}</div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">ISSUE {String(issue.number).padStart(3, "0")} · {issue.date}</p>
          <h1>少一点收藏，<br /><em>多一个真能用的 Skill。</em></h1>
          <p className="lede">每两天实测一个 Agent Skill。只推荐能完成真实任务、节省明确时间、并且值得长期留在工具箱里的选择。</p>
          <div className="hero-actions"><a className="primary" href="#pick">查看本期推荐</a><a className="text-link" href="#framework">评测框架 ↘</a></div>
        </div>
        <aside className="issue-card" aria-label="本期推荐摘要">
          <span className="issue-label">EDITOR&apos;S PICK</span><strong>{String(issue.number).padStart(2, "0")}</strong>
          <div><span>本期结论</span><p>{issue.summary}</p></div>
        </aside>
      </section>

      <section className="pick" id="pick">
        <div className="pick-head">
          <div><p className="eyebrow">本期推荐 · {issue.category}</p><h2>{issue.title}</h2></div>
          <div className="score"><strong>{issue.score.toFixed(1)}</strong><span>/ 10</span></div>
        </div>
        <p className="verdict">{issue.verdict}</p>
        <div className="pick-grid">
          <div className="use-case">
            <span>最适合</span><h3>{issue.bestFor}</h3>
            <ul>{issue.useCases.map((item) => <li key={item}>{item}</li>)}</ul>
            <a className="source-link" href={issue.sourceUrl} target="_blank" rel="noreferrer">查看源码与安装说明 ↗</a>
          </div>
          <div className="dimensions">
            {issue.dimensions.map(({ label, value, note }) => <div className="dimension" key={label}><div><span>{label}</span><strong>{value.toFixed(1)}</strong></div><p>{note}</p></div>)}
          </div>
        </div>
      </section>

      <section className="framework" id="framework">
        <div className="section-title"><p className="eyebrow">THE REVIEW SYSTEM</p><h2>推荐不是热度榜，<br />而是一套淘汰机制。</h2></div>
        <div className="framework-grid">
          <article><span>01</span><h3>先看任务</h3><p>它能完成什么真实工作？没有明确场景，不进入候选。</p></article>
          <article><span>02</span><h3>再看证据</h3><p>检查文档、示例、近期维护、安装方式和边界说明。</p></article>
          <article><span>03</span><h3>最后实测</h3><p>用同一个任务跑通，记录节省时间、失败点和替代方案。</p></article>
          <article><span>04</span><h3>给出结论</h3><p>只分三档：推荐、观察、不推荐，并写明适合谁。</p></article>
        </div>
      </section>

      <section className="watchlist">
        <div className="section-title compact"><p className="eyebrow">NEXT IN LINE</p><h2>候选观察池</h2></div>
        <div className="candidate-list">
          {watchlist.map((item, index) => <a href={item.url} target="_blank" rel="noreferrer" key={item.name}><article><span className="candidate-index">0{index + 2}</span><div><span>{item.category}</span><h3>{item.name}</h3><p>{item.note}</p></div><strong>{item.score}</strong></article></a>)}
        </div>
      </section>

      <footer><span>SKILL SCOUT · tideflow.cloud</span><p>每天收集信号，每两天发布一期。宁缺毋滥。</p></footer>
    </main>
  );
}
