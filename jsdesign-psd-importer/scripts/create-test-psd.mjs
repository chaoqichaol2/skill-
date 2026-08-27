import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const agPsd = require('../vendor/ag-psd.bundle.js');
const output = process.argv[2] || '/private/tmp/jsdesign-psd-importer-smoke.psd';
const bytes = agPsd.writePsd({
  width: 360,
  height: 220,
  children: [{
    name: '可编辑标题',
    top: 40,
    left: 32,
    right: 300,
    bottom: 88,
    text: {
      text: 'PSD 可编辑文字',
      transform: [1, 0, 0, 1, 32, 70],
      style: {
        font: { name: 'ArialMT' },
        fontSize: 28,
        fillColor: { r: 35, g: 93, b: 238 }
      }
    }
  }]
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.from(bytes));
console.log(output);
