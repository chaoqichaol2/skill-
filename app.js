const resources = [
  {
    id: "figma-context-mcp",
    name: "Figma Context MCP",
    type: "MCP",
    domain: "UI Design",
    difficulty: "中",
    description: "让 AI Agent 读取 Figma 文件结构、组件命名和设计上下文，辅助生成设计评审、交付说明和前端实现建议。",
    reason: "近 24 小时在 MCP 目录和设计工程讨论中出现频率上升，适合设计到代码的交付链路。",
    scenario: "适合需要把 Figma 组件、页面结构和设计规范交给 Agent 理解的产品设计师或设计工程团队。",
    source: "GitHub",
    sourceUrl: "https://github.com/",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
    imageAlt: "Figma logo",
    heat: {
      today: 96,
      week: 284,
      month: 612,
    },
  },
  {
    id: "product-shot-comfyui",
    name: "ComfyUI Product Shot Flow",
    type: "Workflow",
    domain: "Image Gen",
    difficulty: "中",
    description: "一套用于电商产品图、材质替换和场景化展示的 ComfyUI 工作流，强调可复用节点和批量出图。",
    reason: "视觉生成社区收藏增长明显，多个设计师把它用于产品首图和运营图探索。",
    scenario: "适合电商、品牌和运营设计师快速产出多场景产品视觉草案。",
    source: "Community",
    sourceUrl: "https://github.com/",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    imageAlt: "product shot photography",
    heat: {
      today: 84,
      week: 337,
      month: 488,
    },
  },
  {
    id: "ux-research-skill",
    name: "UX Research Synthesis Skill",
    type: "Skill",
    domain: "Research",
    difficulty: "低",
    description: "把访谈记录、用户反馈和竞品观察整理成洞察、机会点、用户旅程和设计待办的 Agent Skill。",
    reason: "多个 AI coding / agent 社区开始把研究沉淀做成可复用 Skill，设计相关度高。",
    scenario: "适合需要把零散用户材料整理成设计决策输入的 UX、产品和服务设计团队。",
    source: "Skill Repo",
    sourceUrl: "https://github.com/",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    imageAlt: "UX research workshop",
    heat: {
      today: 78,
      week: 193,
      month: 421,
    },
  },
  {
    id: "brand-system-promptpack",
    name: "Brand System Prompt Pack",
    type: "Prompt",
    domain: "Branding",
    difficulty: "低",
    description: "面向品牌视觉探索的提示词包，覆盖品牌人格、色彩方向、版式关键词和视觉检查清单。",
    reason: "被多个设计 Newsletter 收录，适合作为轻量起步资源进入榜单。",
    scenario: "适合品牌设计初期做方向发散、情绪板描述和视觉语言校准。",
    source: "Newsletter",
    sourceUrl: "https://github.com/",
    imageUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=80",
    imageAlt: "brand visual gradient system",
    heat: {
      today: 63,
      week: 149,
      month: 266,
    },
  },
  {
    id: "figma-tokens-auditor",
    name: "Figma Tokens Auditor",
    type: "Plugin",
    domain: "Design System",
    difficulty: "低",
    description: "检查 Figma 文件中的颜色、字号、间距和组件命名是否符合设计系统 token 规范。",
    reason: "设计系统话题下讨论度稳定，近期插件更新加入了批量报告能力。",
    scenario: "适合维护多页面、多业务线 Figma 文件的设计系统负责人。",
    source: "Figma",
    sourceUrl: "https://www.figma.com/community",
    imageUrl: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=80",
    imageAlt: "design system interface work",
    heat: {
      today: 58,
      week: 176,
      month: 534,
    },
  },
  {
    id: "motion-storyboard-agent",
    name: "Motion Storyboard Agent",
    type: "Workflow",
    domain: "Motion",
    difficulty: "中",
    description: "把产品功能说明转成动效分镜、镜头节奏和关键帧提示，方便设计师进入 After Effects 或 Rive 制作。",
    reason: "本周在动效和产品演示场景中热度增加，差异化明显。",
    scenario: "适合产品发布视频、功能演示和交互动效方案的早期构思。",
    source: "Design Blog",
    sourceUrl: "https://github.com/",
    imageUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
    imageAlt: "motion storyboard abstract forms",
    heat: {
      today: 51,
      week: 218,
      month: 301,
    },
  },
  {
    id: "web-handoff-mcp",
    name: "Web Handoff MCP",
    type: "MCP",
    domain: "Frontend",
    difficulty: "高",
    description: "连接设计稿、组件文档和前端仓库，让 Agent 在实现页面时能引用视觉规范和现有组件。",
    reason: "GitHub star 增长不算最高，但设计工程链路完整，适合放入本周观察。",
    scenario: "适合设计系统、前端实现和设计验收高度耦合的团队。",
    source: "GitHub",
    sourceUrl: "https://github.com/",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    imageAlt: "frontend code and design handoff",
    heat: {
      today: 43,
      week: 241,
      month: 698,
    },
  },
  {
    id: "3d-scene-kit",
    name: "3D Scene Kit for Designers",
    type: "Workflow",
    domain: "3D",
    difficulty: "中",
    description: "用 AI 辅助生成产品展示场景、灯光建议和 Three.js 预览参数的轻量 3D 工作流。",
    reason: "本月在 3D 产品展示和网页视觉方向持续升温，适合月榜保留。",
    scenario: "适合需要做网页首屏、产品展示和概念视觉的设计师。",
    source: "Community",
    sourceUrl: "https://github.com/",
    imageUrl: "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?auto=format&fit=crop&w=900&q=80",
    imageAlt: "3D scene render",
    heat: {
      today: 37,
      week: 166,
      month: 579,
    },
  },
];

const fallbackImage = "assets/fallback-cover.svg";

const scoreLabels = {
  today: "今日评分",
  week: "本周评分",
  month: "本月评分",
};

let activePeriod = "today";
let activeType = "all";

const rankList = document.querySelector("#rankList");
const detailDialog = document.querySelector("#detailDialog");
const detailContent = document.querySelector("#detailContent");
const closeButton = document.querySelector(".dialog-close");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const periodSelect = document.querySelector("#periodSelect");

function getVisibleResources() {
  return resources
    .filter((item) => activeType === "all" || item.type === activeType)
    .sort((a, b) => b.heat[activePeriod] - a.heat[activePeriod]);
}

function formatRank(index) {
  return `${index + 1}.`;
}

function renderRankList() {
  const items = getVisibleResources();

  rankList.innerHTML = items
    .map((item, index) => {
      const imageUrl = item.imageUrl || fallbackImage;
      const imageAlt = item.imageAlt || `${item.name} related image`;

      return `
        <article class="rank-card">
          <div class="rank-number">${formatRank(index)}</div>
          <div class="rank-body">
            <div class="rank-heading">
              <h3>${item.name}</h3>
              <div class="rank-tags" aria-label="资源标签">
                <span class="type-pill">${item.type}</span>
                <span class="domain-pill">${item.domain}</span>
                <span class="difficulty-pill">门槛 ${item.difficulty}</span>
              </div>
            </div>
            <p class="rank-desc">${item.description}</p>
            <p class="reason"><strong>上榜原因</strong><span>${item.reason}</span></p>
          </div>
          <div class="rank-meta">
            <figure class="item-visual">
              <img src="${imageUrl}" alt="${imageAlt}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${fallbackImage}';" />
            </figure>
            <div class="score-row">
              <div class="score">
                <strong>+${item.heat[activePeriod]}</strong>
                <span>${scoreLabels[activePeriod]}</span>
              </div>
              <div class="card-actions">
                <button class="detail-button" type="button" data-detail="${item.id}">详情</button>
                <a class="source-button" href="${item.sourceUrl}" target="_blank" rel="noreferrer">来源</a>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  rankList.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.detail));
  });
}

function setActiveButton(selector, value, attr) {
  document.querySelectorAll(selector).forEach((button) => {
    const isActive = button.dataset[attr] === value;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("linggan-radar-theme", theme);

  themeButtons.forEach((button) => {
    const isActive = button.dataset.themeOption === theme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function openDetail(id) {
  const item = resources.find((resource) => resource.id === id);

  detailContent.innerHTML = `
    <div class="detail-content">
      <div class="detail-kicker">
        <span class="type-pill">${item.type}</span>
        <span class="domain-pill">${item.domain}</span>
        <span class="difficulty-pill">使用门槛 ${item.difficulty}</span>
      </div>
      <h2 id="detailTitle">${item.name}</h2>
      <p class="detail-summary">${item.description}</p>

      <div class="detail-grid">
        <div class="detail-stat">
          <span>今日评分</span>
          <strong>+${item.heat.today}</strong>
        </div>
        <div class="detail-stat">
          <span>本周评分</span>
          <strong>+${item.heat.week}</strong>
        </div>
        <div class="detail-stat">
          <span>本月评分</span>
          <strong>+${item.heat.month}</strong>
        </div>
      </div>

      <section class="detail-section">
        <h3>适用场景</h3>
        <p>${item.scenario}</p>
      </section>

      <section class="detail-section">
        <h3>为什么上榜</h3>
        <p>${item.reason}</p>
      </section>

      <section class="detail-section">
        <h3>来源</h3>
        <p>${item.source}</p>
      </section>

      <a class="detail-link" href="${item.sourceUrl}" target="_blank" rel="noreferrer">打开原始来源</a>
    </div>
  `;

  detailDialog.showModal();
}

periodSelect.addEventListener("change", () => {
  activePeriod = periodSelect.value;
  renderRankList();
});

document.querySelectorAll("[data-type]").forEach((button) => {
  button.addEventListener("click", () => {
    activeType = button.dataset.type;
    setActiveButton("[data-type]", activeType, "type");
    renderRankList();
  });
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.themeOption);
  });
});

closeButton.addEventListener("click", () => detailDialog.close());

detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) {
    detailDialog.close();
  }
});

setActiveButton("[data-type]", activeType, "type");
periodSelect.value = activePeriod;
applyTheme(document.documentElement.dataset.theme || "dark");
renderRankList();
