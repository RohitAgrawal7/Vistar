import { appConfig } from "@/lib/config";
import { roundMoney } from "@/lib/format";
import type { DiningSession, Order, SessionStatus, SessionTotals } from "@/lib/types";

export const ACTIVE_SESSION_STATUSES: SessionStatus[] = ["open", "billing", "paid"];

export function isActiveSession(session: DiningSession) {
  return ACTIVE_SESSION_STATUSES.includes(session.status);
}

export function canAddOrders(session: DiningSession) {
  return session.status === "open";
}

export function isSessionLocked(session: DiningSession) {
  return session.status === "billing" || session.status === "paid" || session.status === "closed";
}

export function activeSessionForTable(sessions: DiningSession[], tableId: string) {
  return sessions.find((session) => session.tableId === tableId && isActiveSession(session));
}

export function ordersForSession(orders: Order[], sessionId: string) {
  return [...orders]
    .filter((order) => order.sessionId === sessionId && order.status !== "cancelled")
    .sort((a, b) => a.sequence - b.sequence);
}

export function staffOrdersForSession(orders: Order[], sessionId: string) {
  return [...orders]
    .filter((order) => order.sessionId === sessionId)
    .sort((a, b) => a.sequence - b.sequence);
}

export function computeSessionTotals(orders: Order[]): SessionTotals {
  return {
    orderCount: orders.length,
    subtotal: roundMoney(orders.reduce((sum, order) => sum + order.subtotal, 0)),
    tax: roundMoney(orders.reduce((sum, order) => sum + order.tax, 0)),
    total: roundMoney(orders.reduce((sum, order) => sum + order.total, 0)),
  };
}

export function sanitizeGuestName(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40);
}

export function isValidGuestName(raw: string) {
  const name = sanitizeGuestName(raw);
  return name.length >= 2 && /^[\p{L}\p{M}\s.'-]+$/u.test(name);
}

/** Digits only — keep at most 10. */
export function sanitizeGuestPhone(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 10);
}

export function isValidGuestPhone(raw: string) {
  const phone = sanitizeGuestPhone(raw);
  return phone.length === 10 && /^[6-9]\d{9}$/.test(phone);
}

export function formatGuestPhone(phone: string | undefined) {
  if (!phone) return "";
  const digits = sanitizeGuestPhone(phone);
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function redactSession(session: DiningSession): DiningSession {
  return { ...session, token: "" };
}

export function guestOwnsSession(
  session: DiningSession | undefined,
  claim: { sessionId: string; token: string } | undefined,
) {
  if (!session || !claim) return false;
  if (claim.sessionId !== session.id) return false;
  if (!session.token) return Boolean(claim.token);
  return session.token === claim.token;
}

export function isSessionStale(session: DiningSession, now = Date.now()) {
  if (!isActiveSession(session)) return false;
  const idleMs = appConfig.sessionIdleMinutes * 60 * 1000;
  const last = new Date(session.lastActivityAt ?? session.updatedAt).getTime();
  return now - last >= idleMs;
}

export function idleMinutes(session: DiningSession, now = Date.now()) {
  const last = new Date(session.lastActivityAt ?? session.updatedAt).getTime();
  return Math.max(0, Math.floor((now - last) / 60000));
}

export function sessionOutcomeLabel(session: DiningSession) {
  if (session.closeReason === "abandoned") return "Force clear";
  if (session.closeReason === "exited") return "Guest exited";
  if (session.closeReason === "paid") return "Paid";
  return "Closed";
}

export function sessionHasUnpaidOrders(orders: Order[]) {
  return orders.some((order) => order.status !== "paid" && order.status !== "cancelled");
}
