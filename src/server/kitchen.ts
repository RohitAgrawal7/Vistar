import { computeAnalytics } from "@/lib/analytics";
import { getMenuItem, MENU_ITEMS } from "@/lib/menu";
import {
  createResumeNonce,
  encodeResumeCode,
  parseResumeCode,
  RESUME_TTL_MS,
  resumeSignatureMatches,
  signResume,
} from "@/lib/resume";
import type {
  CreateOrderInput,
  CreateSessionInput,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  ResumeGrant,
  ResumeTicket,
  ReviewInput,
  SessionCloseReason,
  StaffLoginInput,
  StoredSession,
} from "@/lib/types";
import { serverConfig } from "@/server/config";
import { withFloor, withFloorRead, type FloorState } from "@/server/floor-store";
import { ApiError, computeTotals, createId, isValidIdempotencyKey } from "@/server/http";
import {
  activeSessionForTable,
  canAddOrders,
  isActiveSession,
  isFloorTableId,
  isValidAbandonNote,
  isValidGuestName,
  isValidStaffName,
  isValidStaffPin,
  orderBodiesMatch,
  ordersForSession,
  pinsMatch,
  redactSession,
  sanitizeAbandonNote,
  sanitizeGuestName,
} from "@/server/rules";
import { getSupabase, supabaseEnvStatus } from "@/server/supabase";

const PAYMENT_METHODS: PaymentMethod[] = ["card", "wallet", "cash"];

function requireSession(floor: FloorState, id: string) {
  const session = floor.sessions.find((item) => item.id === id);
  if (!session) throw new ApiError("Session not found", 404);
  return session;
}

function requireOrder(floor: FloorState, id: string) {
  const order = floor.orders.find((item) => item.id === id);
  if (!order) throw new ApiError("Order not found", 404);
  return order;
}

function assertGuest(session: StoredSession, token: string) {
  if (session.status === "closed" || !session.token) {
    throw new ApiError("This session has ended", 401);
  }
  if (!token || session.token !== token) {
    throw new ApiError("This session belongs to another guest", 403);
  }
}

function requireStaff(floor: FloorState, token: string) {
  const staff = floor.staff.find((item) => item.token === token);
  if (!staff) throw new ApiError("Staff sign-in required", 401);
  return staff;
}

function recordAudit(
  floor: FloorState,
  partial: Omit<FloorState["auditLog"][number], "id" | "at">,
) {
  floor.auditLog.unshift({
    id: createId("aud"),
    at: new Date().toISOString(),
    ...partial,
  });
  floor.auditLog = floor.auditLog.slice(0, 200);
}

function touch(session: StoredSession, now = new Date().toISOString()): StoredSession {
  return { ...session, updatedAt: now, lastActivityAt: now };
}

function saveSession(floor: FloorState, next: StoredSession) {
  const index = floor.sessions.findIndex((item) => item.id === next.id);
  if (index === -1) {
    floor.sessions.unshift(next);
    return next;
  }
  floor.sessions[index] = next;
  return next;
}

function saveOrder(floor: FloorState, next: Order) {
  const index = floor.orders.findIndex((item) => item.id === next.id);
  if (index === -1) {
    floor.orders.unshift(next);
    return next;
  }
  floor.orders[index] = next;
  return next;
}

function closeTable(
  floor: FloorState,
  session: StoredSession,
  reason: SessionCloseReason,
  note: string,
  staffName: string,
) {
  const now = new Date().toISOString();
  const closed = saveSession(floor, {
    ...session,
    status: "closed",
    revokedToken: session.token || session.revokedToken,
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
  recordAudit(floor, {
    action,
    note,
    tableId: session.tableId,
    sessionId: session.id,
    guestName: session.guestName,
    staffName: reason === "exited" ? "Guest" : staffName,
  });
  return closed;
}

function markOrdersPaid(floor: FloorState, sessionId: string, method: PaymentMethod, now: string) {
  floor.orders = floor.orders.map((order) =>
    order.sessionId === sessionId && order.status !== "cancelled"
      ? { ...order, status: "paid" as const, paymentMethod: method, paidAt: now, updatedAt: now }
      : order,
  );
}

function pricedLines(items: OrderLine[]): OrderLine[] {
  if (!items.length) throw new ApiError("Add at least one item before submitting", 400);
  return items.map((line) => {
    const catalog = getMenuItem(line.itemId);
    if (!catalog || !catalog.available) {
      throw new ApiError("One of the dishes is no longer on the menu", 400);
    }
    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      throw new ApiError("Quantity must be between 1 and 20", 400);
    }
    return {
      itemId: catalog.id,
      name: catalog.name,
      category: catalog.category,
      unitPrice: catalog.price,
      quantity,
    };
  });
}

function parseMethod(value: unknown): PaymentMethod {
  if (typeof value !== "string" || !PAYMENT_METHODS.includes(value as PaymentMethod)) {
    throw new ApiError("Choose card, UPI, or cash", 400);
  }
  return value as PaymentMethod;
}

export const kitchen = {
  getMenu() {
    return MENU_ITEMS.filter((item) => item.available);
  },

  async health() {
    const env = supabaseEnvStatus();
    if (!env.configured) {
      return {
        ok: false,
        service: "vistar-kitchen",
        database: "supabase",
        configured: false,
        hasUrl: env.hasUrl,
        hasKey: env.hasKey,
        tables: ["1", "2", "3", "4", "5"],
        hint: "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_PUBLISHABLE_KEY) on Vercel, use Framework Preset Next.js (not Services), then Redeploy.",
      };
    }
    const { error } = await getSupabase().from("dining_sessions").select("id").limit(1);
    return {
      ok: !error,
      service: "vistar-kitchen",
      database: "supabase",
      configured: true,
      hasUrl: true,
      hasKey: true,
      tables: ["1", "2", "3", "4", "5"],
      error: error?.message,
    };
  },

  async staffLogin(input: StaffLoginInput) {
    const staffName = sanitizeGuestName(input.staffName ?? "");
    if (!isValidStaffName(staffName)) throw new ApiError("Enter your name", 400);
    if (!isValidStaffPin(input.pin) || !pinsMatch(input.pin, serverConfig.staffPin)) {
      throw new ApiError("Incorrect kitchen PIN", 401);
    }
    return withFloor((floor) => {
      const token = createId("staff");
      floor.staff = [
        { token, staffName, createdAt: new Date().toISOString() },
        ...floor.staff.filter((item) => item.staffName !== staffName),
      ].slice(0, 40);
      recordAudit(floor, {
        action: "staff_login",
        note: "Staff signed in to kitchen dashboard",
        staffName,
      });
      return { token, staffName };
    });
  },

  async staffLogout(token: string) {
    return withFloor((floor) => {
      const staff = floor.staff.find((item) => item.token === token);
      if (staff) {
        recordAudit(floor, {
          action: "staff_logout",
          note: "Staff signed out",
          staffName: staff.staffName,
        });
        floor.staff = floor.staff.filter((item) => item.token !== token);
      }
    });
  },

  async getTableOccupancy(tableId: string) {
    if (!isFloorTableId(tableId)) throw new ApiError("Unknown table", 404);
    return withFloorRead((floor) => ({
      tableId,
      occupied: Boolean(activeSessionForTable(floor.sessions, tableId)),
    }));
  },

  async getMySession(tableId: string, token: string) {
    if (!token) throw new ApiError("This session has ended", 401);
    if (!isFloorTableId(tableId)) throw new ApiError("Unknown table", 404);
    return withFloorRead((floor) => {
      const owned = floor.sessions.find(
        (item) =>
          item.tableId === tableId &&
          Boolean(token) &&
          (item.token === token || item.revokedToken === token),
      );
      if (!owned) {
        const active = activeSessionForTable(floor.sessions, tableId);
        if (active) throw new ApiError("This session belongs to another guest", 403);
        return null;
      }
      if (owned.status === "closed" && owned.closeReason !== "paid") {
        throw new ApiError("This session has ended", 401);
      }
      return {
        session: redactSession(owned),
        orders: ordersForSession(floor.orders, owned.id),
      };
    });
  },

  async listSessions(staffToken: string) {
    return withFloorRead((floor) => {
      requireStaff(floor, staffToken);
      return floor.sessions.map(redactSession);
    });
  },

  async startSession(input: CreateSessionInput) {
    if (!isFloorTableId(input.tableId)) throw new ApiError("Unknown table", 404);
    const guestName = sanitizeGuestName(input.guestName ?? "");
    if (!isValidGuestName(guestName)) {
      throw new ApiError("Enter a name of at least two letters", 400);
    }
    return withFloor((floor) => {
      if (activeSessionForTable(floor.sessions, input.tableId)) {
        throw new ApiError("This table is occupied. Please wait.", 409);
      }
      const now = new Date().toISOString();
      const session: StoredSession = {
        id: createId("ses"),
        tableId: input.tableId,
        guestName,
        token: createId("tok"),
        status: "open",
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
      };
      saveSession(floor, session);
      return session;
    });
  },

  async requestBill(sessionId: string, token: string) {
    return withFloor((floor) => {
      const session = requireSession(floor, sessionId);
      assertGuest(session, token);
      if (session.status === "paid") return redactSession(session);
      const orders = ordersForSession(floor.orders, sessionId);
      if (orders.length === 0) {
        throw new ApiError("Add at least one order before viewing the bill", 400);
      }
      const now = new Date().toISOString();
      return redactSession(
        saveSession(floor, {
          ...touch(session, now),
          status: "billing",
          billedAt: session.billedAt ?? now,
        }),
      );
    });
  },

  async paySession(sessionId: string, token: string, method: PaymentMethod) {
    return withFloor((floor) => {
      const session = requireSession(floor, sessionId);
      assertGuest(session, token);
      if (session.status !== "billing") {
        throw new ApiError("Request the final bill before paying", 409);
      }
      const now = new Date().toISOString();
      markOrdersPaid(floor, sessionId, method, now);
      return redactSession(
        saveSession(floor, {
          ...touch(session, now),
          status: "paid",
          paymentMethod: method,
          paidAt: now,
        }),
      );
    });
  },

  async closeSession(sessionId: string, staffToken: string) {
    return withFloor((floor) => {
      const staff = requireStaff(floor, staffToken);
      let session = requireSession(floor, sessionId);
      if (session.status === "closed") {
        throw new ApiError("This session is already closed", 409);
      }
      const live = ordersForSession(floor.orders, session.id);
      if (session.status !== "paid") {
        if (live.length === 0) {
          throw new ApiError("No bill to confirm. Force clear if the guest left without ordering.", 409);
        }
        const now = new Date().toISOString();
        const method = session.paymentMethod ?? "cash";
        markOrdersPaid(floor, session.id, method, now);
        session = saveSession(floor, {
          ...touch(session, now),
          status: "paid",
          paymentMethod: method,
          paidAt: now,
        });
      }
      return redactSession(
        closeTable(floor, session, "paid", "Staff confirmed payment — table cleared", staff.staffName),
      );
    });
  },

  async abandonSession(sessionId: string, staffToken: string, note: string) {
    return withFloor((floor) => {
      const staff = requireStaff(floor, staffToken);
      const reason = sanitizeAbandonNote(note);
      if (!isValidAbandonNote(reason)) {
        throw new ApiError("Add a short note (at least 8 characters) before force-clearing", 400);
      }
      const session = requireSession(floor, sessionId);
      if (session.status === "closed") {
        throw new ApiError("This session is already closed", 409);
      }
      return redactSession(closeTable(floor, session, "abandoned", reason, staff.staffName));
    });
  },

  async exitSession(sessionId: string, token: string) {
    return withFloor((floor) => {
      const session = requireSession(floor, sessionId);
      assertGuest(session, token);
      const paidLeave = session.status === "paid";
      return redactSession(
        closeTable(
          floor,
          session,
          paidLeave ? "paid" : "exited",
          paidLeave ? "Paid — guest left the table" : "Guest left the table. Orders stay with the café.",
          "Guest",
        ),
      );
    });
  },

  async createResumeCode(sessionId: string, staffToken: string): Promise<ResumeTicket> {
    return withFloor(async (floor) => {
      const staff = requireStaff(floor, staffToken);
      const session = requireSession(floor, sessionId);
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
      floor.resumeGrants = [
        grant,
        ...floor.resumeGrants.filter((item) => !(item.sessionId === grant.sessionId && !item.usedAt)),
      ].slice(0, 100);
      recordAudit(floor, {
        action: "session_resumed",
        note: "Staff issued a one-time resume QR for a new device",
        tableId: session.tableId,
        sessionId: session.id,
        guestName: session.guestName,
        staffName: staff.staffName,
      });
      return {
        code: encodeResumeCode(nonce, expiresAt, signature),
        sessionId: session.id,
        tableId: session.tableId,
        guestName: session.guestName,
        expiresAt,
      };
    });
  },

  async claimResume(code: string) {
    const parsed = parseResumeCode(code);
    if (!parsed) throw new ApiError("This resume code is not valid", 400);
    return withFloor(async (floor) => {
      const grant = floor.resumeGrants.find((item) => item.nonce === parsed.nonce);
      if (!grant) throw new ApiError("This resume code is not valid", 404);
      if (grant.usedAt) throw new ApiError("This resume code was already used", 409);
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
      const session = requireSession(floor, grant.sessionId);
      if (!isActiveSession(session) || !session.token) {
        throw new ApiError("This table is no longer live", 409);
      }
      const now = new Date().toISOString();
      const nextToken = createId("tok");
      saveSession(floor, {
        ...session,
        token: nextToken,
        revokedToken: session.token,
        updatedAt: now,
        lastActivityAt: now,
      });
      const grantIndex = floor.resumeGrants.findIndex((item) => item.id === grant.id);
      if (grantIndex >= 0) floor.resumeGrants[grantIndex] = { ...grant, usedAt: now };
      recordAudit(floor, {
        action: "session_resumed",
        note: "Guest claimed a new device. The previous phone token was revoked.",
        tableId: session.tableId,
        sessionId: session.id,
        guestName: session.guestName,
        staffName: "Guest",
      });
      return {
        tableId: session.tableId,
        sessionId: session.id,
        token: nextToken,
        guestName: session.guestName,
      };
    });
  },

  async reviewSession(sessionId: string, input: ReviewInput) {
    return withFloor((floor) => {
      const session = requireSession(floor, sessionId);
      if (session.tableId !== input.tableId) {
        throw new ApiError("This review does not match the table", 400);
      }
      const paid =
        session.status === "paid" || (session.status === "closed" && session.closeReason === "paid");
      if (!paid) throw new ApiError("Reviews open after staff confirm payment", 409);
      const now = new Date().toISOString();
      const stars = Math.floor(Number(input.rating ?? 0));
      const rating = stars >= 1 && stars <= 5 ? stars : session.rating;
      const reviewNote =
        stars >= 1 ? (input.reviewNote ?? "").trim().slice(0, 400) : session.reviewNote;
      return redactSession(
        saveSession(floor, {
          ...session,
          rating,
          reviewNote,
          reviewedAt: now,
          updatedAt: now,
        }),
      );
    });
  },

  async listOrders(staffToken: string) {
    return withFloorRead((floor) => {
      requireStaff(floor, staffToken);
      return floor.orders;
    });
  },

  async listAuditEvents(staffToken: string) {
    return withFloorRead((floor) => {
      requireStaff(floor, staffToken);
      return floor.auditLog;
    });
  },

  async getAnalytics(staffToken: string) {
    return withFloorRead((floor) => {
      requireStaff(floor, staffToken);
      return computeAnalytics(floor.orders);
    });
  },

  async getOrder(id: string, token: string) {
    return withFloorRead((floor) => {
      const order = requireOrder(floor, id);
      const session = requireSession(floor, order.sessionId);
      assertGuest(session, token);
      return order;
    });
  },

  async createOrder(input: CreateOrderInput) {
    if (!isValidIdempotencyKey(input.idempotencyKey)) {
      throw new ApiError("A valid idempotency key is required", 400);
    }
    const items = pricedLines(input.items ?? []);
    return withFloor((floor) => {
      const session = requireSession(floor, input.sessionId);
      assertGuest(session, input.token);
      if (session.tableId !== input.tableId) {
        throw new ApiError("Order table does not match this session", 400);
      }
      if (!canAddOrders(session)) {
        throw new ApiError("The final bill is locked. No more orders can be added.", 409);
      }
      const replayed = floor.orders.find(
        (item) =>
          item.sessionId === session.id &&
          Boolean(item.idempotencyKey) &&
          item.idempotencyKey === input.idempotencyKey,
      );
      if (replayed) {
        if (!orderBodiesMatch(replayed, { items, notes: input.notes ?? "" })) {
          throw new ApiError("This submit was already used with different items", 409);
        }
        return replayed;
      }
      const now = new Date().toISOString();
      const totals = computeTotals(items, serverConfig.taxRate);
      const sequence =
        floor.orders
          .filter((item) => item.sessionId === session.id && item.status !== "cancelled")
          .reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
      const order: Order = {
        id: createId("ord"),
        sessionId: session.id,
        tableId: session.tableId,
        sequence,
        items,
        status: "pending",
        notes: (input.notes ?? "").trim(),
        ...totals,
        createdAt: now,
        updatedAt: now,
        idempotencyKey: input.idempotencyKey,
      };
      saveOrder(floor, order);
      saveSession(floor, touch(session, now));
      return order;
    });
  },

  async updateOrderStatus(id: string, status: OrderStatus, staffToken: string) {
    const allowed: OrderStatus[] = [
      "pending",
      "confirmed",
      "ready",
      "awaiting_payment",
      "paid",
      "cancelled",
    ];
    if (!allowed.includes(status)) throw new ApiError("Unknown kitchen status", 400);
    return withFloor((floor) => {
      const staff = requireStaff(floor, staffToken);
      const current = requireOrder(floor, id);
      const session = requireSession(floor, current.sessionId);
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
        if (status === "cancelled") throw new ApiError("This ticket is already deleted", 409);
        if (
          session.status === "paid" ||
          session.status === "billing" ||
          (session.status === "closed" && session.closeReason === "paid")
        ) {
          throw new ApiError("A locked or paid visit cannot restore a deleted ticket", 409);
        }
        const now = new Date().toISOString();
        saveSession(floor, touch(session, now));
        const restored = saveOrder(floor, {
          ...current,
          status: restoreTo,
          cancelledFrom: undefined,
          cancelledAt: undefined,
          updatedAt: now,
        });
        recordAudit(floor, {
          action: "order_restored",
          note: `Undid delete on ticket #${current.sequence}`,
          tableId: session.tableId,
          sessionId: session.id,
          guestName: session.guestName,
          staffName: staff.staffName,
        });
        return restored;
      }
      const now = new Date().toISOString();
      saveSession(floor, touch(session, now));
      const next = saveOrder(floor, {
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
        recordAudit(floor, {
          action: "order_cancelled",
          note: `Removed ticket #${current.sequence} (${current.items
            .map((item) => `${item.quantity}× ${item.name}`)
            .join(", ")})`,
          tableId: session.tableId,
          sessionId: session.id,
          guestName: session.guestName,
          staffName: staff.staffName,
        });
      }
      return next;
    });
  },

  parseMethod,
};
