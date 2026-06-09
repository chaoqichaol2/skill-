import crypto from 'node:crypto';

const GITHUB_API = 'https://api.github.com';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 30);
const TOP_N = Number(process.env.TOP_N || 10);
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;
const FEISHU_SECRET = process.env.FEISHU_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const SHOW_WARNINGS = process.env.SHOW_WARNINGS === '1' || process.env.SHOW_WARNINGS === 'true';
const RADAR_SCOPE = process.env.RADAR_SCOPE === 'all' ? 'all' : 'design';

const DESIGN_TERMS = [
  ['figma', 24],
  ['design system', 24],
  ['ui/ux', 22],
  ['product design', 20],
  ['visual design', 18],
  ['interface design', 18],
  ['ux', 16],
  ['ui', 14],
  ['prototype', 14],
  ['wireframe', 14],
  ['brand', 13],
  ['branding', 13],
  ['typography', 12],
  ['layout', 12],
  ['color palette', 12],
  ['frontend design', 12],
  ['front-end design', 12],
  ['image generation', 12],
  ['creative asset', 12],
  ['presentation design', 10],
  ['slides', 8],
  ['design review', 8],
];

const SKILL_TERMS = [
  ['skill.md', 34],
  ['codex skill', 24],
  ['codex skills', 24],
  ['claude skill', 18],
  ['claude skills', 18],
  ['agent skill', 16],
  ['ai assistant skill', 14],
  ['mcp', 8],
  ['prompt', 5],
];

const GENERAL_TERMS = [
  ['mcp', 16],
  ['agent', 14],
  ['automation', 14],
  ['workflow', 12],
  ['github', 12],
  ['browser', 12],
  ['chrome', 10],
  ['notion', 10],
  ['spreadsheet', 10],
  ['presentation', 10],
  ['document', 10],
  ['research', 10],
  ['writing', 10],
  ['testing', 10],
  ['deploy', 9],
  ['security', 9],
  ['database', 9],
  ['python', 8],
  ['javascript', 8],
  ['api', 8],
  ['figma', 8],
  ['design', 8],
  ['docs', 8],
];

const DESIGN_CODE_QUERIES = [
  'filename:SKILL.md figma',
  'filename:SKILL.md "design system"',
  'filename:SKILL.md "ui ux"',
  'filename:SKILL.md "visual design"',
  'filename:SKILL.md "product design"',
  'filename:SKILL.md "image generation"',
  'filename:SKILL.md brand',
  'filename:SKILL.md prototype',
  'filename:SKILL.md presentation',
  'filename:SKILL.md frontend',
  'filename:SKILL.md codex design',
  'filename:SKILL.md claude design',
];

const DESIGN_REPO_QUERIES = [
  'codex skill design',
  'codex skills figma',
  'claude skill design',
  'agent skill "design system"',
  'ai assistant skill figma',
  'skill.md design',
];

const ALL_CODE_QUERIES = [
  'filename:SKILL.md codex',
  'filename:SKILL.md "codex skill"',
  'filename:SKILL.md "claude skill"',
  'filename:SKILL.md "agent skill"',
  'filename:SKILL.md mcp',
  'filename:SKILL.md automation',
  'filename:SKILL.md github',
  'filename:SKILL.md browser',
  'filename:SKILL.md notion',
  'filename:SKILL.md research',
  'filename:SKILL.md writing',
  'filename:SKILL.md testing',
];

const ALL_REPO_QUERIES = [
  'codex skills',
  'claude skills',
  'agent skills',
  'ai assistant skills',
  'mcp agent skill',
  'ai workflow skill',
  '"SKILL.md" codex',
  '"SKILL.md" claude',
];

const ACTIVE_DOMAIN_TERMS = RADAR_SCOPE === 'all' ? GENERAL_TERMS : DESIGN_TERMS;
const ACTIVE_CODE_QUERIES = RADAR_SCOPE === 'all' ? ALL_CODE_QUERIES : DESIGN_CODE_QUERIES;
const ACTIVE_REPO_QUERIES = RADAR_SCOPE === 'all' ? ALL_REPO_QUERIES : DESIGN_REPO_QUERIES;

const warnings = [];
const repoCache = new Map();

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isoDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysSince(dateText) {
  if (!dateText) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - new Date(dateText).getTime()) / 86400000);
}

function normalize(text) {
  return String(text || '').toLowerCase();
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseGitHubRepo(url) {
  const match = String(url || '').match(/github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  if (!match) return '';
  return `${match[1]}/${match[2].replace(/\.git$/i, '')}`;
}

function matchedTerms(text, terms) {
  const lower = normalize(text);
  return terms
    .filter(([term]) => lower.includes(term))
    .map(([term, weight]) => ({ term, weight }));
}

function cappedScore(matches, cap) {
  return Math.min(cap, matches.reduce((sum, item) => sum + item.weight, 0));
}

function freshnessScore(repo) {
  const recentDate = repo?.pushed_at || repo?.updated_at;
  const pushedDays = daysSince(recentDate);
  const createdDays = daysSince(repo?.created_at);
  let score = 0;

  if (pushedDays <= 1) score += 26;
  else if (pushedDays <= 7) score += 22;
  else if (pushedDays <= 14) score += 17;
  else if (pushedDays <= 30) score += 12;
  else if (pushedDays <= 90) score += 6;

  if (createdDays <= LOOKBACK_DAYS) score += 12;
  else if (createdDays <= 90) score += 6;

  return score;
}

function githubQualityScore(repo) {
  const stars = repo?.stargazers_count || 0;
  const forks = repo?.forks_count || 0;
  return Math.min(30, Math.log2(stars + 1) * 4) + Math.min(12, Math.log2(forks + 1) * 2);
}

function requestHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'design-skill-radar',
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...requestHeaders(),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${data.message || text}`);
  }

  return data;
}

async function searchCode(query) {
  const url = new URL(`${GITHUB_API}/search/code`);
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', '12');

  try {
    const data = await fetchJson(url);
    return (data.items || []).map((item) => ({
      source: 'code',
      repoFullName: item.repository.full_name,
      path: item.path,
      htmlUrl: item.html_url,
      contentsUrl: item.url,
    }));
  } catch (error) {
    warnings.push(`代码检索失败：${query} (${error.message})`);
    return [];
  }
}

async function searchRepos(query) {
  const url = new URL(`${GITHUB_API}/search/repositories`);
  url.searchParams.set('q', `${query} pushed:>=${isoDaysAgo(LOOKBACK_DAYS * 3)}`);
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', '10');

  try {
    const data = await fetchJson(url);
    return (data.items || []).map((repo) => ({
      source: 'repo',
      repoFullName: repo.full_name,
      path: 'README.md',
      htmlUrl: repo.html_url,
      repo,
    }));
  } catch (error) {
    warnings.push(`仓库检索失败：${query} (${error.message})`);
    return [];
  }
}

function extractResponseText(data) {
  if (data.output_text) return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n');
}

function parseJsonArray(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf('[');
  const end = source.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  return JSON.parse(source.slice(start, end + 1));
}

function parseJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return {};
  return JSON.parse(source.slice(start, end + 1));
}

async function collectOpenAIWebCandidates() {
  if (!OPENAI_API_KEY) return [];

  const prompt = RADAR_SCOPE === 'all'
    ? [
      `今天是 ${todayLabel()}。请检索全网最近 ${LOOKBACK_DAYS} 天新出现或近期更新的 AI assistant skill。`,
      '关注 Codex skills、Claude skills、agent skills、MCP/workflow skills、SKILL.md 仓库，不限主题领域。',
      '优先真实的 skill 仓库、SKILL.md、官方/作者发布页，覆盖开发、研究、文档、浏览器、GitHub、Notion、设计、数据、测试、自动化等方向。',
      '请返回最多 12 个候选，必须有来源 URL。',
      '只返回 JSON 数组，不要解释。字段：title、url、summary、design_terms、skill_signals、updated_at、github_repo。',
    ].join('\n')
    : [
      `今天是 ${todayLabel()}。请检索全网最近 ${LOOKBACK_DAYS} 天新出现或近期更新的设计相关 skill。`,
      '关注 Codex skills、Claude skills、AI coding assistant skills、agent skills、MCP/workflow skills。',
      '主题优先级：Figma、UI/UX、product design、visual design、design system、brand、prototype、image generation、presentation design、frontend design。',
      '请返回最多 12 个候选，必须有来源 URL。优先真实的 skill 仓库、SKILL.md、官方/作者发布页。',
      '只返回 JSON 数组，不要解释。字段：title、url、summary、design_terms、skill_signals、updated_at、github_repo。',
    ].join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        reasoning: { effort: 'low' },
        tools: [{
          type: 'web_search',
          user_location: {
            type: 'approximate',
            country: 'CN',
            timezone: 'Asia/Shanghai',
          },
        }],
        tool_choice: 'auto',
        include: ['web_search_call.action.sources'],
        input: prompt,
      }),
    });
    const body = await response.text();
    const data = body ? JSON.parse(body) : {};

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${data.error?.message || body}`);
    }

    const rows = parseJsonArray(extractResponseText(data));
    return rows
      .filter((row) => row?.url && row?.title)
      .map((row) => {
        const repoFullName = row.github_repo || parseGitHubRepo(row.url);
        return {
          source: 'web',
          repoFullName,
          path: 'web-search-result',
          htmlUrl: row.url,
          webTitle: row.title,
          webSummary: row.summary || '',
          webDesignTerms: Array.isArray(row.design_terms) ? row.design_terms.join(' ') : '',
          webSkillSignals: Array.isArray(row.skill_signals) ? row.skill_signals.join(' ') : '',
          webUpdatedAt: row.updated_at || '',
        };
      });
  } catch (error) {
    warnings.push(`全网检索失败，已退回 GitHub 检索 (${error.message})`);
    return [];
  }
}

async function getRepo(fullName, fallback) {
  if (!fullName) return fallback || {};
  if (fallback?.full_name) return fallback;
  if (repoCache.has(fullName)) return repoCache.get(fullName);

  try {
    const repo = await fetchJson(`${GITHUB_API}/repos/${fullName}`);
    repoCache.set(fullName, repo);
    return repo;
  } catch (error) {
    warnings.push(`仓库信息读取失败：${fullName} (${error.message})`);
    return fallback || {};
  }
}

async function getFileText(candidate) {
  if (!candidate.contentsUrl) return '';

  try {
    const file = await fetchJson(candidate.contentsUrl);
    if (!file.content || file.encoding !== 'base64') return '';
    return Buffer.from(file.content, 'base64').toString('utf8').slice(0, 14000);
  } catch (error) {
    warnings.push(`文件内容读取失败：${candidate.repoFullName}/${candidate.path} (${error.message})`);
    return '';
  }
}

function extractTitle(candidate, repo, fileText) {
  if (candidate.webTitle) return candidate.webTitle;

  const heading = fileText.match(/^#\s+(.{2,120})$/m)?.[1];
  if (heading) return heading.replace(/\s+/g, ' ').trim();

  const parts = candidate.path.split('/').filter(Boolean);
  if (parts.length > 1 && parts.at(-1).toLowerCase() === 'skill.md') {
    return `${parts.at(-2)} (${repo.full_name})`;
  }

  return repo.name || candidate.repoFullName;
}

function buildCandidateText(candidate, repo, fileText) {
  return [
    candidate.path,
    candidate.webTitle,
    candidate.webSummary,
    candidate.webDesignTerms,
    candidate.webSkillSignals,
    repo.full_name,
    repo.name,
    repo.description,
    (repo.topics || []).join(' '),
    fileText,
  ].filter(Boolean).join('\n');
}

function reasonText(item) {
  const reasons = [];
  const design = item.designMatches.slice(0, 4).map((hit) => hit.term).join('、');
  const skill = item.skillMatches.slice(0, 3).map((hit) => hit.term).join('、');
  const matchLabel = RADAR_SCOPE === 'all' ? '主题/能力命中' : '设计相关命中';

  if (design) reasons.push(`${matchLabel}：${design}`);
  if (skill) reasons.push(`skill 信号：${skill}`);
  if (item.source === 'web') reasons.push('全网检索命中');
  if (item.repo.stargazers_count) reasons.push(`GitHub ${item.repo.stargazers_count} stars`);
  if (daysSince(item.repo.pushed_at || item.repo.updated_at) <= 30) reasons.push('近期有更新');
  if (daysSince(item.repo.created_at) <= LOOKBACK_DAYS) reasons.push('近期新建仓库');

  return reasons.join('；') || '综合相关度较高';
}

function titleCaseName(text) {
  return cleanOneLine(text)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanOneLine(text, maxLength = 180) {
  const value = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*#>\s]+/, '')
    .trim();

  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function extractSkillDescription(fileText) {
  const text = String(fileText || '');
  const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
  const frontmatterDescription = frontmatter?.[1]
    ?.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];

  if (frontmatterDescription) return cleanOneLine(frontmatterDescription, 240);

  const useWhen = text.match(/Use (?:this )?skill when\s+(.{30,260})/i)?.[1];
  if (useWhen) return cleanOneLine(`Use this skill when ${useWhen}`, 240);

  const descriptionLine = text.match(/^description\s*[:：]\s*(.{20,240})$/im)?.[1];
  if (descriptionLine) return cleanOneLine(descriptionLine, 240);

  return '';
}

function firstUsefulParagraph(fileText) {
  return String(fileText || '')
    .split(/\n{2,}/)
    .filter((part) => {
      const trimmed = part.trim();
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```');
    })
    .map((part) => cleanOneLine(part))
    .find((part) => part.length >= 24 && !part.startsWith('#') && !part.startsWith('```')) || '';
}

function inferUseCase(text) {
  const lower = normalize(text);

  if (lower.includes('figma')) return '处理 Figma 设计稿、变量、组件或从设计到代码的交接';
  if (lower.includes('design system')) return '整理设计系统、组件规范和页面视觉一致性';
  if (lower.includes('github')) return '处理 GitHub 仓库、PR、Issue 或 CI 工作流';
  if (lower.includes('browser') || lower.includes('chrome')) return '自动浏览网页、检查页面状态或执行浏览器操作';
  if (lower.includes('notion')) return '整理 Notion 知识库、会议材料或项目文档';
  if (lower.includes('spreadsheet')) return '分析、生成或整理表格数据';
  if (lower.includes('document')) return '撰写、编辑或校对文档';
  if (lower.includes('research')) return '做资料检索、信息汇总和研究简报';
  if (lower.includes('writing') || lower.includes('docs')) return '写作、整理说明文档或生成内容草稿';
  if (lower.includes('testing')) return '生成测试、定位失败原因或补齐验证流程';
  if (lower.includes('deploy')) return '部署应用、检查发布流程或处理运维任务';
  if (lower.includes('security')) return '检查安全风险、权限配置或代码安全问题';
  if (lower.includes('database')) return '处理数据库查询、迁移或数据建模';
  if (lower.includes('python')) return '处理 Python 脚本、数据处理或自动化任务';
  if (lower.includes('javascript')) return '处理 JavaScript/前端工程和脚本自动化';
  if (lower.includes('api')) return '对接 API、整理接口调用或生成集成脚本';
  if (lower.includes('prototype') || lower.includes('wireframe')) return '生成或评审原型、线框图和交互流程';
  if (lower.includes('brand') || lower.includes('branding')) return '沉淀品牌视觉、语气、素材和设计规范';
  if (lower.includes('image generation') || lower.includes('creative asset')) return '生成图片、视觉素材或创意资产';
  if (lower.includes('presentation') || lower.includes('slides')) return '制作或优化设计提案、汇报幻灯片';
  if (lower.includes('frontend design') || lower.includes('front-end design')) return '把界面视觉和前端实现衔接起来';
  if (lower.includes('ui/ux') || lower.includes('ux') || lower.includes('ui')) return '辅助界面、体验、布局和视觉细节设计';
  if (lower.includes('product design')) return '支持产品设计流程，从需求理解到界面方案';
  if (lower.includes('typography') || lower.includes('layout') || lower.includes('color palette')) return '优化字体、版式、配色等视觉表达';

  return '';
}

function inferSkillKind(text) {
  const lower = normalize(text);

  if (lower.includes('mcp')) return 'MCP/工具集成';
  if (lower.includes('agent')) return 'agent 工作流';
  if (lower.includes('codex')) return 'Codex skill';
  if (lower.includes('claude')) return 'Claude skill';
  if (lower.includes('skill.md')) return 'AI 助手 skill';
  if (lower.includes('prompt')) return '提示词/工作流';

  return '设计工作流';
}

function summaryText(candidate, repo, fileText) {
  const evidence = extractSkillDescription(fileText)
    || cleanOneLine(candidate.webSummary)
    || cleanOneLine(repo.description)
    || firstUsefulParagraph(fileText);
  const combinedText = buildCandidateText(candidate, repo, fileText);
  const useCase = inferUseCase(`${combinedText}\n${evidence}`);
  const kind = inferSkillKind(`${combinedText}\n${evidence}`);
  const name = titleCaseName(candidate.webTitle || repo.name || candidate.repoFullName || candidate.path);
  const skillLabel = RADAR_SCOPE === 'design' ? '设计 skill' : 'skill';

  if (useCase) {
    return `这是一个偏 ${kind} 的 ${skillLabel}，主要用于${useCase}。`;
  }

  const design = matchedTerms(combinedText, DESIGN_TERMS)
    .slice(0, 3)
    .map((hit) => hit.term)
    .join('、');

  if (design) {
    return `这是一个和 ${design} 相关的 ${kind}，但公开信息不足，需要点开确认具体用法。`;
  }

  return `${name} 可能是设计相关 ${kind}，但当前公开信息不足，需要点开确认具体用途。`;
}

async function collectCandidates() {
  const webResults = await collectOpenAIWebCandidates();
  const codeResults = [];
  const repoResults = [];

  for (const query of ACTIVE_CODE_QUERIES) {
    codeResults.push(...await searchCode(query));
  }

  for (const query of ACTIVE_REPO_QUERIES) {
    repoResults.push(...await searchRepos(query));
  }

  return uniqueBy([...webResults, ...codeResults, ...repoResults], (item) => {
    const repoKey = item.repoFullName ? item.repoFullName.toLowerCase() : '';
    return `${repoKey || item.htmlUrl}:${item.path}`;
  });
}

async function rankCandidates(candidates) {
  const ranked = [];

  for (const candidate of candidates) {
    const repo = await getRepo(candidate.repoFullName, candidate.repo);
    const fileText = await getFileText(candidate);
    const combinedText = buildCandidateText(candidate, repo, fileText);
    const designMatches = matchedTerms(combinedText, ACTIVE_DOMAIN_TERMS);
    const skillMatches = matchedTerms(combinedText, SKILL_TERMS);
    const rawDesignScore = cappedScore(designMatches, RADAR_SCOPE === 'all' ? 44 : 72);
    const designScore = RADAR_SCOPE === 'all' ? Math.max(20, rawDesignScore) : rawDesignScore;
    const skillScore = cappedScore(skillMatches, 48)
      + (candidate.path.toLowerCase().endsWith('skill.md') ? 20 : 0)
      + (candidate.source === 'web' ? 8 : 0);
    const qualityScore = githubQualityScore(repo);
    const recentScore = freshnessScore(repo);
    const totalScore = RADAR_SCOPE === 'all'
      ? designScore * 0.75 + skillScore * 1.25 + qualityScore + recentScore
      : designScore * 1.15 + skillScore + qualityScore + recentScore;

    if ((RADAR_SCOPE === 'design' && designScore < 12) || skillScore < 25) continue;

    ranked.push({
      ...candidate,
      repo,
      title: extractTitle(candidate, repo, fileText),
      summary: summaryText(candidate, repo, fileText),
      designMatches,
      skillMatches,
      designScore,
      skillScore,
      qualityScore,
      recentScore,
      totalScore,
      reason: '',
    });
  }

  const recent = ranked.filter((item) => daysSince(item.repo.pushed_at || item.repo.updated_at) <= LOOKBACK_DAYS * 3);
  const source = recent.length >= TOP_N ? recent : ranked;

  return uniqueBy(source
    .map((item) => ({ ...item, reason: reasonText(item) }))
    .sort((a, b) => b.totalScore - a.totalScore)
    , (item) => (item.repoFullName || item.htmlUrl).toLowerCase())
    .slice(0, TOP_N);
}

async function enhanceWithDeepSeek(items) {
  if (!DEEPSEEK_API_KEY || !items.length) return items;

  const candidates = items.map((item, index) => ({
    original_rank: index + 1,
    title: item.title,
    url: item.htmlUrl,
    stars: item.repo.stargazers_count || 0,
    forks: item.repo.forks_count || 0,
    updated_at: item.repo.pushed_at || item.repo.updated_at || item.webUpdatedAt || '',
    repo_description: item.repo.description || item.webSummary || '',
    summary: item.summary,
    purpose_evidence: item.summary,
    matched_design_terms: item.designMatches.slice(0, 8).map((hit) => hit.term),
    matched_skill_terms: item.skillMatches.slice(0, 6).map((hit) => hit.term),
    rule_score: Number(item.totalScore.toFixed(1)),
    rule_reason: item.reason,
  }));

  const prompt = [
    RADAR_SCOPE === 'all'
      ? '你是 AI assistant skill 的筛选编辑。请只基于给定候选做重排，不要新增候选，不要改链接。'
      : '你是设计工具和 AI agent skill 的筛选编辑。请只基于给定候选做重排，不要新增候选，不要改链接。',
    RADAR_SCOPE === 'all'
      ? '排序目标：优先真实 skill / workflow；兼顾通用价值、实际可用性、GitHub stars/forks 和近期更新。'
      : '排序目标：优先真实 skill / workflow；优先和设计工作强相关；兼顾 GitHub stars/forks、近期更新和实际可用性。',
    '请返回 JSON 对象：{"items":[{"original_rank":数字,"ai_score":0到100数字,"summary":"一句中文简介","reason":"一句中文上榜原因"}]}。',
    'summary 必须使用中文，必须说明这个 skill 具体用来做什么，格式接近“用于……”，控制在 80 字以内。',
    '不要直接翻译项目名，不要写“设计相关工具”这种空话；如果证据不足，写清“信息不足，需要点开确认”。',
    'reason 要解释为什么适合设计师或设计工作流，避免泛泛而谈。',
    JSON.stringify(candidates),
  ].join('\n');

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: '你只输出合法 JSON，不输出 Markdown。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    const body = await response.text();
    const data = body ? JSON.parse(body) : {};

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${data.error?.message || body}`);
    }

    const parsed = parseJsonObject(data.choices?.[0]?.message?.content || '');
    const aiRows = Array.isArray(parsed.items) ? parsed.items : [];
    const byOriginalRank = new Map(items.map((item, index) => [index + 1, item]));
    const enhanced = [];

    for (const row of aiRows) {
      const item = byOriginalRank.get(Number(row.original_rank));
      if (!item) continue;
      byOriginalRank.delete(Number(row.original_rank));
      enhanced.push({
        ...item,
        aiScore: Number(row.ai_score) || 0,
        summary: typeof row.summary === 'string' && row.summary.trim() ? cleanOneLine(row.summary, 120) : item.summary,
        reason: typeof row.reason === 'string' && row.reason.trim() ? row.reason.trim() : item.reason,
      });
    }

    return [...enhanced, ...byOriginalRank.values()].slice(0, TOP_N);
  } catch (error) {
    warnings.push(`DeepSeek 重排失败，已使用规则排序 (${error.message})`);
    return items;
  }
}

function formatDate(dateText) {
  if (!dateText) return '未知';
  return dateText.slice(0, 10);
}

function formatReport(items) {
  const title = RADAR_SCOPE === 'all' ? '全量 Skill 雷达日报' : '设计 Skill 雷达日报';
  const sortRule = RADAR_SCOPE === 'all'
    ? 'skill 信号 + 主题覆盖 + GitHub stars/forks + 近期更新/新建'
    : '设计相关度 + skill 信号 + GitHub stars/forks + 近期更新/新建';
  const lines = [
    `${title}｜${todayLabel()}`,
    '',
    `数据源：${OPENAI_API_KEY ? '全网 web search + GitHub Search' : 'GitHub Search'}。排序规则：${sortRule}${DEEPSEEK_API_KEY ? ' + DeepSeek AI 重排' : ''}。检索窗口：最近 ${LOOKBACK_DAYS} 天优先。`,
    '',
  ];

  if (!items.length) {
    lines.push(RADAR_SCOPE === 'all'
      ? '今天没有找到足够明确的新近 skill。建议稍后查看 GitHub Actions 日志中的检索告警。'
      : '今天没有找到足够明确的新近设计相关 skill。建议稍后查看 GitHub Actions 日志中的检索告警。');
  } else {
    items.forEach((item, index) => {
      const stars = item.repo.stargazers_count || 0;
      const forks = item.repo.forks_count || 0;
      lines.push(`${index + 1}. ${item.title}`);
      lines.push(`分数 ${item.totalScore.toFixed(1)}｜★ ${stars}｜fork ${forks}｜更新 ${formatDate(item.repo.pushed_at || item.repo.updated_at)}`);
      lines.push(`简介：${item.summary}`);
      lines.push(`上榜原因：${item.reason}`);
      lines.push(`链接：${item.htmlUrl}`);
      lines.push('');
    });
  }

  if (SHOW_WARNINGS && warnings.length) {
    lines.push(`检索告警：${warnings.slice(0, 3).join('；')}${warnings.length > 3 ? `；另有 ${warnings.length - 3} 条` : ''}`);
  }

  return lines.join('\n').trim();
}

async function sendToFeishu(text) {
  if (DRY_RUN) {
    console.log(text);
    return;
  }

  if (!FEISHU_WEBHOOK) {
    throw new Error('缺少 FEISHU_WEBHOOK。请在 GitHub Secrets 中配置飞书机器人 Webhook。');
  }

  const payload = {
    msg_type: 'text',
    content: { text },
  };

  if (FEISHU_SECRET) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = crypto.createHmac('sha256', `${timestamp}\n${FEISHU_SECRET}`).update('').digest('base64');
    payload.timestamp = timestamp;
    payload.sign = sign;
  }

  const response = await fetch(FEISHU_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`飞书推送失败：${response.status} ${response.statusText} ${body}`);
  }

  const data = body ? JSON.parse(body) : {};
  if (data.code && data.code !== 0) {
    throw new Error(`飞书推送失败：${body}`);
  }

  console.log(`已推送 ${text.length} 字到飞书。`);
}

async function main() {
  const candidates = await collectCandidates();
  const ranked = await enhanceWithDeepSeek(await rankCandidates(candidates));
  const report = formatReport(ranked);
  await sendToFeishu(report);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
