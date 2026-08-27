const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mergePsdTextStyle,
  getPsdTextTransform,
  normalizePsdTextScale,
  getPsdSolidFillEffect
} = require('../src/ui.js');

test('text style runs extend the PSD base style instead of erasing it', () => {
  const merged = mergePsdTextStyle(
    {
      font: { name: 'SourceHanSansCN-Bold', script: 25 },
      fontSize: 48,
      fillColor: { r: 228, g: 24, b: 36 },
      fauxItalic: true
    },
    { font: { name: 'SourceHanSansCN-Heavy' }, fauxBold: true }
  );

  assert.deepEqual(merged.font, {
    name: 'SourceHanSansCN-Heavy',
    script: 25
  });
  assert.equal(merged.fontSize, 48);
  assert.deepEqual(merged.fillColor, { r: 228, g: 24, b: 36 });
  assert.equal(merged.fauxBold, true);
  assert.equal(merged.fauxItalic, true);
});

test('reads PSD text rotation and scale from the transform matrix', () => {
  const result = getPsdTextTransform([0, 2, -3, 0, 120, 80]);
  assert.equal(result.rotation, 90);
  assert.equal(result.scaleX, 2);
  assert.equal(result.scaleY, 3);
  assert.deepEqual(result.matrix, [[0, -3], [2, 0]]);
});

test('normalizes PSD text scale values stored as ratios or percentages', () => {
  assert.equal(normalizePsdTextScale(0.8), 0.8);
  assert.equal(normalizePsdTextScale(120), 1.2);
  assert.equal(normalizePsdTextScale(undefined), 1);
});

test('selects the top enabled Photoshop color overlay effect', () => {
  const selected = getPsdSolidFillEffect({
    solidFill: [
      { enabled: true, color: { r: 255, g: 0, b: 0 } },
      { enabled: false, color: { r: 0, g: 255, b: 0 } },
      { enabled: true, color: { r: 255, g: 255, b: 255 } }
    ]
  });
  assert.deepEqual(selected.color, { r: 255, g: 255, b: 255 });
  assert.equal(getPsdSolidFillEffect({ disabled: true, solidFill: [selected] }), null);
});
