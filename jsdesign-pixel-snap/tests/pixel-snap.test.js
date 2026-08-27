const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeOptions,
  roundToGrid,
  isOffGrid,
  collectNodes,
  analyzeNodes,
  fixNode
} = require('../code.js');

test('allows all fields to be disabled explicitly', () => {
  assert.deepEqual(normalizeOptions({ fields: [] }).fields, []);
  assert.deepEqual(normalizeOptions({}).fields, ['x', 'y', 'width', 'height']);
});

test('rounds to 1px and 0.5px grids', () => {
  assert.equal(roundToGrid(12.49, 1, 'round'), 12);
  assert.equal(roundToGrid(12.5, 1, 'round'), 13);
  assert.equal(roundToGrid(12.26, 0.5, 'round'), 12.5);
  assert.equal(roundToGrid(-2.2, 1, 'floor'), -3);
  assert.equal(roundToGrid(-2.2, 1, 'ceil'), -2);
});

test('uses an epsilon when detecting off-grid values', () => {
  assert.equal(isOffGrid(10.00001, 1), false);
  assert.equal(isOffGrid(10.1, 1), true);
  assert.equal(isOffGrid(10.5, 0.5), false);
});

test('collects children once when parent and child are both selected', () => {
  const child = { id: 'child', children: [] };
  const parent = { id: 'parent', children: [child] };
  assert.deepEqual(collectNodes([parent, child], true).map((node) => node.id), ['parent', 'child']);
  assert.deepEqual(collectNodes([parent], false).map((node) => node.id), ['parent']);
});

test('analyzes fractional geometry and reports auto-layout positions as blocked', () => {
  const parent = { id: 'parent', layoutMode: 'HORIZONTAL' };
  const node = {
    id: 'node',
    name: '按钮',
    type: 'RECTANGLE',
    x: 10.2,
    y: 20,
    width: 99.7,
    height: 40,
    parent,
    resize() {}
  };
  const result = analyzeNodes([node], { step: 1, mode: 'round', fields: ['x', 'width'] });
  assert.equal(result.issueNodeCount, 1);
  assert.equal(result.issueValueCount, 2);
  assert.equal(result.fixableValueCount, 1);
  assert.equal(result.issues[0].changes[0].reason, '位置由自动布局控制');
  assert.equal(result.issues[0].changes[1].to, 100);
});

test('fixes position and size with one resize operation', () => {
  const node = {
    id: 'node',
    x: 10.2,
    y: 20.7,
    width: 99.7,
    height: 40.2,
    parent: { layoutMode: 'NONE' },
    resize(width, height) {
      this.width = width;
      this.height = height;
    }
  };
  const outcome = fixNode(node, { step: 1, mode: 'round', fields: ['x', 'y', 'width', 'height'] });
  assert.deepEqual(outcome.changedFields, ['x', 'y', 'width', 'height']);
  assert.deepEqual({ x: node.x, y: node.y, width: node.width, height: node.height }, { x: 10, y: 21, width: 100, height: 40 });
});
