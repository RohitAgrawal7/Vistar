import { serverConfig } from "@/lib/config";

export const RESUME_TTL_MS = 5 * 60 * 1000;

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

function resumeMessage(sessionId: string, nonce: string, exp: number) {
  return `${sessionId}:${nonce}:${exp}`;
}

export async function signResume(sessionId: string, nonce: string, exp: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serverConfig.resumeSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(resumeMessage(sessionId, nonce, exp)),
  );
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
  return crypto.randomUUID().replace(/-/g, "");
}
