const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeOpacity,
  colorToPaint,
  mapBlendMode,
  toByteArray,
  applyTextTransform,
  chooseAvailableFont,
  importDocument
} = require('../src/code.js');

test('normalizes PSD opacity values', () => {
  assert.equal(normalizeOpacity(128), 128 / 255);
  assert.equal(normalizeOpacity(0.5), 0.5);
  assert.equal(normalizeOpacity(undefined), 1);
});

test('applies the normalized PSD text matrix without changing its position', () => {
  const node = { x: 30, y: 40, rotation: 0 };
  applyTextTransform(node, {
    rotation: 0,
    textTransform: [[1, -0.2], [0, 1]]
  });
  assert.deepEqual(node.relativeTransform, [[1, -0.2, 30], [0, 1, 40]]);
});

test('preserves Photoshop faux italic with an editable text shear', () => {
  const node = { x: 12, y: 18, rotation: 0 };
  applyTextTransform(node, {
    rotation: 0,
    textTransform: [[1, 0], [0, 1]],
    textStyle: { fauxItalic: true }
  });
  assert.deepEqual(node.relativeTransform, [[1, -0.2, 12], [0, 1, 18]]);
});

test('converts PSD colors and blend modes', () => {
  assert.deepEqual(colorToPaint({ r: 255, g: 128, b: 0 }), {
    type: 'SOLID',
    color: { r: 1, g: 128 / 255, b: 0 },
    opacity: 1
  });
  assert.equal(mapBlendMode('multiply'), 'MULTIPLY');
  assert.equal(mapBlendMode('unknown-mode'), 'NORMAL');
});

test('restores byte arrays after plugin message cloning', () => {
  assert.deepEqual([...toByteArray({ 0: 4, 1: 8, 2: 15 })], [4, 8, 15]);
});

test('keeps bold italic intent when the Photoshop PostScript font name is matched', () => {
  const available = [
    { fontName: { family: 'Arial', style: 'Regular' } },
    { fontName: { family: 'Arial', style: 'Bold' } },
    { fontName: { family: 'Arial', style: 'Bold Italic' } }
  ];
  assert.deepEqual(
    chooseAvailableFont(
      available,
      'Arial-BoldItalicMT',
      { family: 'Arial', style: 'Regular' },
      {}
    ),
    { family: 'Arial', style: 'Bold Italic' }
  );
});

function createMockApi() {
  let id = 0;
  const makeNode = (type) => ({
    id: `${type}-${id += 1}`,
    type,
    name: type,
    children: [],
    appendChild(child) { this.children.push(child); child.parent = this; },
    resize(width, height) { this.width = width; this.height = height; },
    fontName: { family: 'Inter', style: 'Regular' }
  });
  const api = {
    currentPage: { selection: [] },
    viewport: { center: { x: 500, y: 400 }, scrollAndZoomIntoView() {} },
    createFrame: () => makeNode('FRAME'),
    createRectangle: () => makeNode('RECTANGLE'),
    createText: () => makeNode('TEXT'),
    createImage: () => ({ hash: 'image-hash' }),
    loadFontAsync: async () => {},
    listAvailableFontsAsync: async () => [{ fontName: { family: 'Inter', style: 'Regular' } }]
  };
  return api;
}

test('creates a movable root with editable text and image children', async () => {
  const api = createMockApi();
  const result = await importDocument(api, {
    name: 'Demo',
    width: 300,
    height: 200,
    children: [
      {
        kind: 'text', name: 'Title', x: 10, y: 20, width: 120, height: 30,
        textStyle: { characters: 'Hello', fontName: 'Inter', fontSize: 24, color: { r: 255, g: 0, b: 0 } }
      },
      { kind: 'image', name: 'Photo', x: 40, y: 60, width: 80, height: 70, imageBytes: [1, 2, 3] }
    ]
  });
  assert.equal(result.root.name, 'Demo');
  assert.equal(result.root.children[0].type, 'TEXT');
  assert.equal(result.root.children[0].characters, 'Hello');
  assert.equal(result.root.children[1].type, 'RECTANGLE');
  assert.deepEqual(result.counts, { text: 1, image: 1, group: 0, skipped: 0 });
  assert.deepEqual(api.currentPage.selection, [result.root]);
});
