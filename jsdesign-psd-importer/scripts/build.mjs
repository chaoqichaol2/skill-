import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
const [template, parserScript, uiScript] = await Promise.all([
  readFile('src/ui.html', 'utf8'),
  readFile('vendor/ag-psd.bundle.js', 'utf8'),
  readFile('src/ui.js', 'utf8')
]);

const escapedClosingTag = '<' + String.fromCharCode(92) + '/script>';
const inlineScript = `${parserScript}\n${uiScript}`.replaceAll('</script>', escapedClosingTag);
const html = template.replace('/*__UI_SCRIPT__*/', () => inlineScript);
await copyFile('src/code.js', 'dist/code.js');
await writeFile('dist/ui.html', html);
await copyFile('src/code.js', 'code.js');
await writeFile('ui.html', html);
