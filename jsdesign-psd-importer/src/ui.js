function mergePsdTextStyle(baseStyle, runStyle) {
  const base = baseStyle || {};
  const run = runStyle || {};
  const merged = { ...base, ...run };
  if (base.font || run.font) merged.font = { ...(base.font || {}), ...(run.font || {}) };
  return merged;
}

function getPsdTextTransform(transform) {
  if (!Array.isArray(transform) || transform.length < 4) {
    return { rotation: 0, scaleX: 1, scaleY: 1, matrix: [[1, 0], [0, 1]] };
  }
  const a = Number(transform[0]) || 0;
  const b = Number(transform[1]) || 0;
  const c = Number(transform[2]) || 0;
  const d = Number(transform[3]) || 0;
  const scaleX = Math.hypot(a, b) || 1;
  const scaleY = Math.hypot(c, d) || 1;
  return {
    rotation: Math.atan2(b, a) * 180 / Math.PI,
    scaleX,
    scaleY,
    matrix: [[a, c], [b, d]]
  };
}

function normalizePsdTextScale(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value > 10 ? value / 100 : value;
}

function getPsdSolidFillEffect(effects) {
  if (!effects || effects.disabled === true) return null;
  const fills = Array.isArray(effects.solidFill) ? effects.solidFill : [];
  return [...fills].reverse().find((effect) => {
    return effect && effect.enabled !== false && effect.present !== false && effect.color;
  }) || null;
}

(function () {
  if (typeof document === 'undefined') return;
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  const status = document.getElementById('status');
  const details = document.getElementById('details');
  let busy = false;

  function setStatus(message, tone) {
    status.textContent = message;
    status.dataset.tone = tone || 'neutral';
  }

  function setBusy(value) {
    busy = value;
    fileInput.disabled = value;
    dropZone.classList.toggle('busy', value);
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeColor(color) {
    if (!color) return null;
    if ('fr' in color) return { r: color.fr, g: color.fg, b: color.fb, a: color.a };
    if ('r' in color) return { r: color.r, g: color.g, b: color.b, a: color.a };
    if ('k' in color) {
      const value = 255 * (1 - Math.min(1, color.k > 1 ? color.k / 100 : color.k));
      return { r: value, g: value, b: value, a: color.a };
    }
    return null;
  }

  function getLayerBounds(layer) {
    const own = {
      x: finite(layer.left, 0),
      y: finite(layer.top, 0),
      right: finite(layer.right, finite(layer.left, 0)),
      bottom: finite(layer.bottom, finite(layer.top, 0))
    };
    if (!layer.children || !layer.children.length) return own;
    const children = layer.children.map(getLayerBounds);
    const x = Number.isFinite(layer.left) ? layer.left : Math.min(...children.map((item) => item.x));
    const y = Number.isFinite(layer.top) ? layer.top : Math.min(...children.map((item) => item.y));
    const right = Number.isFinite(layer.right) && layer.right > x
      ? layer.right
      : Math.max(...children.map((item) => item.right));
    const bottom = Number.isFinite(layer.bottom) && layer.bottom > y
      ? layer.bottom
      : Math.max(...children.map((item) => item.bottom));
    return { x, y, right, bottom };
  }

  function canvasToBytes(canvas) {
    if (!canvas || !canvas.width || !canvas.height) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function effectOpacity(value) {
    if (!Number.isFinite(value)) return 1;
    if (value <= 1) return Math.max(0, value);
    if (value <= 100) return Math.max(0, Math.min(1, value / 100));
    return Math.max(0, Math.min(1, value / 255));
  }

  function renderLayerCanvas(layer) {
    const source = layer.canvas;
    const effect = getPsdSolidFillEffect(layer.effects);
    if (!source || !effect || String(effect.blendMode || 'normal').toLowerCase() !== 'normal') return source;
    const color = normalizeColor(effect.color);
    if (!color) return source;
    const divisor = Math.max(color.r || 0, color.g || 0, color.b || 0) <= 1 ? 1 : 255;
    const red = Math.round(255 * (color.r || 0) / divisor);
    const green = Math.round(255 * (color.g || 0) / divisor);
    const blue = Math.round(255 * (color.b || 0) / divisor);
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = 'source-atop';
    context.globalAlpha = effectOpacity(effect.opacity);
    context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    return canvas;
  }

  function mapAlignment(value) {
    const alignment = String(value || '').toLowerCase();
    if (alignment.includes('center')) return 'CENTER';
    if (alignment.includes('right')) return 'RIGHT';
    if (alignment.includes('justify')) return 'JUSTIFIED';
    return 'LEFT';
  }

  function serializeLayer(layer, counters) {
    const bounds = getLayerBounds(layer);
    const common = {
      name: layer.name || '未命名图层',
      x: bounds.x,
      y: bounds.y,
      width: Math.max(1, bounds.right - bounds.x),
      height: Math.max(1, bounds.bottom - bounds.y),
      visible: layer.hidden !== true,
      opacity: finite(layer.opacity, 1),
      blendMode: layer.blendMode || 'normal'
    };

    if (layer.children && layer.children.length) {
      counters.group += 1;
      return { ...common, kind: 'group', children: layer.children.map((child) => serializeLayer(child, counters)) };
    }

    if (layer.text && typeof layer.text.text === 'string') {
      const firstRun = layer.text.styleRuns && layer.text.styleRuns[0];
      const style = mergePsdTextStyle(layer.text.style, firstRun && firstRun.style);
      const paragraphRun = layer.text.paragraphStyleRuns && layer.text.paragraphStyleRuns[0];
      const paragraph = { ...(layer.text.paragraphStyle || {}), ...((paragraphRun && paragraphRun.style) || {}) };
      const transform = getPsdTextTransform(layer.text.transform);
      const horizontalScale = normalizePsdTextScale(style.horizontalScale);
      const verticalScale = normalizePsdTextScale(style.verticalScale);
      const fontScale = transform.scaleY * verticalScale;
      const textTransform = [
        [
          transform.matrix[0][0] * horizontalScale / fontScale,
          transform.matrix[0][1] * verticalScale / fontScale
        ],
        [
          transform.matrix[1][0] * horizontalScale / fontScale,
          transform.matrix[1][1] * verticalScale / fontScale
        ]
      ];
      counters.text += 1;
      return {
        ...common,
        kind: 'text',
        rotation: transform.rotation,
        textTransform,
        textStyle: {
          characters: layer.text.text.replace(/\r/g, '\n').replace(/\n$/, ''),
          fontName: style.font && style.font.name,
          fontSize: Number.isFinite(style.fontSize) ? style.fontSize * fontScale : undefined,
          fauxBold: style.fauxBold === true,
          fauxItalic: style.fauxItalic === true,
          color: normalizeColor(style.fillColor),
          lineHeight: style.autoLeading || !Number.isFinite(style.leading)
            ? undefined
            : style.leading * fontScale,
          letterSpacing: Number.isFinite(style.tracking) ? style.tracking / 10 : undefined,
          align: mapAlignment(paragraph.justification),
          shapeType: layer.text.shapeType || 'point'
        }
      };
    }

    const imageBytes = canvasToBytes(renderLayerCanvas(layer));
    if (imageBytes) {
      counters.image += 1;
      return { ...common, kind: 'image', imageBytes };
    }
    counters.skipped += 1;
    return { ...common, kind: 'skip' };
  }

  async function importFile(file) {
    if (busy) return;
    if (!file || !file.name.toLowerCase().endsWith('.psd')) {
      setStatus('请选择 .psd 文件', 'error');
      return;
    }
    setBusy(true);
    details.textContent = '';
    try {
      setStatus('正在解析 PSD 图层…');
      const buffer = await file.arrayBuffer();
      const psd = agPsd.readPsd(buffer, {
        skipCompositeImageData: true,
        skipThumbnail: true,
        skipLinkedFilesData: true,
        logMissingFeatures: false
      });
      const counters = { text: 0, image: 0, group: 0, skipped: 0 };
      const documentData = {
        name: file.name.replace(/\.psd$/i, ''),
        width: psd.width,
        height: psd.height,
        children: (psd.children || []).map((layer) => serializeLayer(layer, counters))
      };
      setStatus('解析完成，正在写入画布…');
      details.textContent = `文本 ${counters.text} · 图片 ${counters.image} · 分组 ${counters.group}`;
      parent.postMessage({ pluginMessage: { type: 'import-psd', document: documentData } }, '*');
    } catch (error) {
      setBusy(false);
      setStatus(error.message || '无法解析这个 PSD 文件', 'error');
    }
  }

  fileInput.addEventListener('change', () => importFile(fileInput.files[0]));
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    importFile(event.dataTransfer.files[0]);
  });

  window.onmessage = (event) => {
    const message = event.data && event.data.pluginMessage;
    if (!message) return;
    if (message.type === 'import-progress') setStatus(message.message);
    if (message.type === 'import-error') {
      setBusy(false);
      setStatus(message.message || '导入失败', 'error');
    }
    if (message.type === 'import-complete') {
      setBusy(false);
      fileInput.value = '';
      const counts = message.counts || {};
      setStatus('导入完成', 'success');
      details.textContent = `可编辑文本 ${counts.text || 0} · 图片图层 ${counts.image || 0} · 分组 ${counts.group || 0}`;
      if (message.warnings && message.warnings.length) {
        details.textContent += `\n\n提示：${message.warnings.slice(0, 4).join('；')}`;
      }
    }
  };
}());

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mergePsdTextStyle,
    getPsdTextTransform,
    normalizePsdTextScale,
    getPsdSolidFillEffect
  };
}
