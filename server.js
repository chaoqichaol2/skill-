const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const adminUser = process.env.RADAR_ADMIN_USER || "admin";
const adminPassword = process.env.RADAR_ADMIN_PASSWORD || (isProduction ? "" : "radar2026");
const sessionTtlMs = Number(process.env.RADAR_SESSION_TTL_MS || 12 * 60 * 60 * 1000);
const sessions = new Map();
const loginAttempts = new Map();

if (isProduction && !process.env.RADAR_ADMIN_PASSWORD) {
  throw new Error("RADAR_ADMIN_PASSWORD is required when NODE_ENV=production.");
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseCookies(request) {
  const cookies = {};
  const header = request.headers.cookie || "";
  header.split(";").forEach((part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  });
  return cookies;
}

function getClientIp(request) {
  return (request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown")
    .toString()
    .split(",")[0]
    .trim();
}

function isSecureRequest(request) {
  return request.headers["x-forwarded-proto"] === "https" || process.env.COOKIE_SECURE === "true";
}

function sessionCookie(sessionId, request) {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  return `radar_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionTtlMs / 1000)}${secure}`;
}

function clearSessionCookie(request) {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  return `radar_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

function getSession(request) {
  const sessionId = parseCookies(request).radar_session;
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  session.expiresAt = Date.now() + sessionTtlMs;
  return { id: sessionId, ...session };
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...securityHeaders(),
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function securityHeaders() {
  return {
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function redirect(response, location) {
  response.writeHead(302, {
    Location: location,
    ...securityHeaders(),
  });
  response.end();
}

function isProtectedPath(pathname) {
  return ["/admin", "/admin.html", "/admin.js"].includes(pathname);
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) {
      throw new Error("Request body too large.");
    }
  }
  return body ? JSON.parse(body) : {};
}

function isRateLimited(request) {
  const key = getClientIp(request);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const record = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (record.resetAt < now) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  loginAttempts.set(key, record);
  return record.count > 5;
}

function resetRateLimit(request) {
  loginAttempts.delete(getClientIp(request));
}

async function handleLogin(request, response) {
  if (isRateLimited(request)) {
    sendJson(response, 429, { message: "登录尝试过多，请稍后再试。" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const username = body.username || "";
    const password = body.password || "";
    const valid = safeEqual(username, adminUser) && safeEqual(password, adminPassword);

    if (!valid) {
      sendJson(response, 401, { message: "账号或密码错误。" });
      return;
    }

    resetRateLimit(request);
    const sessionId = crypto.randomBytes(32).toString("base64url");
    sessions.set(sessionId, {
      username,
      expiresAt: Date.now() + sessionTtlMs,
      createdAt: Date.now(),
    });

    sendJson(response, 200, { authenticated: true }, { "Set-Cookie": sessionCookie(sessionId, request) });
  } catch {
    sendJson(response, 400, { message: "登录请求格式错误。" });
  }
}

async function serveStatic(request, response, pathname) {
  let filePath = pathname;
  if (filePath === "/") filePath = "/index.html";
  if (filePath === "/admin") filePath = "/admin.html";
  if (filePath === "/login") filePath = "/login.html";

  const absolutePath = path.normalize(path.join(rootDir, filePath));
  if (!absolutePath.startsWith(rootDir)) {
    sendJson(response, 403, { message: "Forbidden" });
    return;
  }

  try {
    const content = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      ...securityHeaders(),
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { message: "Not found" });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/api/login") {
    await handleLogin(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    const session = getSession(request);
    if (session) sessions.delete(session.id);
    sendJson(response, 200, { authenticated: false }, { "Set-Cookie": clearSessionCookie(request) });
    return;
  }

  if (request.method === "GET" && pathname === "/api/session") {
    sendJson(response, 200, { authenticated: Boolean(getSession(request)) });
    return;
  }

  if (isProtectedPath(pathname) && !getSession(request)) {
    if (pathname.endsWith(".js") || pathname.endsWith(".css")) {
      sendJson(response, 401, { message: "Unauthorized" });
    } else {
      redirect(response, "/login.html");
    }
    return;
  }

  if (pathname === "/login.html" && getSession(request)) {
    redirect(response, "/admin.html");
    return;
  }

  await serveStatic(request, response, pathname);
});

server.listen(port, host, () => {
  console.log(`灵感 Radar server running at http://${host}:${port}/`);
  if (!isProduction && !process.env.RADAR_ADMIN_PASSWORD) {
    console.log("Dev admin account: admin / radar2026");
  }
});
