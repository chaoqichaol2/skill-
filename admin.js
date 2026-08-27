const resources = [
  {
    id: "figma-context-mcp",
    name: "Figma Context MCP",
    type: "MCP",
    domain: "UI Design",
    source: "GitHub",
    status: "已通过",
    score: 96,
    owner: "Radar Bot",
    updated: "今天 09:10",
    description: "让 AI Agent 读取 Figma 文件结构、组件命名和设计上下文，辅助生成设计评审、交付说明和前端实现建议。",
    reason: "近 24 小时在 MCP 目录和设计工程讨论中出现频率上升，适合设计到代码的交付链路。",
    checks: {
      "设计相关度": 94,
      "可试用价值": 90,
      "来源可信度": 92,
      "重复风险": 12,
    },
    metrics: {
      impressions: 4280,
      visits: 1360,
      detailClicks: 318,
      sourceClicks: 204,
    },
  },
  {
    id: "ux-synthesis-skill",
    name: "UX Research Synthesis Skill",
    type: "Skill",
    domain: "Research",
    source: "Skill Repo",
    status: "待审核",
    score: 87,
    owner: "人工提交",
    updated: "今天 10:24",
    description: "把访谈记录、用户反馈和竞品观察整理成洞察、机会点、用户旅程和设计待办的 Agent Skill。",
    reason: "多个 AI coding / agent 社区开始把研究沉淀做成可复用 Skill，设计相关度高。",
    checks: {
      "设计相关度": 91,
      "可试用价值": 84,
      "来源可信度": 78,
      "重复风险": 18,
    },
    metrics: {
      impressions: 2210,
      visits: 740,
      detailClicks: 168,
      sourceClicks: 82,
    },
  },
  {
    id: "product-shot-flow",
    name: "ComfyUI Product Shot Flow",
    type: "Workflow",
    domain: "Image Gen",
    source: "Community",
    status: "观察中",
    score: 84,
    owner: "Radar Bot",
    updated: "今天 08:42",
    description: "一套用于电商产品图、材质替换和场景化展示的 ComfyUI 工作流，强调可复用节点和批量出图。",
    reason: "视觉生成社区收藏增长明显，多个设计师把它用于产品首图和运营图探索。",
    checks: {
      "设计相关度": 88,
      "可试用价值": 82,
      "来源可信度": 76,
      "重复风险": 24,
    },
    metrics: {
      impressions: 3650,
      visits: 1184,
      detailClicks: 226,
      sourceClicks: 156,
    },
  },
  {
    id: "figma-tokens-auditor",
    name: "Figma Tokens Auditor",
    type: "Plugin",
    domain: "Design System",
    source: "Figma",
    status: "待审核",
    score: 78,
    owner: "人工提交",
    updated: "昨天 18:06",
    description: "检查 Figma 文件中的颜色、字号、间距和组件命名是否符合设计系统 token 规范。",
    reason: "设计系统话题下讨论度稳定，近期插件更新加入了批量报告能力。",
    checks: {
      "设计相关度": 92,
      "可试用价值": 72,
      "来源可信度": 86,
      "重复风险": 31,
    },
    metrics: {
      impressions: 1510,
      visits: 480,
      detailClicks: 96,
      sourceClicks: 54,
    },
  },
  {
    id: "brand-system-promptpack",
    name: "Brand System Prompt Pack",
    type: "Prompt",
    domain: "Branding",
    source: "Newsletter",
    status: "已驳回",
    score: 61,
    owner: "Radar Bot",
    updated: "昨天 14:22",
    description: "面向品牌视觉探索的提示词包，覆盖品牌人格、色彩方向、版式关键词和视觉检查清单。",
    reason: "内容可用，但来源分散且缺少可验证示例，暂不进入今日榜单。",
    checks: {
      "设计相关度": 76,
      "可试用价值": 52,
      "来源可信度": 58,
      "重复风险": 46,
    },
    metrics: {
      impressions: 930,
      visits: 210,
      detailClicks: 32,
      sourceClicks: 14,
    },
  },
  {
    id: "motion-storyboard-agent",
    name: "Motion Storyboard Agent",
    type: "Workflow",
    domain: "Motion",
    source: "Design Blog",
    status: "待审核",
    score: 73,
    owner: "Radar Bot",
    updated: "今天 11:03",
    description: "把产品功能说明转成动效分镜、镜头节奏和关键帧提示，方便设计师进入 After Effects 或 Rive 制作。",
    reason: "动效和产品演示场景中热度增加，但需要补充可复用模板链接。",
    checks: {
      "设计相关度": 86,
      "可试用价值": 64,
      "来源可信度": 70,
      "重复风险": 21,
    },
    metrics: {
      impressions: 1250,
      visits: 356,
      detailClicks: 70,
      sourceClicks: 28,
    },
  },
];

const sourceFeeds = [
  { name: "GitHub / MCP Registry", status: "正常", health: 96, cadence: "每 4 小时", lastRun: "09:20", candidates: 18 },
  { name: "Figma Community", status: "正常", health: 88, cadence: "每天", lastRun: "08:55", candidates: 7 },
  { name: "Design Newsletter", status: "需复核", health: 72, cadence: "每天", lastRun: "07:40", candidates: 5 },
  { name: "Product Hunt", status: "正常", health: 81, cadence: "每天", lastRun: "10:10", candidates: 6 },
  { name: "X / Reddit Signals", status: "噪声偏高", health: 64, cadence: "每 6 小时", lastRun: "06:30", candidates: 4 },
  { name: "人工推荐入口", status: "正常", health: 90, cadence: "实时", lastRun: "11:16", candidates: 2 },
];

const visitTrend = [
  { day: "周二", pv: 960, uv: 420 },
  { day: "周三", pv: 1280, uv: 560 },
  { day: "周四", pv: 1420, uv: 620 },
  { day: "周五", pv: 1710, uv: 790 },
  { day: "周六", pv: 1330, uv: 530 },
  { day: "周日", pv: 1490, uv: 610 },
  { day: "今天", pv: 1860, uv: 840 },
];

let activeSection = "dashboard";
let reviewFilter = "全部";
let selectedReviewId = resources.find((item) => item.status === "待审核")?.id || resources[0].id;

const sectionTitle = document.querySelector("#sectionTitle");
const navButtons = document.querySelectorAll("[data-section]");
const sections = document.querySelectorAll(".console-section");
const metricGrid = document.querySelector("#metricGrid");
const pipeline = document.querySelector("#pipeline");
const todayQueue = document.querySelector("#todayQueue");
const reviewList = document.querySelector("#reviewList");
const reviewDetail = document.querySelector("#reviewDetail");
const reviewCount = document.querySelector("#reviewCount");
const rankingList = document.querySelector("#rankingList");
const visitChart = document.querySelector("#visitChart");
const clickFunnel = document.querySelector("#clickFunnel");
const clickTable = document.querySelector("#clickTable");
const resourceTable = document.querySelector("#resourceTable");
const sourceGrid = document.querySelector("#sourceGrid");
const toast = document.querySelector("#toast");
const publishButton = document.querySelector("#publishButton");
const logoutButton = document.querySelector("#logoutButton");

const sectionNames = {
  dashboard: "工作台",
  review: "上架审核",
  ranking: "榜单运营",
  analytics: "访问与点击",
  resources: "资源库",
  sources: "来源管理",
};

function formatNumber(value) {
  return value.toLocaleString("zh-CN");
}

function getCtr(item) {
  return item.metrics.impressions ? item.metrics.sourceClicks / item.metrics.impressions : 0;
}

function getStatusClass(status) {
  if (status === "待审核" || status === "观察中") return "pending";
  if (status === "已通过" || status === "已上榜") return "approved";
  if (status === "已驳回") return "rejected";
  return "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setSection(sectionId) {
  activeSection = sectionId;
  sectionTitle.textContent = sectionNames[sectionId];

  navButtons.forEach((button) => {
    const isActive = button.dataset.section === sectionId;
    button.classList.toggle("is-active", isActive);
  });

  sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === sectionId);
  });
}

function getTotals() {
  const total = resources.reduce(
    (sum, item) => {
      sum.impressions += item.metrics.impressions;
      sum.visits += item.metrics.visits;
      sum.detailClicks += item.metrics.detailClicks;
      sum.sourceClicks += item.metrics.sourceClicks;
      return sum;
    },
    { impressions: 0, visits: 0, detailClicks: 0, sourceClicks: 0 },
  );

  return {
    pending: resources.filter((item) => item.status === "待审核").length,
    approved: resources.filter((item) => item.status === "已通过").length,
    avgScore: Math.round(resources.reduce((sum, item) => sum + item.score, 0) / resources.length),
    ctr: total.impressions ? Math.round((total.sourceClicks / total.impressions) * 1000) / 10 : 0,
    ...total,
  };
}

function renderMetrics() {
  const totals = getTotals();
  const metrics = [
    { label: "待审核", value: totals.pending, note: "需要今天处理" },
    { label: "今日 PV", value: formatNumber(totals.visits), note: "前台访问" },
    { label: "来源点击", value: formatNumber(totals.sourceClicks), note: `CTR ${totals.ctr}%` },
    { label: "平均评分", value: totals.avgScore, note: "精选池质量" },
  ];

  metricGrid.innerHTML = metrics
    .map(
      (item) => `
        <article class="metric-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <small>${item.note}</small>
        </article>
      `,
    )
    .join("");
}

function renderPipeline() {
  const statusOrder = ["待审核", "观察中", "已通过", "已驳回"];
  pipeline.innerHTML = statusOrder
    .map((status) => {
      const count = resources.filter((item) => item.status === status).length;
      return `
        <div class="pipeline-row">
          <span>${status}</span>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

function renderTodayQueue() {
  todayQueue.innerHTML = resources
    .filter((item) => item.status === "已通过")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(
      (item, index) => `
        <div class="compact-row">
          <span>${index + 1}. ${item.name}</span>
          <strong>${item.score}</strong>
        </div>
      `,
    )
    .join("");
}

function getReviewItems() {
  if (reviewFilter === "全部") return resources;
  return resources.filter((item) => item.status === reviewFilter);
}

function renderReviewList() {
  const items = getReviewItems();
  reviewCount.textContent = `${items.length} 条`;

  if (!items.find((item) => item.id === selectedReviewId) && items.length) {
    selectedReviewId = items[0].id;
  }

  reviewList.innerHTML = items
    .map(
      (item) => `
        <article class="review-card ${item.id === selectedReviewId ? "is-active" : ""}">
          <button type="button" data-select-review="${item.id}">
            <strong>${item.name}</strong>
            <span>${item.description}</span>
            <div class="review-meta">
              <span class="type-pill">${item.type}</span>
              <span>${item.domain}</span>
              <span class="status-pill ${getStatusClass(item.status)}">${item.status}</span>
            </div>
          </button>
        </article>
      `,
    )
    .join("");
}

function renderReviewDetail() {
  const item = resources.find((resource) => resource.id === selectedReviewId) || resources[0];
  if (!item) return;

  reviewDetail.innerHTML = `
    <div class="detail-title-row">
      <div>
        <div class="detail-meta">
          <span class="type-pill">${item.type}</span>
          <span>${item.domain}</span>
          <span class="status-pill ${getStatusClass(item.status)}">${item.status}</span>
        </div>
        <h3>${item.name}</h3>
      </div>
      <div class="score-badge">
        <strong>${item.score}</strong>
        <span>综合评分</span>
      </div>
    </div>

    <p class="detail-summary">${item.description}</p>

    <div class="check-grid">
      ${Object.entries(item.checks)
        .map(
          ([label, value]) => `
            <div class="check-row">
              <span>${label}</span>
              <strong>${value}</strong>
            </div>
          `,
        )
        .join("")}
    </div>

    <section>
      <p class="eyebrow">CURATION NOTE</p>
      <p class="detail-summary">${item.reason}</p>
    </section>

    <div class="review-actions">
      <button class="success-button" type="button" data-review-action="approve">通过上架</button>
      <button class="inline-button" type="button" data-review-action="watch">放入观察</button>
      <button class="danger-button" type="button" data-review-action="reject">驳回</button>
    </div>
  `;
}

function renderRankingList() {
  rankingList.innerHTML = resources
    .filter((item) => item.status === "已通过" || item.status === "观察中")
    .sort((a, b) => b.score - a.score)
    .map(
      (item, index) => `
        <div class="ranking-row">
          <div class="ranking-main">
            <strong>${index + 1}. ${item.name}</strong>
            <span>${item.reason}</span>
            <div class="resource-meta">
              <span class="type-pill">${item.type}</span>
              <span>${item.source}</span>
              <span class="status-pill ${getStatusClass(item.status)}">${item.status}</span>
            </div>
          </div>
          <div class="ranking-actions">
            <button class="inline-button" type="button">置顶</button>
            <button class="inline-button" type="button">隐藏</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderVisitChart() {
  const max = Math.max(...visitTrend.map((item) => item.pv));
  visitChart.innerHTML = visitTrend
    .map(
      (item) => `
        <div class="bar-item">
          <div class="bar-track" title="${item.day} PV ${item.pv} / UV ${item.uv}">
            <span style="height: ${(item.pv / max) * 100}%"></span>
          </div>
          <small>${item.day}</small>
        </div>
      `,
    )
    .join("");
}

function renderClickFunnel() {
  const totals = getTotals();
  const rows = [
    { label: "卡片曝光", value: totals.impressions, percent: 100 },
    { label: "详情点击", value: totals.detailClicks, percent: (totals.detailClicks / totals.impressions) * 100 },
    { label: "来源点击", value: totals.sourceClicks, percent: (totals.sourceClicks / totals.impressions) * 100 },
  ];

  clickFunnel.innerHTML = rows
    .map(
      (row) => `
        <div class="funnel-row">
          <div>
            <span>${row.label}</span>
            <div class="funnel-bar"><span style="width: ${Math.max(row.percent, 4)}%"></span></div>
          </div>
          <strong>${formatNumber(row.value)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderClickTable() {
  clickTable.innerHTML = [...resources]
    .sort((a, b) => getCtr(b) - getCtr(a))
    .map(
      (item) => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.type}</td>
          <td>${formatNumber(item.metrics.impressions)}</td>
          <td>${formatNumber(item.metrics.detailClicks)}</td>
          <td>${formatNumber(item.metrics.sourceClicks)}</td>
          <td>${(getCtr(item) * 100).toFixed(1)}%</td>
        </tr>
      `,
    )
    .join("");
}

function renderResourceTable() {
  resourceTable.innerHTML = resources
    .map(
      (item) => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.type}</td>
          <td>${item.domain}</td>
          <td>${item.source}</td>
          <td><span class="status-pill ${getStatusClass(item.status)}">${item.status}</span></td>
          <td>${item.score}</td>
          <td>${item.updated}</td>
        </tr>
      `,
    )
    .join("");
}

function renderSourceGrid() {
  sourceGrid.innerHTML = sourceFeeds
    .map(
      (source) => `
        <article class="source-card">
          <header>
            <div>
              <strong>${source.name}</strong>
              <span>${source.cadence}抓取 · ${source.lastRun}</span>
            </div>
            <span class="status-pill ${source.health >= 80 ? "approved" : "pending"}">${source.status}</span>
          </header>
          <div class="health-bar"><span style="width: ${source.health}%"></span></div>
          <div class="pipeline-row">
            <span>候选资源</span>
            <strong>${source.candidates}</strong>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAll() {
  renderMetrics();
  renderPipeline();
  renderTodayQueue();
  renderReviewList();
  renderReviewDetail();
  renderRankingList();
  renderVisitChart();
  renderClickFunnel();
  renderClickTable();
  renderResourceTable();
  renderSourceGrid();
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => setSection(button.dataset.section));
});

document.querySelectorAll("[data-section-jump]").forEach((button) => {
  button.addEventListener("click", () => setSection(button.dataset.sectionJump));
});

document.querySelectorAll("[data-review-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    reviewFilter = button.dataset.reviewFilter;
    document.querySelectorAll("[data-review-filter]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    renderReviewList();
    renderReviewDetail();
  });
});

reviewList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-review]");
  if (!button) return;
  selectedReviewId = button.dataset.selectReview;
  renderReviewList();
  renderReviewDetail();
});

reviewDetail.addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-action]");
  if (!button) return;
  const item = resources.find((resource) => resource.id === selectedReviewId);
  if (!item) return;

  const nextStatus = {
    approve: "已通过",
    watch: "观察中",
    reject: "已驳回",
  }[button.dataset.reviewAction];

  item.status = nextStatus;
  item.updated = "刚刚";
  showToast(`${item.name} 已更新为：${nextStatus}`);
  renderAll();
});

publishButton.addEventListener("click", () => {
  showToast("今日榜单已进入发布队列，前台预览可检查排序和文案。");
});

logoutButton.addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    window.location.replace("/login.html");
  }
});

renderAll();
