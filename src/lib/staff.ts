import { sanitizeGuestName } from "@/lib/session";

export function isValidStaffPin(pin: string) {
  return /^\d{4,12}$/.test(pin.trim());
}

export function pinsMatch(left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isValidStaffName(raw: string) {
  const name = sanitizeGuestName(raw);
  return name.length >= 2;
}

export function sanitizeAbandonNote(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 160);
}

export function isValidAbandonNote(raw: string) {
  const note = sanitizeAbandonNote(raw);
  return note.length >= 8;
}
