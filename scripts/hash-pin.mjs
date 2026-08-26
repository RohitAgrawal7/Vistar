#!/usr/bin/env node
/**
 * Generate a scrypt PIN hash for Vercel / .env.local
 *
 *   node scripts/hash-pin.mjs 2468
 *   node scripts/hash-pin.mjs --staff 48291735
 *   node scripts/hash-pin.mjs --super 91827364
 *
 * Set STAFF_PIN_HASH / SUPER_ADMIN_PIN_HASH to the printed value.
 * Do NOT commit the plaintext PIN. Remove STAFF_PIN / SUPER_ADMIN_PIN after hashing.
 */
import { randomBytes, scryptSync } from "node:crypto";

const args = process.argv.slice(2);
let kind = "generic";
let pin = "";

for (const arg of args) {
  if (arg === "--staff") kind = "staff";
  else if (arg === "--super") kind = "super";
  else if (!arg.startsWith("-")) pin = arg;
}

if (!/^\d{4,12}$/.test(pin)) {
  console.error("Usage: node scripts/hash-pin.mjs [--staff|--super] <4-12 digit PIN>");
  process.exit(1);
}

const N = 16384;
const r = 8;
const p = 1;
const salt = randomBytes(16);
const derived = scryptSync(pin, salt, 32, { N, r, p });
const hash = `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;

const envName =
  kind === "staff" ? "STAFF_PIN_HASH" : kind === "super" ? "SUPER_ADMIN_PIN_HASH" : "PIN_HASH";

console.log(`\n${envName}=${hash}\n`);
console.log("Add this to Vercel → Environment Variables (Sensitive).");
console.log("Remove plaintext STAFF_PIN / SUPER_ADMIN_PIN / NEXT_PUBLIC_STAFF_PIN after switching.");
