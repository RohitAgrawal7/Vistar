import type { DiningSession, Order, OrderLine, SessionStatus } from "@/lib/types";
import { isFloorTableId as isValidTableFormat } from "@/lib/floor";
/** Session/order rules used by the kitchen API. */

/** Format check only (1–99). Known floor tables live in floor_tables / listFloorTables. */
export function isFloorTableId(value: string) {
  return isValidTableFormat(value);
}

export const ACTIVE_SESSION_STATUSES: SessionStatus[] = ["open", "billing", "paid"];

export function isActiveSession(session: DiningSession) {
  return ACTIVE_SESSION_STATUSES.includes(session.status);
}

export function canAddOrders(session: DiningSession) {
  return session.status === "open";
}

export function activeSessionForTable(sessions: DiningSession[], tableId: string) {
  return sessions.find((session) => session.tableId === tableId && isActiveSession(session));
}

export function ordersForSession(orders: Order[], sessionId: string) {
  return [...orders]
    .filter((order) => order.sessionId === sessionId && order.status !== "cancelled")
    .sort((a, b) => a.sequence - b.sequence);
}

export function sanitizeGuestName(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40);
}

export function isValidGuestName(raw: string) {
  const name = sanitizeGuestName(raw);
  return name.length >= 2 && /^[\p{L}\p{M}\s.'-]+$/u.test(name);
}

export function redactSession(session: DiningSession): DiningSession {
  const copy = { ...session, token: "" };
  delete (copy as { revokedToken?: string }).revokedToken;
  return copy;
}

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
  return sanitizeGuestName(raw).length >= 2;
}

export function sanitizeAbandonNote(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 160);
}

export function isValidAbandonNote(raw: string) {
  return sanitizeAbandonNote(raw).length >= 8;
}

export function orderBodiesMatch(
  left: Pick<Order, "items" | "notes">,
  right: Pick<Order, "items" | "notes">,
) {
  if ((left.notes ?? "").trim() !== (right.notes ?? "").trim()) return false;
  const normalize = (items: OrderLine[]) =>
    [...items]
      .map((item) => ({ itemId: item.itemId, quantity: item.quantity, unitPrice: item.unitPrice }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId));
  return JSON.stringify(normalize(left.items)) === JSON.stringify(normalize(right.items));
}
