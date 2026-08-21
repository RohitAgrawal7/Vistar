import { computeAnalytics } from "@/lib/analytics";
import { appConfig } from "@/lib/config";
import { computeTotals } from "@/lib/format";
import { createId, isValidIdempotencyKey } from "@/lib/id";
import { withExclusiveLock } from "@/lib/lock";
import { MENU_ITEMS } from "@/lib/menu";
import {
  createResumeNonce,
  encodeResumeCode,
  parseResumeCode,
  RESUME_TTL_MS,
  resumeSignatureMatches,
  signResume,
} from "@/lib/resume";
import {
  activeSessionForTable,
  canAddOrders,
  isActiveSession,
  isValidGuestName,
  ordersForSession,
  redactSession,
  sanitizeGuestName,
} from "@/lib/session";
import {
  isValidAbandonNote,
  isValidStaffName,
  isValidStaffPin,
  pinsMatch,
  sanitizeAbandonNote,
} from "@/lib/staff";
import { delay, type OrderService, ApiError } from "@/lib/api/types";
import { pullFloorFromStorage, useOrderStore } from "@/store/order-store";
import { getStaffName, getStaffToken, useStaffStore } from "@/store/staff-store";
import type {
  AuditEvent,
  CreateOrderInput,
  CreateSessionInput,
  DiningSession,
  Order,
  OrderStatus,
  PaymentMethod,
  ResumeGrant,
  SessionCloseReason,
} from "@/lib/types";

function getFloor() {
  return useOrderStore.getState();
}

function requireSession(id: string) {
  const session = getFloor().sessions.find((item) => item.id === id);
  if (!session) throw new ApiError("Session not found", 404);
  return session;
}

function requireOrder(id: string) {
  const order = getFloor().orders.find((item) => item.id === id);
  if (!order) throw new ApiError("Order not found", 404);
  return order;
}

function assertGuest(session: DiningSession, token: string) {
  if (session.status === "closed" || !session.token) {
    throw new ApiError("This session has ended", 401);
  }
  if (!token || session.token !== token) {
    throw new ApiError("This session belongs to another guest", 403);
  }
}

function assertStaff() {
  const token = getStaffToken();
  if (!token) {
    throw new ApiError("Staff sign-in required", 401);
  }
}

function recordAudit(partial: Omit<AuditEvent, "id" | "at" | "staffName"> & { staffName?: string }) {
  getFloor().appendAudit({
    id: createId("aud"),
    at: new Date().toISOString(),
    staffName: partial.staffName ?? getStaffName() ?? "Staff",
    ...partial,
  });
}

function touch(session: DiningSession, now = new Date().toISOString()): DiningSession {
  return { ...session, updatedAt: now, lastActivityAt: now };
}

function saveSession(next: DiningSession) {
  getFloor().upsertSession(next);
  return next;
}

function saveOrder(next: Order) {
  getFloor().upsertOrder(next);
  return next;
}

function closeTable(
  session: DiningSession,
  reason: SessionCloseReason,
  note: string,
) {
  const now = new Date().toISOString();
  const closed = saveSession({
    ...session,
    status: "closed",
    token: "",
    tokenRevokedAt: now,
    closeReason: reason,
    abandonNote: reason === "abandoned" ? note : undefined,
    closedAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });
  const action =
    reason === "abandoned"
      ? "session_abandoned"
      : reason === "exited"
        ? "session_exited"
        : "session_closed";
  recordAudit({
    action,
    note,
    tableId: session.tableId,
    sessionId: session.id,
    guestName: session.guestName,
    staffName: reason === "exited" ? "Guest" : undefined,
  });
  return closed;
}

async function exclusiveFloor<T>(name: string, run: () => T | Promise<T>): Promise<T> {
  return withExclusiveLock(name, () => {
    pullFloorFromStorage();
    return run();
  });
}

export const mockOrderService: OrderService = {
  async staffLogin(input) {
    await delay(220);
    const staffName = sanitizeGuestName(input.staffName);
    if (!isValidStaffName(staffName)) {
      throw new ApiError("Enter your name", 400);
    }
    if (!isValidStaffPin(input.pin) || !pinsMatch(input.pin, appConfig.staffPin)) {
      throw new ApiError("Incorrect kitchen PIN", 401);
    }
    const session = { token: createId("staff"), staffName };
    recordAudit({
      action: "staff_login",
      note: "Staff signed in to kitchen dashboard",
      staffName,
    });
    return session;
  },

  async staffLogout() {
    await delay(80);
    const staffName = getStaffName();
    if (staffName) {
      recordAudit({
        action: "staff_logout",
        note: "Staff signed out",
        staffName,
      });
    }
    useStaffStore.getState().logout();
  },

  async getMenu() {
    await delay(180);
    return MENU_ITEMS.filter((item) => item.available);
  },

  async getTableOccupancy(tableId) {
    await delay(80);
    pullFloorFromStorage();
    const active = activeSessionForTable(getFloor().sessions, tableId);
    return { tableId, occupied: Boolean(active) };
  },

  async getMySession(tableId, token) {
    await delay(120);
    if (!token) throw new ApiError("This session has ended", 401);
    const owned = getFloor().sessions.find(
      (item) => item.tableId === tableId && Boolean(item.token) && item.token === token,
    );
    if (!owned) {
      const active = activeSessionForTable(getFloor().sessions, tableId);
      if (active) throw new ApiError("This session belongs to another guest", 403);
      return null;
    }
    if (owned.status === "closed") {
      throw new ApiError("This session has ended", 401);
    }
    return {
      session: redactSession(owned),
      orders: ordersForSession(getFloor().orders, owned.id),
    };
  },

  async listSessions() {
    await delay(120);
    assertStaff();
    return getFloor().sessions.map(redactSession);
  },

  async startSession(input: CreateSessionInput) {
    await delay(320);
    const guestName = sanitizeGuestName(input.guestName);
    if (!isValidGuestName(guestName)) {
      throw new ApiError("Enter a name of at least two letters", 400);
    }
    const now = new Date().toISOString();
    const session: DiningSession = {
      id: createId("ses"),
      tableId: input.tableId,
      guestName,
      token: createId("tok"),
      status: "open",
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    const claimed = await exclusiveFloor(`vistar-table-claim-${input.tableId}`, () =>
      getFloor().claimTable(session),
    );
    if (!claimed) {
      throw new ApiError("This table is occupied. Please wait.", 409);
    }
    return session;
  },

  async requestBill(sessionId, token) {
    await delay(280);
    const session = requireSession(sessionId);
    assertGuest(session, token);
    if (session.status === "closed") {
      throw new ApiError("This session is already closed", 409);
    }
    if (session.status === "paid") return redactSession(session);
    const orders = ordersForSession(getFloor().orders, sessionId);
    if (orders.length === 0) {
      throw new ApiError("Add at least one order before viewing the bill", 400);
    }
    const now = new Date().toISOString();
    return redactSession(
      saveSession({
        ...touch(session, now),
        status: "billing",
        billedAt: session.billedAt ?? now,
      }),
    );
  },

  async paySession(sessionId, token, method: PaymentMethod) {
    await delay(480);
    const session = requireSession(sessionId);
    assertGuest(session, token);
    if (session.status !== "billing") {
      throw new ApiError("Request the final bill before paying", 409);
    }
    const now = new Date().toISOString();
    const orders = getFloor().orders.map((order) =>
      order.sessionId === sessionId && order.status !== "cancelled"
        ? { ...order, status: "paid" as const, paymentMethod: method, paidAt: now, updatedAt: now }
        : order,
    );
    useOrderStore.getState().replaceFloor({
      sessions: getFloor().sessions,
      orders,
    });
    return redactSession(
      saveSession({
        ...touch(session, now),
        status: "paid",
        paymentMethod: method,
        paidAt: now,
      }),
    );
  },

  async closeSession(sessionId) {
    await delay(260);
    assertStaff();
    return exclusiveFloor(`vistar-session-close-${sessionId}`, () => {
      let session = requireSession(sessionId);
      if (session.status === "closed") {
        throw new ApiError("This session is already closed", 409);
      }
      const live = ordersForSession(getFloor().orders, session.id);
      if (session.status !== "paid") {
        if (live.length === 0) {
          throw new ApiError("No bill to confirm. Force clear if the guest left without ordering.", 409);
        }
        const now = new Date().toISOString();
        const method = session.paymentMethod ?? "cash";
        useOrderStore.getState().replaceFloor({
          sessions: getFloor().sessions,
          orders: getFloor().orders.map((order) =>
            order.sessionId === session.id && order.status !== "cancelled"
              ? {
                  ...order,
                  status: "paid" as const,
                  paymentMethod: method,
                  paidAt: now,
                  updatedAt: now,
                }
              : order,
          ),
        });
        session = saveSession({
          ...touch(session, now),
          status: "paid",
          paymentMethod: method,
          paidAt: now,
        });
      }
      return redactSession(closeTable(session, "paid", "Staff confirmed payment — table cleared"));
    });
  },

  async abandonSession(sessionId, note) {
    await delay(260);
    assertStaff();
    const reason = sanitizeAbandonNote(note);
    if (!isValidAbandonNote(reason)) {
      throw new ApiError("Add a short note (at least 8 characters) before force-clearing", 400);
    }
    const session = requireSession(sessionId);
    if (session.status === "closed") {
      throw new ApiError("This session is already closed", 409);
    }
    return redactSession(closeTable(session, "abandoned", reason));
  },

  async exitSession(sessionId, token) {
    await delay(240);
    const session = requireSession(sessionId);
    assertGuest(session, token);
    if (session.status === "closed") {
      throw new ApiError("This session is already closed", 409);
    }
    const paidLeave = session.status === "paid";
    return exclusiveFloor(`vistar-session-exit-${sessionId}`, () =>
      redactSession(
        closeTable(
          session,
          paidLeave ? "paid" : "exited",
          paidLeave
            ? "Paid — guest left the table"
            : "Guest left the table. Orders stay with the café.",
        ),
      ),
    );
  },

  async createResumeCode(sessionId) {
    await delay(240);
    assertStaff();
    const session = requireSession(sessionId);
    if (!isActiveSession(session)) {
      throw new ApiError("Only a live table can be resumed on a new device", 409);
    }
    const nonce = createResumeNonce();
    const expiresAt = Date.now() + RESUME_TTL_MS;
    const signature = await signResume(session.id, nonce, expiresAt);
    const grant: ResumeGrant = {
      id: createId("res"),
      nonce,
      signature,
      sessionId: session.id,
      tableId: session.tableId,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    await exclusiveFloor(`vistar-resume-issue-${session.id}`, () => {
      getFloor().putResumeGrant(grant);
    });
    recordAudit({
      action: "session_resumed",
      note: "Staff issued a one-time resume QR for a new device",
      tableId: session.tableId,
      sessionId: session.id,
      guestName: session.guestName,
    });
    return {
      code: encodeResumeCode(nonce, expiresAt, signature),
      sessionId: session.id,
      tableId: session.tableId,
      guestName: session.guestName,
      expiresAt,
    };
  },

  async claimResume(code) {
    await delay(320);
    const parsed = parseResumeCode(code);
    if (!parsed) {
      throw new ApiError("This resume code is not valid", 400);
    }
    return exclusiveFloor(`vistar-resume-claim-${parsed.nonce}`, async () => {
      const grant = getFloor().resumeGrants.find((item) => item.nonce === parsed.nonce);
      if (!grant) {
        throw new ApiError("This resume code is not valid", 404);
      }
      if (grant.usedAt) {
        throw new ApiError("This resume code was already used", 409);
      }
      if (Date.now() > grant.expiresAt || parsed.exp !== grant.expiresAt) {
        throw new ApiError("This resume code has expired. Ask staff for a new one.", 410);
      }
      const signatureOk = await resumeSignatureMatches(
        grant.sessionId,
        grant.nonce,
        grant.expiresAt,
        parsed.signature,
      );
      if (!signatureOk || parsed.signature !== grant.signature) {
        throw new ApiError("This resume code is not valid", 400);
      }
      const session = requireSession(grant.sessionId);
      if (!isActiveSession(session) || !session.token) {
        throw new ApiError("This table is no longer live", 409);
      }
      const now = new Date().toISOString();
      const nextToken = createId("tok");
      saveSession({
        ...session,
        token: nextToken,
        updatedAt: now,
        lastActivityAt: now,
      });
      getFloor().putResumeGrant({ ...grant, usedAt: now });
      recordAudit({
        action: "session_resumed",
        note: "Guest claimed a new device. The previous phone token was revoked.",
        tableId: session.tableId,
        sessionId: session.id,
        guestName: session.guestName,
      });
      return {
        tableId: session.tableId,
        sessionId: session.id,
        token: nextToken,
        guestName: session.guestName,
      };
    });
  },

  async listOrders() {
    await delay(140);
    assertStaff();
    return getFloor().orders;
  },

  async listAuditEvents() {
    await delay(100);
    assertStaff();
    return getFloor().auditLog;
  },

  async getOrder(id, token) {
    await delay(100);
    const order = requireOrder(id);
    const session = requireSession(order.sessionId);
    assertGuest(session, token);
    return order;
  },

  async createOrder(input: CreateOrderInput) {
    await delay(420);
    if (!isValidIdempotencyKey(input.idempotencyKey)) {
      throw new ApiError("A valid idempotency key is required", 400);
    }
    const session = requireSession(input.sessionId);
    assertGuest(session, input.token);
    if (session.tableId !== input.tableId) {
      throw new ApiError("Order table does not match this session", 400);
    }
    if (!canAddOrders(session)) {
      throw new ApiError("The final bill is locked. No more orders can be added.", 409);
    }
    if (!input.items.length) {
      throw new ApiError("Add at least one item before submitting", 400);
    }
    const now = new Date().toISOString();
    const totals = computeTotals(input.items);
    const draft: Order = {
      id: createId("ord"),
      sessionId: session.id,
      tableId: session.tableId,
      sequence: 0,
      items: input.items,
      status: "pending",
      notes: input.notes?.trim() ?? "",
      ...totals,
      createdAt: now,
      updatedAt: now,
      idempotencyKey: input.idempotencyKey,
    };
    const result = await exclusiveFloor(`vistar-order-commit-${session.id}`, () => {
      const live = requireSession(input.sessionId);
      assertGuest(live, input.token);
      if (!canAddOrders(live)) {
        throw new ApiError("The final bill is locked. No more orders can be added.", 409);
      }
      return getFloor().commitIdempotentOrder(draft);
    });
    if (result.status === "conflict") {
      throw new ApiError("This submit was already used with different items", 409);
    }
    return result.order;
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    await delay(280);
    assertStaff();
    const current = requireOrder(id);
    const session = requireSession(current.sessionId);
    if (session.status === "closed" && session.closeReason === "paid") {
      throw new ApiError("Closed paid sessions cannot be changed", 409);
    }
    if (status === "cancelled") {
      if (current.status === "paid" || current.status === "cancelled") {
        throw new ApiError("This ticket cannot be removed", 409);
      }
      if (session.status === "paid" || session.status === "billing") {
        throw new ApiError("The final bill is locked. Tickets cannot be removed.", 409);
      }
    }
    if (current.status === "cancelled") {
      const restoreTo = current.cancelledFrom ?? "pending";
      if (status === "cancelled") {
        throw new ApiError("This ticket is already deleted", 409);
      }
      if (session.status === "paid" || session.status === "billing" || (session.status === "closed" && session.closeReason === "paid")) {
        throw new ApiError("A locked or paid visit cannot restore a deleted ticket", 409);
      }
      const now = new Date().toISOString();
      saveSession(touch(session, now));
      const restored = saveOrder({
        ...current,
        status: restoreTo,
        cancelledFrom: undefined,
        cancelledAt: undefined,
        updatedAt: now,
      });
      recordAudit({
        action: "order_restored",
        note: `Undid delete on ticket #${current.sequence}`,
        tableId: session.tableId,
        sessionId: session.id,
        guestName: session.guestName,
      });
      return restored;
    }
    const now = new Date().toISOString();
    saveSession(touch(session, now));
    const next = saveOrder({
      ...current,
      status,
      updatedAt: now,
      confirmedAt: status === "confirmed" ? now : current.confirmedAt,
      readyAt: status === "ready" || status === "awaiting_payment" ? now : current.readyAt,
      cancelledFrom:
        status === "cancelled" && current.status !== "paid" ? current.status : current.cancelledFrom,
      cancelledAt: status === "cancelled" ? now : current.cancelledAt,
    });
    if (status === "cancelled") {
      recordAudit({
        action: "order_cancelled",
        note: `Removed ticket #${current.sequence} (${current.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")})`,
        tableId: session.tableId,
        sessionId: session.id,
        guestName: session.guestName,
      });
    }
    return next;
  },

  async getAnalytics() {
    await delay(140);
    assertStaff();
    return computeAnalytics(getFloor().orders);
  },

  async reviewSession(sessionId, input) {
    await delay(160);
    const session = requireSession(sessionId);
    if (session.tableId !== input.tableId) {
      throw new ApiError("This review does not match the table", 400);
    }
    const paid =
      session.status === "paid" || (session.status === "closed" && session.closeReason === "paid");
    if (!paid) throw new ApiError("Reviews open after staff confirm payment", 409);
    const now = new Date().toISOString();
    const stars = Math.floor(Number(input.rating ?? 0));
    const rating = stars >= 1 && stars <= 5 ? stars : session.rating;
    const reviewNote = stars >= 1 ? (input.reviewNote ?? "").trim().slice(0, 400) : session.reviewNote;
    return redactSession(
      saveSession({
        ...session,
        rating,
        reviewNote,
        reviewedAt: now,
        updatedAt: now,
      }),
    );
  },
};
