import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.JSDESIGN_BRIDGE_HTTP_URL || "http://127.0.0.1:9528/command";
const outputDirectory = process.argv[2];

if (!outputDirectory) {
  throw new Error("请提供导出目录。用法：node export-current-selection.mjs <output-directory>");
}

async function runCode(code) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  const payload = JSON.parse(text);
  if (!payload.success) throw new Error(payload.error || "即时设计命令执行失败。");
  return payload.result;
}

const selected = await runCode(String.raw`
  return Array.from(jsDesign.currentPage.selection || []).map((reference) => {
    const node = jsDesign.getNodeById(reference.id) || reference;
    return { id: node.id, name: node.name, width: node.width, height: node.height };
  });
`);

if (!Array.isArray(selected) || selected.length === 0) {
  throw new Error("即时设计当前没有选中画板。");
}

await mkdir(outputDirectory, { recursive: true });
const files = [];
for (const item of selected) {
  const exported = await runCode(String.raw`
    const bytesToBase64 = (bytes) => {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      let encoded = "";
      for (let index = 0; index < bytes.length; index += 3) {
        const first = bytes[index];
        const hasSecond = index + 1 < bytes.length;
        const hasThird = index + 2 < bytes.length;
        const second = hasSecond ? bytes[index + 1] : 0;
        const third = hasThird ? bytes[index + 2] : 0;
        encoded += alphabet[first >> 2];
        encoded += alphabet[((first & 3) << 4) | (second >> 4)];
        encoded += hasSecond ? alphabet[((second & 15) << 2) | (third >> 6)] : "=";
        encoded += hasThird ? alphabet[third & 63] : "=";
      }
      return encoded;
    };
    const node = jsDesign.getNodeById(${JSON.stringify(item.id)});
    if (!node) return { error: "Node not found" };
    const bytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 1 },
    });
    return {
      base64: bytesToBase64(bytes),
      sizeBytes: bytes.length,
    };
  `);
  if (!exported?.base64) throw new Error(exported?.error || `无法导出节点 ${item.id}`);
  const safeName = String(item.name || item.id || "artboard")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-");
  const fileName = `${safeName}.png`;
  const filePath = path.join(outputDirectory, fileName);
  const bytes = Buffer.from(exported.base64, "base64");
  await writeFile(filePath, bytes);
  files.push({
    id: item.id,
    name: item.name,
    width: item.width,
    height: item.height,
    fileName,
    filePath,
    sizeBytes: bytes.length,
  });
}

process.stdout.write(JSON.stringify({ outputDirectory, files }, null, 2));
