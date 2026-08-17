import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("exports a portable GitHub Pages site", async () => {
  const html = await readFile(new URL("../.pages/index.html", import.meta.url), "utf8");
  assert.match(html, /Skill Scout/);
  assert.match(html, /agent-browser/);
  assert.match(html, /推荐不是热度榜/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /https:\/\/skills\.tideflow\.cloud\/og\.png/);
  await access(new URL("../.pages/styles.css", import.meta.url));
  await access(new URL("../.pages/favicon.svg", import.meta.url));
  await access(new URL("../.pages/og.png", import.meta.url));
  await access(new URL("../.pages/.nojekyll", import.meta.url));
});
