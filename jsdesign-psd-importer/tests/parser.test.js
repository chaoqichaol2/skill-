const test = require('node:test');
const assert = require('node:assert/strict');
const agPsd = require('../vendor/ag-psd.bundle.js');

test('bundled parser preserves basic PSD text metadata', () => {
  const source = {
    width: 160,
    height: 100,
    children: [{
      name: 'Title',
      top: 10,
      left: 12,
      right: 150,
      bottom: 50,
      text: {
        text: 'Hello PSD',
        transform: [1, 0, 0, 1, 12, 30],
        style: {
          font: { name: 'ArialMT' },
          fontSize: 24,
          fillColor: { r: 255, g: 32, b: 16 }
        }
      }
    }]
  };
  const bytes = agPsd.writePsd(source);
  const parsed = agPsd.readPsd(bytes, {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true
  });
  assert.equal(parsed.width, 160);
  assert.equal(parsed.children[0].name, 'Title');
  assert.equal(parsed.children[0].text.text, 'Hello PSD');
  assert.equal(parsed.children[0].text.style.font.name, 'ArialMT');
  assert.equal(parsed.children[0].text.style.fontSize, 24);
});
