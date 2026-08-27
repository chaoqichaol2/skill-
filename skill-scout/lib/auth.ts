import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "skill_scout_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  const inputDigest = createHmac("sha256", getSessionSecret()).update(input).digest("hex");
  const expectedDigest = createHmac("sha256", getSessionSecret()).update(expected).digest("hex");

  return safeEqual(inputDigest, expectedDigest);
}

export function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;

  const [role, expiresAt, signature] = token.split(".");
  if (role !== "admin" || !expiresAt || !signature) return false;

  const payload = `${role}.${expiresAt}`;
  const expires = Number(expiresAt);

  return Number.isFinite(expires)
    && expires > Math.floor(Date.now() / 1000)
    && safeEqual(sign(payload), signature);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_AGE_SECONDS,
};
