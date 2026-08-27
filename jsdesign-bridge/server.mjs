import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.JSDESIGN_BRIDGE_PORT || 9527);
const httpPort = Number(process.env.JSDESIGN_BRIDGE_HTTP_PORT || 9528);
const clients = new Set();
let pending = null;

const wss = new WebSocketServer({ port });

wss.on("connection", (socket) => {
  clients.add(socket);
  console.error(`[jsdesign-bridge] plugin connected (${clients.size})`);

  socket.on("message", (data) => {
    if (!pending) return;

    try {
      const message = JSON.parse(data.toString());
      const response = message.type === "ws-response" ? message.data : message;
      if (response && typeof response.success === "boolean") {
        pending.resolve(response);
        pending = null;
      }
    } catch {
      // Ignore non-JSON plugin messages.
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
    console.error(`[jsdesign-bridge] plugin disconnected (${clients.size})`);
  });
});

wss.on("listening", () => {
  console.error(`[jsdesign-bridge] listening on ws://localhost:${port}`);
});

const httpServer = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method === "GET" && request.url === "/status") {
    response.end(JSON.stringify({
      connected: Boolean(connectedSocket()),
      clients: clients.size,
    }));
    return;
  }

  if (request.method === "POST" && request.url === "/command") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) request.destroy();
    });
    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        if (typeof payload.code !== "string" || !payload.code.trim()) {
          throw new Error("code 必须是非空字符串。");
        }
        const result = await runCode(payload.code);
        response.statusCode = result.success === false ? 400 : 200;
        response.end(JSON.stringify(result));
      } catch (error) {
        response.statusCode = 400;
        response.end(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    });
    return;
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ success: false, error: "Not found" }));
});

httpServer.listen(httpPort, "127.0.0.1", () => {
  console.error(`[jsdesign-bridge] HTTP command endpoint ready at http://127.0.0.1:${httpPort}`);
});

function connectedSocket() {
  return [...clients].find((socket) => socket.readyState === 1) || null;
}

function runCode(code) {
  const socket = connectedSocket();
  if (!socket) {
    throw new Error("即时设计 MCP Bridge 插件未连接。请在即时设计中打开插件并开启桥接。") ;
  }
  if (pending) {
    throw new Error("已有即时设计命令正在执行，请稍后重试。") ;
  }

  return new Promise((resolve, reject) => {
    const id = Date.now();
    const timer = setTimeout(() => {
      pending = null;
      reject(new Error("即时设计命令执行超时。"));
    }, 30000);

    pending = {
      resolve: (response) => {
        clearTimeout(timer);
        resolve(response);
      },
    };

    // The plugin UI wraps each WebSocket payload as `msg.command` before
    // forwarding it to the plugin runtime, so send the command itself here.
    socket.send(JSON.stringify({ id, code }));
  });
}

const tools = [
  {
    name: "jsdesign_bridge_status",
    description: "Check whether the 即时设计 MCP Bridge plugin is connected.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "jsdesign_run_code",
    description:
      "Execute JavaScript in the open 即时设计 document through its MCP Bridge plugin. The code receives the jsDesign API as `jsDesign` and its return value is sent back to the caller.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript function body to execute with access to the jsDesign API.",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "jsdesign_get_context",
    description:
      "Read the open 即时设计 document, current page, top-level page nodes, and current selection without modifying the design.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const server = new Server(
  { name: "jsdesign-codex-bridge", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "jsdesign_bridge_status") {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ connected: Boolean(connectedSocket()), clients: clients.size }),
        }],
      };
    }

    if (request.params.name === "jsdesign_run_code") {
      const code = request.params.arguments?.code;
      if (typeof code !== "string" || !code.trim()) {
        throw new Error("code 必须是非空字符串。") ;
      }
      const response = await runCode(code);
      return {
        content: [{ type: "text", text: JSON.stringify(response) }],
        isError: response.success === false,
      };
    }

    if (request.params.name === "jsdesign_get_context") {
      const response = await runCode(`
        const summarize = (node) => {
          if (!node) return null;
          return {
            id: node.id,
            name: node.name,
            type: node.type,
            visible: node.visible,
            locked: node.locked,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            childrenCount: node.children ? Array.from(node.children).length : undefined,
          };
        };

        const page = jsDesign.currentPage;
        return {
          document: summarize(jsDesign.root),
          currentPage: summarize(page),
          pages: jsDesign.root?.children
            ? Array.from(jsDesign.root.children).map(summarize)
            : [],
          topLevelNodes: page?.children
            ? Array.from(page.children).map(summarize)
            : [],
          selection: page?.selection
            ? Array.from(page.selection).map(summarize)
            : [],
        };
      `);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response.result ?? null),
        }],
        isError: response.success === false,
      };
    }

    throw new Error(`未知工具：${request.params.name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
      isError: true,
    };
  }
});

await server.connect(new StdioServerTransport());
console.error("[jsdesign-bridge] MCP stdio server ready");
