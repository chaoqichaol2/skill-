const EPSILON = 0.0001;
const DEFAULT_OPTIONS = {
  includeChildren: true,
  step: 1,
  mode: 'round',
  fields: ['x', 'y', 'width', 'height']
};

const FIELD_LABELS = {
  x: 'X',
  y: 'Y',
  width: '宽',
  height: '高'
};

function normalizeOptions(input) {
  const source = input || {};
  const allowedFields = ['x', 'y', 'width', 'height'];
  const hasFieldSelection = Array.isArray(source.fields);
  const fields = hasFieldSelection
    ? source.fields.filter((field) => allowedFields.includes(field))
    : DEFAULT_OPTIONS.fields.slice();

  return {
    includeChildren: source.includeChildren !== false,
    step: source.step === 0.5 ? 0.5 : 1,
    mode: ['round', 'floor', 'ceil'].includes(source.mode) ? source.mode : 'round',
    fields
  };
}

function roundToGrid(value, step, mode) {
  const scaled = value / step;
  const operation = mode === 'floor' ? Math.floor : mode === 'ceil' ? Math.ceil : Math.round;
  return Math.round(operation(scaled) * step * 10000) / 10000;
}

function isOffGrid(value, step) {
  return Math.abs(value - roundToGrid(value, step, 'round')) > EPSILON;
}

function collectNodes(selection, includeChildren) {
  const result = [];
  const seen = new Set();

  function visit(node) {
    if (!node || seen.has(node.id)) return;
    seen.add(node.id);
    result.push(node);
    if (includeChildren && Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  (selection || []).forEach(visit);
  return result;
}

function hasLockedAncestor(node) {
  let parent = node && node.parent;
  while (parent) {
    if (parent.locked === true) return true;
    parent = parent.parent;
  }
  return false;
}

function isInsideInstance(node) {
  let parent = node && node.parent;
  while (parent) {
    if (parent.type === 'INSTANCE') return true;
    parent = parent.parent;
  }
  return false;
}

function getBlockReason(node, field) {
  if (node.locked === true || hasLockedAncestor(node)) return '图层已锁定';
  if (isInsideInstance(node)) return '实例内部不可安全修改';

  if ((field === 'x' || field === 'y') && node.parent) {
    const parentLayout = node.parent.layoutMode;
    if (parentLayout && parentLayout !== 'NONE' && node.layoutPositioning !== 'ABSOLUTE') {
      return '位置由自动布局控制';
    }
  }

  if (
    (field === 'width' || field === 'height') &&
    typeof node.resize !== 'function' &&
    typeof node.resizeWithoutConstraints !== 'function'
  ) {
    return '该节点不支持调整尺寸';
  }

  return null;
}

function getTargetValue(field, value, options) {
  const target = roundToGrid(value, options.step, options.mode);
  if (field === 'width' || field === 'height') {
    return Math.max(options.step, target);
  }
  return target;
}

function analyzeNodes(nodes, inputOptions) {
  const options = normalizeOptions(inputOptions);
  const issues = [];

  nodes.forEach((node) => {
    const changes = [];
    options.fields.forEach((field) => {
      const value = node[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || !isOffGrid(value, options.step)) return;
      const reason = getBlockReason(node, field);
      changes.push({
        field,
        label: FIELD_LABELS[field],
        from: value,
        to: getTargetValue(field, value, options),
        canFix: !reason,
        reason
      });
    });

    if (changes.length) {
      issues.push({
        id: node.id,
        name: node.name || '未命名图层',
        type: node.type || 'UNKNOWN',
        changes,
        fixableCount: changes.filter((change) => change.canFix).length
      });
    }
  });

  return {
    scannedCount: nodes.length,
    issueNodeCount: issues.length,
    issueValueCount: issues.reduce((total, issue) => total + issue.changes.length, 0),
    fixableValueCount: issues.reduce((total, issue) => total + issue.fixableCount, 0),
    issues
  };
}

function fixNode(node, inputOptions) {
  const options = normalizeOptions(inputOptions);
  const changedFields = [];
  const skipped = [];

  ['x', 'y'].forEach((field) => {
    if (!options.fields.includes(field)) return;
    const value = node[field];
    if (typeof value !== 'number' || !isOffGrid(value, options.step)) return;
    const reason = getBlockReason(node, field);
    if (reason) {
      skipped.push({ field, reason });
      return;
    }
    try {
      node[field] = getTargetValue(field, value, options);
      changedFields.push(field);
    } catch (error) {
      skipped.push({ field, reason: error.message || '修改失败' });
    }
  });

  const sizeFields = ['width', 'height'].filter((field) => options.fields.includes(field));
  const sizeChanges = sizeFields.filter((field) => {
    const value = node[field];
    return typeof value === 'number' && isOffGrid(value, options.step);
  });

  if (sizeChanges.length) {
    const blocked = sizeChanges.map((field) => ({ field, reason: getBlockReason(node, field) }));
    const firstBlock = blocked.find((item) => item.reason);
    if (firstBlock) {
      blocked.filter((item) => item.reason).forEach((item) => skipped.push(item));
    } else {
      const nextWidth = sizeChanges.includes('width')
        ? getTargetValue('width', node.width, options)
        : node.width;
      const nextHeight = sizeChanges.includes('height')
        ? getTargetValue('height', node.height, options)
        : node.height;
      try {
        const resize =
          typeof node.resizeWithoutConstraints === 'function'
            ? node.resizeWithoutConstraints.bind(node)
            : node.resize.bind(node);
        resize(nextWidth, nextHeight);
        changedFields.push(...sizeChanges);
      } catch (error) {
        sizeChanges.forEach((field) => skipped.push({ field, reason: error.message || '修改失败' }));
      }
    }
  }

  return { changedFields, skipped };
}

function initPlugin(api) {
  api.showUI(__html__, { width: 380, height: 620 });
  let lastOptions = normalizeOptions(DEFAULT_OPTIONS);
  let ignoreNextSelectionChange = false;

  function post(type, payload) {
    api.ui.postMessage(Object.assign({ type }, payload || {}));
  }

  function getSelection() {
    return (api.currentPage && api.currentPage.selection) || [];
  }

  function scan(inputOptions) {
    lastOptions = normalizeOptions(inputOptions || lastOptions);
    const selection = getSelection();
    if (!selection.length) {
      post('scan-result', {
        result: { scannedCount: 0, issueNodeCount: 0, issueValueCount: 0, fixableValueCount: 0, issues: [] },
        emptySelection: true
      });
      return;
    }
    const nodes = collectNodes(selection, lastOptions.includeChildren);
    post('scan-result', { result: analyzeNodes(nodes, lastOptions), emptySelection: false });
  }

  function fix(inputOptions, onlyNodeId) {
    lastOptions = normalizeOptions(inputOptions || lastOptions);
    const selection = getSelection();
    const nodes = onlyNodeId
      ? [api.getNodeById(onlyNodeId)].filter(Boolean)
      : collectNodes(selection, lastOptions.includeChildren);
    let changedValueCount = 0;
    let changedNodeCount = 0;
    const skipped = [];

    nodes.forEach((node) => {
      const outcome = fixNode(node, lastOptions);
      if (outcome.changedFields.length) {
        changedNodeCount += 1;
        changedValueCount += outcome.changedFields.length;
      }
      outcome.skipped.forEach((item) => {
        skipped.push({ nodeId: node.id, nodeName: node.name || '未命名图层', field: item.field, reason: item.reason });
      });
    });

    post('fix-result', { changedNodeCount, changedValueCount, skippedCount: skipped.length, skipped });
    if (typeof api.notify === 'function') {
      api.notify(changedValueCount ? `已归整 ${changedNodeCount} 个图层` : '没有可安全修复的像素值');
    }
    scan(lastOptions);
  }

  api.ui.onmessage = (message) => {
    try {
      if (!message || !message.type) return;
      if (message.type === 'scan') scan(message.options);
      if (message.type === 'fix-all') fix(message.options);
      if (message.type === 'fix-node') fix(message.options, message.nodeId);
      if (message.type === 'select-node') {
        const node = api.getNodeById(message.nodeId);
        if (node) {
          ignoreNextSelectionChange = true;
          api.currentPage.selection = [node];
          if (api.viewport && typeof api.viewport.scrollAndZoomIntoView === 'function') {
            api.viewport.scrollAndZoomIntoView([node]);
          }
        }
      }
      if (message.type === 'close' && typeof api.closePlugin === 'function') api.closePlugin();
    } catch (error) {
      post('error', { message: error.message || String(error) });
    }
  };

  try {
    api.on('selectionchange', () => {
      if (ignoreNextSelectionChange) {
        ignoreNextSelectionChange = false;
        return;
      }
      scan(lastOptions);
    });
  } catch (error) {
    // Older JiShi builds may not expose selectionchange; manual scan still works.
  }
}

if (typeof jsDesign !== 'undefined') {
  initPlugin(jsDesign);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeOptions,
    roundToGrid,
    isOffGrid,
    collectNodes,
    getBlockReason,
    analyzeNodes,
    fixNode
  };
}
