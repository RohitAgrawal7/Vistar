import { appConfig } from "@/lib/config";

export const RESUME_TTL_MS = 5 * 60 * 1000;

export function resumePath(code: string) {
  return `/resume/${encodeURIComponent(code)}`;
}

export function buildResumeScanUrl(code: string, origin: string) {
  return `${origin.replace(/\/$/, "")}${resumePath(code)}`;
}

export function encodeResumeCode(nonce: string, exp: number, signature: string) {
  return `${nonce}.${exp}.${signature}`;
}

export function parseResumeCode(raw: string) {
  const value = decodeURIComponent(raw.trim());
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [nonce, expRaw, signature] = parts;
  const exp = Number(expRaw);
  if (!nonce || !signature || !Number.isFinite(exp)) return null;
  return { nonce, exp, signature };
}

export function resumeMessage(sessionId: string, nonce: string, exp: number) {
  return `${sessionId}:${nonce}:${exp}`;
}

export async function signResume(sessionId: string, nonce: string, exp: number) {
  const message = resumeMessage(sessionId, nonce, exp);
  const secret =
    (typeof process !== "undefined" && process.env.RESUME_SECRET?.trim()) ||
    appConfig.resumeSecret;
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return `demo_${nonce}_${exp}`;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resumeSignatureMatches(
  sessionId: string,
  nonce: string,
  exp: number,
  signature: string,
) {
  const expected = await signResume(sessionId, nonce, exp);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function createResumeNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}
