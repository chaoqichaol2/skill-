const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('built UI keeps the parser and interaction code inside one valid script', () => {
  const html = fs.readFileSync(require.resolve('../ui.html'), 'utf8');
  assert.equal((html.match(/<\/script>/gi) || []).length, 1);
  assert.equal((html.match(/<\/body>/gi) || []).length, 1);
  assert.match(html, /boundArgs\[i\] = '\$' \+ i;/);
  assert.match(html, /fileInput\.addEventListener\('change'/);

  const script = html.match(/<script>([\s\S]*)<\/script>/i)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script, { filename: 'ui-inline.js' }));
});
