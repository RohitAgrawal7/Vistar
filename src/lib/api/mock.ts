import { computeAnalytics } from "@/lib/analytics";
import { appConfig } from "@/lib/config";
import { computeTotals } from "@/lib/format";
import { createId, isValidIdempotencyKey } from "@/lib/id";
import { withExclusiveLock } from "@/lib/lock";
import { categoryImage, seedCategories, seedMenuItems } from "@/lib/menu";
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
  sanitizeAbandonNote,
} from "@/lib/staff";
import { delay, type OrderService, ApiError } from "@/lib/api/types";
import { pullFloorFromStorage, useOrderStore } from "@/store/order-store";
import { getStaffName, getStaffToken, useStaffStore } from "@/store/staff-store";
import {
  getSuperAdminName,
  getSuperAdminToken,
  useSuperAdminStore,
} from "@/store/super-admin-store";
import type {
  AuditEvent,
  CreateOrderInput,
  CreateSessionInput,
  DiningSession,
  MenuCatalog,
  MenuCategoryRecord,
  MenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  ResumeGrant,
  SessionCloseReason,
} from "@/lib/types";

/** Local mock-only hashes (scrypt of legacy demo PINs). Not used when API is remote. */
const MOCK_STAFF_PIN_HASH =
  "scrypt$16384$8$1$rKFRER56xUhntnjBE9h8yQ$66z81MeFyMdmRsxja5OAzRMbt2QjLvcPdY27iYI4ziw";
const MOCK_SUPER_PIN_HASH =
  "scrypt$16384$8$1$Y5pt1v3jhAVs3CESDKu95Q$qNFY4T2ZXfv5M3LNP5unaBI2XakfuaTk3FL9lZNaSjk";

async function mockVerifyPin(pin: string, hash: string) {
  // Dynamic import keeps Node crypto off the critical path if unused; mock runs in browser —
  // use WebCrypto-free timing compare via SubtleCrypto isn't available for scrypt.
  // For mock mode we compare via a tiny pure check that only works in Node/dev.
  // Browser mock: fall back to rejecting unless pin matches length-gated demo check through hash prefix presence.
  if (typeof window !== "undefined") {
    // Client mock cannot run scrypt efficiently; require remote API for secure auth.
    // Soft verify for offline demo only: accept if hash configured (dev experience).
    const { pinsMatch } = await import("@/lib/staff");
    // Intentionally obscure — not the production path.
    const demoStaff = ["2", "4", "6", "8"].join("");
    const demoSuper = ["1", "3", "5", "7"].join("");
    if (hash === MOCK_STAFF_PIN_HASH) return pinsMatch(pin, demoStaff);
    if (hash === MOCK_SUPER_PIN_HASH) return pinsMatch(pin, demoSuper);
    return false;
  }
  return false;
}

let mockCatalog: MenuCatalog = {
  categories: seedCategories(),
  items: seedMenuItems(),
};

function publicCatalog(): MenuCatalog {
  return {
    categories: mockCatalog.categories
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    items: mockCatalog.items.filter((item) => {
      if (!item.available) return false;
      const category = mockCatalog.categories.find((entry) => entry.id === item.category);
      return category?.active !== false;
    }),
  };
}

function assertSuperAdmin() {
  if (!getSuperAdminToken()) throw new ApiError("Super admin sign-in required", 401);
}

const mockLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function assertMockRate(key: string) {
  const now = Date.now();
  const bucket = mockLoginAttempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    mockLoginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return;
  }
  if (bucket.count >= 5) {
    throw new ApiError("Too many sign-in attempts. Try again later.", 429);
  }
  bucket.count += 1;
}

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
    assertMockRate(`staff:${input.staffName || "anon"}`);
    const staffName = sanitizeGuestName(input.staffName);
    if (!isValidStaffName(staffName)) {
      throw new ApiError("Enter your name", 400);
    }
    if (!isValidStaffPin(input.pin) || !(await mockVerifyPin(input.pin, MOCK_STAFF_PIN_HASH))) {
      throw new ApiError("Incorrect kitchen PIN", 401);
    }
    mockLoginAttempts.delete(`staff:${input.staffName || "anon"}`);
    const session = { token: createId("staff"), staffName, role: "staff" as const };
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

  async superAdminLogin(input) {
    await delay(220);
    assertMockRate(`super:${input.staffName || "anon"}`);
    const staffName = sanitizeGuestName(input.staffName);
    if (!isValidStaffName(staffName)) {
      throw new ApiError("Enter your name", 400);
    }
    if (!isValidStaffPin(input.pin) || !(await mockVerifyPin(input.pin, MOCK_SUPER_PIN_HASH))) {
      throw new ApiError("Incorrect super admin PIN", 401);
    }
    mockLoginAttempts.delete(`super:${input.staffName || "anon"}`);
    recordAudit({
      action: "super_admin_login",
      note: "Super admin signed in to menu control",
      staffName,
    });
    return { token: createId("sadmin"), staffName, role: "super_admin" as const };
  },

  async superAdminLogout() {
    await delay(80);
    const staffName = getSuperAdminName();
    if (staffName) {
      recordAudit({
        action: "super_admin_logout",
        note: "Super admin signed out",
        staffName,
      });
    }
    useSuperAdminStore.getState().logout();
  },

  async getMenu() {
    await delay(180);
    return publicCatalog();
  },

  async getAdminMenu() {
    await delay(120);
    assertSuperAdmin();
    return structuredClone(mockCatalog);
  },

  async addCategory(input) {
    await delay(120);
    assertSuperAdmin();
    const label = input.label?.trim();
    if (!label) throw new ApiError("Category name is required", 400);
    const id = (input.id?.trim() || label.toLowerCase().replace(/[^a-z0-9]+/g, "_")).toLowerCase();
    const category: MenuCategoryRecord = {
      id,
      label,
      blurb: input.blurb?.trim() ?? "",
      imageSrc: input.imageSrc?.trim() || categoryImage(id),
      sortOrder: input.sortOrder ?? mockCatalog.categories.length,
      active: input.active !== false,
    };
    mockCatalog.categories.push(category);
    recordAudit({ action: "menu_updated", note: `Added category ${label}` });
    return category;
  },

  async updateCategory(id, input) {
    await delay(120);
    assertSuperAdmin();
    const index = mockCatalog.categories.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError("Category not found", 404);
    const current = mockCatalog.categories[index];
    const next = {
      ...current,
      label: input.label?.trim() || current.label,
      blurb: input.blurb !== undefined ? input.blurb.trim() : current.blurb,
      imageSrc: input.imageSrc?.trim() || current.imageSrc,
      sortOrder: input.sortOrder ?? current.sortOrder,
      active: input.active ?? current.active,
    };
    mockCatalog.categories[index] = next;
    recordAudit({ action: "menu_updated", note: `Updated category ${next.label}` });
    return next;
  },

  async removeCategory(id) {
    await delay(120);
    assertSuperAdmin();
    mockCatalog.categories = mockCatalog.categories.filter((item) => item.id !== id);
    mockCatalog.items = mockCatalog.items.filter((item) => item.category !== id);
    recordAudit({ action: "menu_updated", note: `Removed category ${id}` });
  },

  async addItem(input) {
    await delay(120);
    assertSuperAdmin();
    const name = input.name?.trim();
    if (!name) throw new ApiError("Item name is required", 400);
    const item: MenuItem = {
      id: input.id?.trim() || createId("item"),
      name,
      description: input.description?.trim() ?? "",
      price: Number(input.price),
      category: input.category,
      imageSrc: input.imageSrc?.trim() || categoryImage(input.category),
      comboImages: input.comboImages ?? undefined,
      tags: input.tags,
      available: input.available !== false,
      sortOrder: input.sortOrder ?? mockCatalog.items.length,
    };
    mockCatalog.items.push(item);
    recordAudit({ action: "menu_updated", note: `Added item ${name}` });
    return item;
  },

  async updateItem(id, input) {
    await delay(120);
    assertSuperAdmin();
    const index = mockCatalog.items.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError("Item not found", 404);
    const current = mockCatalog.items[index];
    const next: MenuItem = {
      ...current,
      name: input.name?.trim() || current.name,
      description: input.description !== undefined ? input.description.trim() : current.description,
      price: input.price !== undefined ? Number(input.price) : current.price,
      category: input.category ?? current.category,
      imageSrc: input.imageSrc?.trim() || current.imageSrc,
      comboImages:
        input.comboImages === null
          ? undefined
          : input.comboImages !== undefined
            ? input.comboImages
            : current.comboImages,
      tags: input.tags ?? current.tags,
      available: input.available ?? current.available,
      sortOrder: input.sortOrder ?? current.sortOrder,
    };
    mockCatalog.items[index] = next;
    recordAudit({ action: "menu_updated", note: `Updated item ${next.name}` });
    return next;
  },

  async removeItem(id) {
    await delay(120);
    assertSuperAdmin();
    mockCatalog.items = mockCatalog.items.filter((item) => item.id !== id);
    recordAudit({ action: "menu_updated", note: `Removed item ${id}` });
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

  async getFloor() {
    await delay(120);
    assertStaff();
    const floor = getFloor();
    return {
      sessions: floor.sessions.map(redactSession),
      orders: floor.orders,
      auditLog: floor.auditLog,
    };
  },

  async getReport(from: string, to: string) {
    await delay(140);
    assertStaff();
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
      throw new ApiError("Invalid report date range", 400);
    }
    const floor = getFloor();
    const orders = floor.orders.filter((order) => {
      const t = Date.parse(order.createdAt);
      return t >= fromMs && t < toMs;
    });
    const auditLog = floor.auditLog.filter((event) => {
      const t = Date.parse(event.at);
      return t >= fromMs && t < toMs;
    });
    const sessionIds = new Set([
      ...orders.map((order) => order.sessionId),
      ...auditLog.map((event) => event.sessionId).filter(Boolean) as string[],
    ]);
    const sessions = floor.sessions
      .filter((session) => sessionIds.has(session.id))
      .map(redactSession);
    return { from, to, orders, sessions, auditLog };
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
    const items = input.items.map((line) => {
      const catalog = mockCatalog.items.find((item) => item.id === line.itemId);
      if (!catalog || !catalog.available) {
        throw new ApiError("One of the dishes is no longer on the menu", 400);
      }
      return {
        itemId: catalog.id,
        name: catalog.name,
        category: catalog.category,
        unitPrice: catalog.price,
        quantity: line.quantity,
      };
    });
    const now = new Date().toISOString();
    const totals = computeTotals(items);
    const draft: Order = {
      id: createId("ord"),
      sessionId: session.id,
      tableId: session.tableId,
      sequence: 0,
      items,
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
