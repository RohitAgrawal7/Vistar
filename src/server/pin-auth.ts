import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/server/http";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 5;

type AttemptBucket = { count: number; resetAt: number };
const loginAttempts = new Map<string, AttemptBucket>();

function isProductionHost() {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
}

function scryptDerive(
  password: string,
  salt: Buffer,
  keyLen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keyLen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

/** Accept 4–12 digit PINs (prefer 8+ in production). */
export function isValidStaffPin(pin: string) {
  return /^\d{4,12}$/.test(pin.trim());
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptDerive(pin.normalize("NFKC"), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function timingSafeStringEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    // Consume comparable work to avoid length leaks on short secrets.
    timingSafeEqual(a.length > 0 ? a : Buffer.alloc(1), a.length > 0 ? a : Buffer.alloc(1));
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function verifyPinSecret(pin: string, stored: string): Promise<boolean> {
  const candidate = pin.trim();
  const secret = stored.trim();
  if (!candidate || !secret) return false;

  if (secret.startsWith("scrypt$")) {
    const parts = secret.split("$");
    if (parts.length !== 6) return false;
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !salt.length || !expected.length) {
      return false;
    }
    const derived = await scryptDerive(candidate.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
    });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }

  // Legacy plaintext env (local only). Prefer STAFF_PIN_HASH / SUPER_ADMIN_PIN_HASH.
  return timingSafeStringEqual(candidate, secret);
}

export function assertLoginRateLimit(bucketKey: string) {
  const now = Date.now();
  const current = loginAttempts.get(bucketKey);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(bucketKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  if (current.count >= RATE_MAX_ATTEMPTS) {
    const minutes = Math.max(1, Math.ceil((current.resetAt - now) / 60_000));
    throw new ApiError(`Too many sign-in attempts. Try again in about ${minutes} minute(s).`, 429);
  }
  current.count += 1;
}

export function clearLoginRateLimit(bucketKey: string) {
  loginAttempts.delete(bucketKey);
}

export function createSessionToken(prefix: "staff" | "sadmin") {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function clientAttemptKey(request: Request, role: "staff" | "super_admin") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `${role}:${ip}`;
}

/**
 * Resolve staff / super-admin secret from env.
 * Prefer *_PIN_HASH (scrypt$). Never read NEXT_PUBLIC_* for auth secrets.
 */
export function resolvePinSecret(kind: "staff" | "super_admin"): string {
  if (kind === "staff") {
    const hash = process.env.STAFF_PIN_HASH?.trim();
    if (hash) return hash;
    const pin = process.env.STAFF_PIN?.trim();
    if (pin) return pin;
    // Dev-only fallback — never on Vercel/production.
    if (!isProductionHost()) return "2468";
    return "";
  }

  const hash = process.env.SUPER_ADMIN_PIN_HASH?.trim();
  if (hash) return hash;
  const pin = process.env.SUPER_ADMIN_PIN?.trim();
  if (pin) return pin;
  if (!isProductionHost()) return "1357";
  return "";
}

export function pinConfigured(kind: "staff" | "super_admin") {
  return Boolean(resolvePinSecret(kind));
}

export async function authenticatePin(
  kind: "staff" | "super_admin",
  pin: string,
  attemptKey: string,
): Promise<void> {
  assertLoginRateLimit(attemptKey);
  if (!isValidStaffPin(pin)) {
    throw new ApiError(
      kind === "staff" ? "Incorrect kitchen PIN" : "Incorrect super admin PIN",
      401,
    );
  }
  const secret = resolvePinSecret(kind);
  if (!secret) {
    throw new ApiError(
      kind === "staff"
        ? "Kitchen PIN is not configured on the server"
        : "Super admin PIN is not configured on the server",
      503,
    );
  }
  const ok = await verifyPinSecret(pin, secret);
  if (!ok) {
    throw new ApiError(
      kind === "staff" ? "Incorrect kitchen PIN" : "Incorrect super admin PIN",
      401,
    );
  }
  clearLoginRateLimit(attemptKey);
}
