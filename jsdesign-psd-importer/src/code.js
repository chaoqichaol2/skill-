const BLEND_MODES = {
  'pass through': 'PASS_THROUGH',
  normal: 'NORMAL',
  multiply: 'MULTIPLY',
  screen: 'SCREEN',
  overlay: 'OVERLAY',
  darken: 'DARKEN',
  lighten: 'LIGHTEN',
  'color dodge': 'COLOR_DODGE',
  'linear dodge': 'LINEAR_DODGE',
  'color burn': 'COLOR_BURN',
  'linear burn': 'LINEAR_BURN',
  'hard light': 'HARD_LIGHT',
  'soft light': 'SOFT_LIGHT',
  difference: 'DIFFERENCE',
  exclusion: 'EXCLUSION',
  hue: 'HUE',
  saturation: 'SATURATION',
  color: 'COLOR',
  luminosity: 'LUMINOSITY'
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeOpacity(value) {
  if (!Number.isFinite(value)) return 1;
  return clamp(value > 1 ? value / 255 : value, 0, 1);
}

function colorToPaint(color) {
  if (!color) return null;
  const divisor = Math.max(color.r || 0, color.g || 0, color.b || 0) > 1 ? 255 : 1;
  return {
    type: 'SOLID',
    color: {
      r: clamp((color.r || 0) / divisor, 0, 1),
      g: clamp((color.g || 0) / divisor, 0, 1),
      b: clamp((color.b || 0) / divisor, 0, 1)
    },
    opacity: color.a === undefined ? 1 : normalizeOpacity(color.a)
  };
}

function mapBlendMode(value) {
  return BLEND_MODES[String(value || '').toLowerCase()] || 'NORMAL';
}

function toByteArray(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  if (value && typeof value === 'object') {
    return new Uint8Array(Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key]));
  }
  return new Uint8Array();
}

function compactFontName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

function getFontPreferences(requestedName, textStyle) {
  const normalized = compactFontName(requestedName);
  const style = textStyle || {};
  const bold = style.fauxBold === true || /(bold|heavy|black|semibold|demibold|medium)/.test(normalized);
  const italic = /(italic|oblique)/.test(normalized);
  const family = normalized.replace(
    /(semibolditalic|demibolditalic|bolditalic|boldoblique|semibold|demibold|extrabold|ultrabold|heavy|black|medium|boldmt|bold|italicmt|italic|oblique|regularmt|regular|roman|mt)+$/,
    ''
  );
  return { normalized, family, bold, italic };
}

function chooseAvailableFont(available, requestedName, fallbackFont, textStyle) {
  const preferences = getFontPreferences(requestedName, textStyle);
  const fonts = available.map((entry) => entry.fontName || entry).filter(Boolean);
  const exact = fonts.find((fontName) => {
    return [fontName.family, `${fontName.family}${fontName.style}`]
      .map(compactFontName)
      .includes(preferences.normalized);
  });
  if (exact) return exact;

  const requestedFamilyMatches = fonts.filter((fontName) => {
    const family = compactFontName(fontName.family);
    return family && preferences.family && (
      family === preferences.family || preferences.normalized.startsWith(family) || family.startsWith(preferences.family)
    );
  });
  const fallbackFamily = compactFontName(fallbackFont && fallbackFont.family);
  const candidates = requestedFamilyMatches.length
    ? requestedFamilyMatches
    : fonts.filter((fontName) => compactFontName(fontName.family) === fallbackFamily);
  if (!candidates.length) return fallbackFont;

  return [...candidates].sort((left, right) => {
    const score = (fontName) => {
      const variant = compactFontName(fontName.style);
      const isBold = /(bold|heavy|black|semibold|demibold|medium)/.test(variant);
      const isItalic = /(italic|oblique)/.test(variant);
      return (isBold === preferences.bold ? 2 : 0) + (isItalic === preferences.italic ? 1 : 0);
    };
    return score(right) - score(left);
  })[0];
}

async function resolveFont(api, requestedName, fallbackFont, fontCache, textStyle) {
  const requested = compactFontName(requestedName);
  if ((requested || (textStyle && (textStyle.fauxBold || textStyle.fauxItalic))) && typeof api.listAvailableFontsAsync === 'function') {
    if (!fontCache.listPromise) fontCache.listPromise = api.listAvailableFontsAsync();
    try {
      const available = await fontCache.listPromise;
      return chooseAvailableFont(available, requestedName, fallbackFont, textStyle);
    } catch (error) {
      // Font enumeration is optional; loading the default font still keeps text editable.
    }
  }
  return fallbackFont;
}

function applyCommonProperties(node, source) {
  node.name = source.name || node.name;
  node.visible = source.visible !== false;
  if ('opacity' in node) node.opacity = normalizeOpacity(source.opacity);
  if ('blendMode' in node) node.blendMode = mapBlendMode(source.blendMode);
  if (!source.textTransform && Number.isFinite(source.rotation) && source.rotation !== 0 && 'rotation' in node) {
    node.rotation = source.rotation;
  }
}

function applyTextTransform(node, source) {
  const matrix = source.textTransform;
  if (!Array.isArray(matrix) || matrix.length !== 2) return;
  const values = [matrix[0]?.[0], matrix[0]?.[1], matrix[1]?.[0], matrix[1]?.[1]];
  if (!values.every(Number.isFinite)) return;
  const x = node.x;
  const y = node.y;
  const syntheticShear = source.textStyle && source.textStyle.fauxItalic ? -0.2 : 0;
  const transformed = syntheticShear === 0 ? matrix : [
    [matrix[0][0], matrix[0][1] + matrix[0][0] * syntheticShear],
    [matrix[1][0], matrix[1][1] + matrix[1][0] * syntheticShear]
  ];
  try {
    node.relativeTransform = [
      [transformed[0][0], transformed[0][1], x],
      [transformed[1][0], transformed[1][1], y]
    ];
  } catch (error) {
    if (Number.isFinite(source.rotation) && 'rotation' in node) node.rotation = source.rotation;
  }
}

function appendAndPosition(node, parent, source, parentOrigin) {
  parent.appendChild(node);
  node.x = (Number(source.x) || 0) - parentOrigin.x;
  node.y = (Number(source.y) || 0) - parentOrigin.y;
}

async function createTextNode(api, source, parent, parentOrigin, context) {
  const node = api.createText();
  appendAndPosition(node, parent, source, parentOrigin);
  applyCommonProperties(node, source);

  const fallbackFont = node.fontName;
  const style = source.textStyle || {};
  const fontName = await resolveFont(api, style.fontName, fallbackFont, context.fontCache, style);
  try {
    await api.loadFontAsync(fontName);
    node.fontName = fontName;
  } catch (error) {
    await api.loadFontAsync(fallbackFont);
    context.warnings.push(`字体「${source.textStyle && source.textStyle.fontName}」未找到，已使用 ${fallbackFont.family}`);
  }

  node.characters = (source.textStyle && source.textStyle.characters) || '';
  if (Number.isFinite(style.fontSize) && style.fontSize > 0) node.fontSize = style.fontSize;
  const paint = colorToPaint(style.color);
  if (paint) node.fills = [paint];
  if (Number.isFinite(style.lineHeight) && style.lineHeight > 0) {
    node.lineHeight = { value: style.lineHeight, unit: 'PIXELS' };
  }
  if (Number.isFinite(style.letterSpacing)) {
    node.letterSpacing = { value: style.letterSpacing, unit: 'PERCENT' };
  }
  if (style.align && 'textAlignHorizontal' in node) node.textAlignHorizontal = style.align;

  const width = Math.max(1, Number(source.width) || 1);
  const height = Math.max(1, Number(source.height) || 1);
  try {
    node.textAutoResize = style.shapeType === 'box' ? 'NONE' : 'WIDTH_AND_HEIGHT';
    if (style.shapeType === 'box') node.resize(width, height);
  } catch (error) {
    // Older JsDesign versions can omit textAutoResize; editable text still imports.
  }
  applyTextTransform(node, source);
  context.counts.text += 1;
  return node;
}

async function createImageNode(api, source, parent, parentOrigin, context) {
  const bytes = toByteArray(source.imageBytes);
  if (!bytes.length) {
    context.warnings.push(`图层「${source.name || '未命名'}」没有可用像素，已跳过`);
    context.counts.skipped += 1;
    return null;
  }
  const image = api.createImage(bytes);
  const node = api.createRectangle();
  appendAndPosition(node, parent, source, parentOrigin);
  node.resize(Math.max(1, Number(source.width) || 1), Math.max(1, Number(source.height) || 1));
  node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  node.strokes = [];
  applyCommonProperties(node, source);
  context.counts.image += 1;
  return node;
}

async function createGroupNode(api, source, parent, parentOrigin, context) {
  const node = api.createFrame();
  appendAndPosition(node, parent, source, parentOrigin);
  node.resize(Math.max(1, Number(source.width) || 1), Math.max(1, Number(source.height) || 1));
  node.fills = [];
  node.strokes = [];
  node.clipsContent = false;
  applyCommonProperties(node, source);
  context.counts.group += 1;
  for (const child of source.children || []) {
    await createLayerNode(api, child, node, { x: Number(source.x) || 0, y: Number(source.y) || 0 }, context);
  }
  return node;
}

async function createLayerNode(api, source, parent, parentOrigin, context) {
  if (!source) return null;
  if (source.kind === 'group') return createGroupNode(api, source, parent, parentOrigin, context);
  if (source.kind === 'text') return createTextNode(api, source, parent, parentOrigin, context);
  if (source.kind === 'image') return createImageNode(api, source, parent, parentOrigin, context);
  context.counts.skipped += 1;
  return null;
}

async function importDocument(api, documentData) {
  if (!documentData || !Number.isFinite(documentData.width) || !Number.isFinite(documentData.height)) {
    throw new Error('缺少有效的 PSD 画布尺寸');
  }
  const context = {
    counts: { text: 0, image: 0, group: 0, skipped: 0 },
    warnings: [],
    fontCache: {}
  };
  const root = api.createFrame();
  root.name = documentData.name || 'PSD 导入';
  root.resize(Math.max(1, documentData.width), Math.max(1, documentData.height));
  root.fills = [];
  root.strokes = [];
  root.clipsContent = true;

  const center = api.viewport && api.viewport.center ? api.viewport.center : { x: 0, y: 0 };
  root.x = Math.round(center.x - documentData.width / 2);
  root.y = Math.round(center.y - documentData.height / 2);

  for (const child of documentData.children || []) {
    await createLayerNode(api, child, root, { x: 0, y: 0 }, context);
  }

  api.currentPage.selection = [root];
  if (api.viewport && typeof api.viewport.scrollAndZoomIntoView === 'function') {
    api.viewport.scrollAndZoomIntoView([root]);
  }
  return { root, counts: context.counts, warnings: [...new Set(context.warnings)] };
}

function initPlugin(api) {
  api.showUI(__html__, { width: 420, height: 560 });
  api.ui.onmessage = async (message) => {
    if (!message || !message.type) return;
    if (message.type === 'close') {
      api.closePlugin();
      return;
    }
    if (message.type !== 'import-psd') return;
    try {
      api.ui.postMessage({ type: 'import-progress', message: '正在创建即时设计图层…' });
      const result = await importDocument(api, message.document);
      api.ui.postMessage({ type: 'import-complete', counts: result.counts, warnings: result.warnings });
      if (typeof api.notify === 'function') api.notify('PSD 已导入');
    } catch (error) {
      api.ui.postMessage({ type: 'import-error', message: error.message || String(error) });
    }
  };
}

if (typeof jsDesign !== 'undefined') initPlugin(jsDesign);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeOpacity,
    colorToPaint,
    mapBlendMode,
    toByteArray,
    applyTextTransform,
    getFontPreferences,
    chooseAvailableFont,
    importDocument
  };
}
