import { writeFile } from "node:fs/promises";

const endpoint = process.env.JSDESIGN_BRIDGE_HTTP_URL || "http://127.0.0.1:9528/command";
const outputPath = process.argv[2];

const code = String.raw`
  const safe = (read, fallback = null) => {
    try {
      const value = read();
      if (value === undefined) return fallback;
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  let count = 0;
  const maxNodes = 5000;
  const maxDepth = 16;

  const resolveNode = (reference) => {
    if (!reference) return null;
    try {
      const id = reference.id;
      return id ? (jsDesign.getNodeById(id) || reference) : reference;
    } catch {
      return reference;
    }
  };

  const summarize = (node, depth = 0) => {
    if (!node || count >= maxNodes) return null;
    count += 1;

    const result = {
      id: safe(() => node.id),
      name: safe(() => node.name),
      type: safe(() => node.type),
      visible: safe(() => node.visible),
      locked: safe(() => node.locked),
      x: safe(() => node.x),
      y: safe(() => node.y),
      width: safe(() => node.width),
      height: safe(() => node.height),
      rotation: safe(() => node.rotation),
      opacity: safe(() => node.opacity),
      blendMode: safe(() => node.blendMode),
      clipsContent: safe(() => node.clipsContent),
      cornerRadius: safe(() => node.cornerRadius),
      topLeftRadius: safe(() => node.topLeftRadius),
      topRightRadius: safe(() => node.topRightRadius),
      bottomLeftRadius: safe(() => node.bottomLeftRadius),
      bottomRightRadius: safe(() => node.bottomRightRadius),
      fills: safe(() => node.fills),
      strokes: safe(() => node.strokes),
      strokeWeight: safe(() => node.strokeWeight),
      effects: safe(() => node.effects),
      characters: safe(() => node.characters),
      fontName: safe(() => node.fontName),
      fontSize: safe(() => node.fontSize),
      fontWeight: safe(() => node.fontWeight),
      lineHeight: safe(() => node.lineHeight),
      letterSpacing: safe(() => node.letterSpacing),
      textAlignHorizontal: safe(() => node.textAlignHorizontal),
      textAlignVertical: safe(() => node.textAlignVertical),
      textAutoResize: safe(() => node.textAutoResize),
      layoutMode: safe(() => node.layoutMode),
      primaryAxisAlignItems: safe(() => node.primaryAxisAlignItems),
      counterAxisAlignItems: safe(() => node.counterAxisAlignItems),
      itemSpacing: safe(() => node.itemSpacing),
      paddingTop: safe(() => node.paddingTop),
      paddingRight: safe(() => node.paddingRight),
      paddingBottom: safe(() => node.paddingBottom),
      paddingLeft: safe(() => node.paddingLeft),
      constraints: safe(() => node.constraints),
      componentId: safe(() => node.componentId),
    };

    if (depth < maxDepth) {
      let children = [];
      try {
        children = Array.from(node.children || []);
      } catch {}
      result.children = children
        .map((child) => resolveNode(child))
        .map((child) => summarize(child, depth + 1))
        .filter(Boolean);
    } else {
      result.children = [];
      result.childrenTruncated = true;
    }
    return result;
  };

  const root = jsDesign.root;
  const page = jsDesign.currentPage;
  let selection = [];
  let topLevel = [];
  try {
    selection = Array.from(page.selection || []).map((node) => resolveNode(node)).filter(Boolean);
  } catch {}
  try {
    topLevel = Array.from(page.children || []).map((node) => resolveNode(node)).filter(Boolean);
  } catch {}

  return {
    capturedAt: new Date().toISOString(),
    document: {
      id: safe(() => root.id),
      name: safe(() => root.name),
      type: safe(() => root.type),
    },
    currentPage: {
      id: safe(() => page.id),
      name: safe(() => page.name),
      type: safe(() => page.type),
    },
    pages: safe(() => Array.from(root.children || []).map((item) => ({
      id: safe(() => item.id),
      name: safe(() => item.name),
      type: safe(() => item.type),
    })), []),
    selectionCount: selection.length,
    selection: selection.map((node) => summarize(node)).filter(Boolean),
    topLevelSummary: topLevel.map((node) => ({
      id: safe(() => node.id),
      name: safe(() => node.name),
      type: safe(() => node.type),
      x: safe(() => node.x),
      y: safe(() => node.y),
      width: safe(() => node.width),
      height: safe(() => node.height),
      childrenCount: safe(() => Array.from(node.children || []).length, 0),
    })),
    nodesCaptured: count,
    nodesTruncated: count >= maxNodes,
  };
`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code }),
});

const text = await response.text();
if (!response.ok) {
  throw new Error(text);
}
if (outputPath) {
  const parsed = JSON.parse(text);
  await writeFile(outputPath, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify({ outputPath, bytes: Buffer.byteLength(text) }));
} else {
  process.stdout.write(text);
}
