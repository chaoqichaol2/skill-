import { readFile } from 'node:fs/promises';

const endpoint = process.env.JSDESIGN_BRIDGE_HTTP || 'http://127.0.0.1:9528/command';
const source = await readFile(new URL('../src/code.js', import.meta.url), 'utf8');
const runtimeSource = source
  .replace("if (typeof jsDesign !== 'undefined') initPlugin(jsDesign);", '')
  .replace(/if \(typeof module !== 'undefined'[\s\S]*$/, '');
const tinyPng = [...Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)];

const smokeDocument = {
  name: 'PSD 插件桥接实测',
  width: 360,
  height: 220,
  children: [{
    kind: 'group',
    name: '文本组',
    x: 20,
    y: 18,
    width: 300,
    height: 120,
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    children: [{
      kind: 'text',
      name: '标题',
      x: 42,
      y: 46,
      width: 220,
      height: 42,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      textStyle: {
        characters: 'PSD 可编辑文字',
        fontSize: 26,
        color: { r: 35, g: 93, b: 238, a: 1 },
        align: 'LEFT',
        shapeType: 'point'
      }
    }]
  }, {
    kind: 'image',
    name: '像素图层',
    x: 270,
    y: 150,
    width: 48,
    height: 48,
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    imageBytes: tinyPng
  }]
};

const smokeCode = `${runtimeSource}\n
const smoke = await importDocument(jsDesign, ${JSON.stringify(smokeDocument)});
const group = smoke.root.children[0];
const text = group.children[0];
const image = smoke.root.children[1];
const before = { x: text.x, y: text.y, characters: text.characters, type: text.type };
text.x += 17;
text.characters = '已验证可编辑';
const after = { x: text.x, y: text.y, characters: text.characters, type: text.type };
const result = {
  root: { type: smoke.root.type, width: smoke.root.width, height: smoke.root.height },
  group: { type: group.type, name: group.name },
  image: { type: image.type, name: image.name, width: image.width, height: image.height, fills: image.fills },
  before,
  after,
  counts: smoke.counts,
  warnings: smoke.warnings
};
smoke.root.remove();
return result;`;

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ code: smokeCode })
});

const payload = await response.json();
if (!response.ok || payload.success === false) {
  throw new Error(payload.error || `Bridge request failed with ${response.status}`);
}

console.log(JSON.stringify(payload.result, null, 2));
