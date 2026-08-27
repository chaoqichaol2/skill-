const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const fileMeta = document.querySelector('#fileMeta');
const processButton = document.querySelector('#processButton');
const statusBox = document.querySelector('#status');
const engineBadge = document.querySelector('#engineBadge');
const emptyState = document.querySelector('#emptyState');
const canvasWrap = document.querySelector('#canvasWrap');
const canvas = document.querySelector('#previewCanvas');
const ctx = canvas.getContext('2d');
const previewTitle = document.querySelector('#previewTitle');
const drawHint = document.querySelector('#drawHint');
const clearSelection = document.querySelector('#clearSelection');
const resultBlock = document.querySelector('#resultBlock');
const beforeImage = document.querySelector('#beforeImage');
const afterImage = document.querySelector('#afterImage');
const resultMeta = document.querySelector('#resultMeta');
const downloadButton = document.querySelector('#downloadButton');

let selectedFile = null;
let sourceUrl = null;
let resultUrl = null;
let image = null;
let selection = null;
let drawing = false;
let startPoint = null;

function activeMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function setStatus(message, type = '') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function fitRect() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  return { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight, scale };
}

function resizeCanvas() {
  if (!image) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawCanvas();
}

function drawCanvas() {
  if (!image) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111823';
  ctx.fillRect(0, 0, width, height);
  const rect = fitRect();
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

  if (selection) {
    ctx.save();
    ctx.fillStyle = 'rgba(214, 64, 69, .20)';
    ctx.strokeStyle = '#ff5960';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    ctx.restore();
  } else if (activeMode() === 'doubao') {
    const boxWidth = Math.max(34, rect.width * .038);
    const boxHeight = Math.max(20, rect.height * .075);
    const x = rect.x + rect.width - boxWidth - rect.width * .004;
    const y = rect.y + rect.height - boxHeight - rect.height * .012;
    ctx.save();
    ctx.strokeStyle = '#42a5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    ctx.restore();
  }
}

function pointerPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function clampPoint(point) {
  const rect = fitRect();
  return {
    x: Math.max(rect.x, Math.min(point.x, rect.x + rect.width)),
    y: Math.max(rect.y, Math.min(point.y, rect.y + rect.height)),
  };
}

function updateModeUI() {
  const manual = activeMode() === 'region';
  canvasWrap.classList.toggle('selecting', manual);
  drawHint.hidden = !manual || !image;
  clearSelection.hidden = !manual || !selection;
  if (!manual) selection = null;
  processButton.disabled = !selectedFile || (manual && !selection);
  setStatus(!selectedFile ? '请先导入图片' : manual && !selection ? '请在图片上拖动，框住水印' : '已准备好，可以开始处理');
  drawCanvas();
}

function loadFile(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
    setStatus('请选择 PNG、JPG 或 WebP 图片。', 'error');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    setStatus('图片超过 50 MB，请压缩后重试。', 'error');
    return;
  }

  selectedFile = file;
  selection = null;
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = URL.createObjectURL(file);
  image = new Image();
  image.onload = () => {
    emptyState.hidden = true;
    canvasWrap.hidden = false;
    previewTitle.textContent = file.name;
    fileMeta.textContent = `${image.naturalWidth} × ${image.naturalHeight} · ${(file.size / 1024).toFixed(0)} KB`;
    resultBlock.hidden = true;
    resizeCanvas();
    updateModeUI();
  };
  image.src = sourceUrl;
}

async function processImage() {
  if (!selectedFile) return;
  const mode = activeMode();
  const headers = {
    'Content-Type': selectedFile.type,
    'X-Filename': encodeURIComponent(selectedFile.name),
    'X-Mode': mode,
  };

  if (mode === 'region') {
    const rect = fitRect();
    const x = Math.round((selection.x - rect.x) / rect.scale);
    const y = Math.round((selection.y - rect.y) / rect.scale);
    const width = Math.round(selection.width / rect.scale);
    const height = Math.round(selection.height / rect.scale);
    headers['X-Region'] = `${x},${y},${width},${height}`;
  }

  processButton.disabled = true;
  processButton.textContent = '正在清除…';
  setStatus('正在进行局部修复，请稍候…', 'busy');
  try {
    const response = await fetch('/api/process', { method: 'POST', headers, body: selectedFile });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: '处理失败' }));
      throw new Error(payload.error || '处理失败');
    }

    const blob = await response.blob();
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    beforeImage.src = sourceUrl;
    afterImage.src = resultUrl;
    downloadButton.href = resultUrl;
    const lastDot = selectedFile.name.lastIndexOf('.');
    const base = lastDot > 0 ? selectedFile.name.slice(0, lastDot) : selectedFile.name;
    const extension = lastDot > 0 ? selectedFile.name.slice(lastDot) : '.png';
    downloadButton.download = `${base}-无水印${extension}`;
    const modeText = mode === 'doubao' ? '豆包固定模板' : '手动框选区域';
    resultMeta.textContent = `${modeText} · ${(blob.size / 1024).toFixed(0)} KB`;
    resultBlock.hidden = false;
    setStatus('水印已清除，请检查处理后图片。', 'success');
    resultBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    setStatus(error.message || '处理失败，请改用手动框选。', 'error');
  } finally {
    processButton.textContent = '开始清除水印';
    processButton.disabled = !selectedFile || (mode === 'region' && !selection);
  }
}

fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
for (const type of ['dragenter', 'dragover']) {
  dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('drag'); });
}
for (const type of ['dragleave', 'drop']) {
  dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('drag'); });
}
dropzone.addEventListener('drop', (event) => loadFile(event.dataTransfer.files[0]));
document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener('change', updateModeUI));
processButton.addEventListener('click', processImage);
clearSelection.addEventListener('click', () => { selection = null; updateModeUI(); });

canvas.addEventListener('pointerdown', (event) => {
  if (activeMode() !== 'region' || !image) return;
  drawing = true;
  canvas.setPointerCapture(event.pointerId);
  startPoint = clampPoint(pointerPosition(event));
  selection = { x: startPoint.x, y: startPoint.y, width: 0, height: 0 };
  drawCanvas();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const point = clampPoint(pointerPosition(event));
  selection = {
    x: Math.min(startPoint.x, point.x),
    y: Math.min(startPoint.y, point.y),
    width: Math.abs(point.x - startPoint.x),
    height: Math.abs(point.y - startPoint.y),
  };
  drawCanvas();
});
canvas.addEventListener('pointerup', () => {
  if (!drawing) return;
  drawing = false;
  if (!selection || selection.width < 5 || selection.height < 5) selection = null;
  updateModeUI();
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', () => {
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
});

fetch('/api/health')
  .then((response) => response.json())
  .then((payload) => {
    engineBadge.textContent = payload.ok ? '引擎已就绪' : '引擎未安装';
    engineBadge.className = `badge ${payload.ok ? 'ok' : 'error'}`;
  })
  .catch(() => {
    engineBadge.textContent = '服务连接失败';
    engineBadge.className = 'badge error';
  });
