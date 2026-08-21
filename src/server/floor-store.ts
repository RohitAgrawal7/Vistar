import { ApiError } from "@/server/http";
import { getSupabase, isSupabaseConfigured } from "@/server/supabase";
import type {
  AuditEvent,
  Order,
  OrderLine,
  ResumeGrant,
  StoredSession,
  StoredStaff,
} from "@/lib/types";

export interface FloorState {
  sessions: StoredSession[];
  orders: Order[];
  auditLog: AuditEvent[];
  resumeGrants: ResumeGrant[];
  staff: StoredStaff[];
}

const emptyFloor = (): FloorState => ({
  sessions: [],
  orders: [],
  auditLog: [],
  resumeGrants: [],
  staff: [],
});

let queue: Promise<unknown> = Promise.resolve();

function iso(value: string | null | undefined) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function stamp(value: string | undefined) {
  return value ?? null;
}

function throwIfError(error: { message: string; code?: string } | null, fallback: string) {
  if (!error) return;
  if (error.code === "23505") {
    throw new ApiError("This table is occupied. Please wait.", 409);
  }
  const blocked =
    error.code === "42501" ||
    error.code === "PGRST301" ||
    /row-level security|permission denied|rls/i.test(error.message);
  if (blocked) {
    throw new ApiError(
      "Supabase blocked this write. In the SQL editor, run supabase/schema.sql (includes policies).",
      403,
    );
  }
  throw new ApiError(error.message || fallback, 500);
}

function sessionFromRow(row: Record<string, unknown>): StoredSession {
  return {
    id: String(row.id),
    tableId: String(row.table_id),
    guestName: String(row.guest_name),
    token: String(row.token ?? ""),
    revokedToken: row.revoked_token ? String(row.revoked_token) : undefined,
    status: row.status as StoredSession["status"],
    createdAt: iso(String(row.created_at)) ?? new Date().toISOString(),
    updatedAt: iso(String(row.updated_at)) ?? new Date().toISOString(),
    lastActivityAt: iso(String(row.last_activity_at)) ?? new Date().toISOString(),
    billedAt: iso(row.billed_at as string | null),
    paidAt: iso(row.paid_at as string | null),
    closedAt: iso(row.closed_at as string | null),
    closeReason: (row.close_reason as StoredSession["closeReason"]) ?? undefined,
    abandonNote: row.abandon_note ? String(row.abandon_note) : undefined,
    tokenRevokedAt: iso(row.token_revoked_at as string | null),
    paymentMethod: (row.payment_method as StoredSession["paymentMethod"]) ?? undefined,
    rating: typeof row.rating === "number" ? row.rating : undefined,
    reviewNote: row.review_note ? String(row.review_note) : undefined,
    reviewedAt: iso(row.reviewed_at as string | null),
  };
}

function sessionToRow(session: StoredSession) {
  return {
    id: session.id,
    table_id: session.tableId,
    guest_name: session.guestName,
    token: session.token ?? "",
    revoked_token: session.revokedToken ?? null,
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    last_activity_at: session.lastActivityAt,
    billed_at: stamp(session.billedAt),
    paid_at: stamp(session.paidAt),
    closed_at: stamp(session.closedAt),
    close_reason: session.closeReason ?? null,
    abandon_note: session.abandonNote ?? null,
    token_revoked_at: stamp(session.tokenRevokedAt),
    payment_method: session.paymentMethod ?? null,
    rating: session.rating ?? null,
    review_note: session.reviewNote ?? null,
    reviewed_at: stamp(session.reviewedAt),
  };
}

function orderFromRow(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    tableId: String(row.table_id),
    sequence: Number(row.sequence),
    items: (row.items as OrderLine[]) ?? [],
    status: row.status as Order["status"],
    notes: String(row.notes ?? ""),
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    createdAt: iso(String(row.created_at)) ?? new Date().toISOString(),
    updatedAt: iso(String(row.updated_at)) ?? new Date().toISOString(),
    confirmedAt: iso(row.confirmed_at as string | null),
    readyAt: iso(row.ready_at as string | null),
    paidAt: iso(row.paid_at as string | null),
    paymentMethod: (row.payment_method as Order["paymentMethod"]) ?? undefined,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
    cancelledFrom: (row.cancelled_from as Order["cancelledFrom"]) ?? undefined,
    cancelledAt: iso(row.cancelled_at as string | null),
  };
}

function orderToRow(order: Order) {
  return {
    id: order.id,
    session_id: order.sessionId,
    table_id: order.tableId,
    sequence: order.sequence,
    items: order.items,
    status: order.status,
    notes: order.notes,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    confirmed_at: stamp(order.confirmedAt),
    ready_at: stamp(order.readyAt),
    paid_at: stamp(order.paidAt),
    payment_method: order.paymentMethod ?? null,
    idempotency_key: order.idempotencyKey ?? null,
    cancelled_from: order.cancelledFrom ?? null,
    cancelled_at: stamp(order.cancelledAt),
  };
}

function missing(prev: string[], next: string[]) {
  const keep = new Set(next);
  return prev.filter((id) => !keep.has(id));
}

async function load(): Promise<FloorState> {
  if (!isSupabaseConfigured()) {
    throw new ApiError(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_PUBLISHABLE_KEY) in Vercel env / .env.local",
      503,
    );
  }
  const db = getSupabase();
  const [sessions, orders, staff, grants, audit] = await Promise.all([
    db.from("dining_sessions").select("*").order("created_at", { ascending: false }),
    db.from("orders").select("*").order("created_at", { ascending: false }),
    db.from("staff_sessions").select("*").order("created_at", { ascending: false }),
    db.from("resume_grants").select("*").order("created_at", { ascending: false }),
    db.from("audit_events").select("*").order("at", { ascending: false }).limit(200),
  ]);
  throwIfError(sessions.error, "Could not load sessions");
  throwIfError(orders.error, "Could not load orders");
  throwIfError(staff.error, "Could not load staff");
  throwIfError(grants.error, "Could not load resume codes");
  throwIfError(audit.error, "Could not load audit log");
  return {
    sessions: (sessions.data ?? []).map((row) => sessionFromRow(row as Record<string, unknown>)),
    orders: (orders.data ?? []).map((row) => orderFromRow(row as Record<string, unknown>)),
    staff: (staff.data ?? []).map((row) => ({
      token: String((row as { token: string }).token),
      staffName: String((row as { staff_name: string }).staff_name),
      createdAt: iso(String((row as { created_at: string }).created_at)) ?? new Date().toISOString(),
    })),
    resumeGrants: (grants.data ?? []).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id),
        nonce: String(item.nonce),
        signature: String(item.signature),
        sessionId: String(item.session_id),
        tableId: String(item.table_id),
        expiresAt: Number(item.expires_at),
        createdAt: iso(String(item.created_at)) ?? new Date().toISOString(),
        usedAt: iso(item.used_at as string | null),
      };
    }),
    auditLog: (audit.data ?? []).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id),
        at: iso(String(item.at)) ?? new Date().toISOString(),
        action: item.action as AuditEvent["action"],
        staffName: String(item.staff_name),
        note: String(item.note ?? ""),
        tableId: item.table_id ? String(item.table_id) : undefined,
        sessionId: item.session_id ? String(item.session_id) : undefined,
        guestName: item.guest_name ? String(item.guest_name) : undefined,
      };
    }),
  };
}

async function save(prev: FloorState, next: FloorState) {
  const db = getSupabase();

  if (next.sessions.length) {
    const { error } = await db.from("dining_sessions").upsert(next.sessions.map(sessionToRow));
    throwIfError(error, "Could not save sessions");
  }
  const dropSessions = missing(
    prev.sessions.map((item) => item.id),
    next.sessions.map((item) => item.id),
  );
  if (dropSessions.length) {
    const { error } = await db.from("dining_sessions").delete().in("id", dropSessions);
    throwIfError(error, "Could not remove sessions");
  }

  if (next.orders.length) {
    const { error } = await db.from("orders").upsert(next.orders.map(orderToRow));
    throwIfError(error, "Could not save orders");
  }
  const dropOrders = missing(
    prev.orders.map((item) => item.id),
    next.orders.map((item) => item.id),
  );
  if (dropOrders.length) {
    const { error } = await db.from("orders").delete().in("id", dropOrders);
    throwIfError(error, "Could not remove orders");
  }

  if (next.staff.length) {
    const { error } = await db.from("staff_sessions").upsert(
      next.staff.map((item) => ({
        token: item.token,
        staff_name: item.staffName,
        created_at: item.createdAt,
      })),
    );
    throwIfError(error, "Could not save staff");
  }
  const dropStaff = missing(
    prev.staff.map((item) => item.token),
    next.staff.map((item) => item.token),
  );
  if (dropStaff.length) {
    const { error } = await db.from("staff_sessions").delete().in("token", dropStaff);
    throwIfError(error, "Could not remove staff");
  }

  if (next.resumeGrants.length) {
    const { error } = await db.from("resume_grants").upsert(
      next.resumeGrants.map((item) => ({
        id: item.id,
        nonce: item.nonce,
        signature: item.signature,
        session_id: item.sessionId,
        table_id: item.tableId,
        expires_at: item.expiresAt,
        created_at: item.createdAt,
        used_at: stamp(item.usedAt),
      })),
    );
    throwIfError(error, "Could not save resume codes");
  }
  const dropGrants = missing(
    prev.resumeGrants.map((item) => item.id),
    next.resumeGrants.map((item) => item.id),
  );
  if (dropGrants.length) {
    const { error } = await db.from("resume_grants").delete().in("id", dropGrants);
    throwIfError(error, "Could not remove resume codes");
  }

  if (next.auditLog.length) {
    const { error } = await db.from("audit_events").upsert(
      next.auditLog.map((item) => ({
        id: item.id,
        at: item.at,
        action: item.action,
        staff_name: item.staffName,
        note: item.note,
        table_id: item.tableId ?? null,
        session_id: item.sessionId ?? null,
        guest_name: item.guestName ?? null,
      })),
    );
    throwIfError(error, "Could not save audit log");
  }
  const dropAudit = missing(
    prev.auditLog.map((item) => item.id),
    next.auditLog.map((item) => item.id),
  );
  if (dropAudit.length) {
    const { error } = await db.from("audit_events").delete().in("id", dropAudit);
    throwIfError(error, "Could not trim audit log");
  }
}

export function withFloor<T>(run: (floor: FloorState) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const floor = await load();
    const snapshot = structuredClone(floor) as FloorState;
    const result = await run(floor);
    await save(snapshot, floor);
    return result;
  });
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function withFloorRead<T>(run: (floor: FloorState) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const floor = await load();
    return run(floor);
  });
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export { emptyFloor, isSupabaseConfigured };
