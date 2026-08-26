import { getSupabase, isSupabaseConfigured } from "@/server/supabase";

/** Customer session/order/audit retention window (default 60 days). */
export const RETENTION_DAYS = Math.max(
  1,
  Number.parseInt(process.env.DATA_RETENTION_DAYS?.trim() || "60", 10) || 60,
);

let lastRunAt = 0;
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000; // at most twice a day

export type RetentionResult = {
  ran: boolean;
  retentionDays: number;
  sessionsDeleted: number;
  ordersDeleted: number;
  auditDeleted: number;
  resumeDeleted: number;
  via?: "rpc" | "client";
  error?: string;
};

function cutoffIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function purgeViaClient(retentionDays: number): Promise<RetentionResult> {
  const cutoff = cutoffIso(retentionDays);
  const db = getSupabase();
  const empty: RetentionResult = {
    ran: true,
    retentionDays,
    sessionsDeleted: 0,
    ordersDeleted: 0,
    auditDeleted: 0,
    resumeDeleted: 0,
    via: "client",
  };

  const { data: withClosedAt, error: e1 } = await db
    .from("dining_sessions")
    .select("id")
    .eq("status", "closed")
    .not("closed_at", "is", null)
    .lt("closed_at", cutoff);
  if (e1) return { ...empty, error: e1.message };

  const { data: withoutClosedAt, error: e2 } = await db
    .from("dining_sessions")
    .select("id")
    .eq("status", "closed")
    .is("closed_at", null)
    .lt("updated_at", cutoff);
  if (e2) return { ...empty, error: e2.message };

  const sessionIds = [
    ...new Set([
      ...(withClosedAt ?? []).map((row) => String(row.id)),
      ...(withoutClosedAt ?? []).map((row) => String(row.id)),
    ]),
  ];

  let ordersDeleted = 0;
  if (sessionIds.length) {
    const { data: droppedOrders, error: orderError } = await db
      .from("orders")
      .delete()
      .in("session_id", sessionIds)
      .select("id");
    if (orderError) return { ...empty, error: orderError.message };
    ordersDeleted = droppedOrders?.length ?? 0;

    const { error: sessionError } = await db.from("dining_sessions").delete().in("id", sessionIds);
    if (sessionError) {
      return { ...empty, ordersDeleted, error: sessionError.message };
    }
  }

  const { data: droppedAudit, error: auditError } = await db
    .from("audit_events")
    .delete()
    .lt("at", cutoff)
    .select("id");
  if (auditError) {
    return {
      ...empty,
      sessionsDeleted: sessionIds.length,
      ordersDeleted,
      error: auditError.message,
    };
  }

  const { data: droppedResume, error: resumeError } = await db
    .from("resume_grants")
    .delete()
    .lt("created_at", cutoff)
    .select("id");
  if (resumeError) {
    return {
      ...empty,
      sessionsDeleted: sessionIds.length,
      ordersDeleted,
      auditDeleted: droppedAudit?.length ?? 0,
      error: resumeError.message,
    };
  }

  return {
    ran: true,
    retentionDays,
    sessionsDeleted: sessionIds.length,
    ordersDeleted,
    auditDeleted: droppedAudit?.length ?? 0,
    resumeDeleted: droppedResume?.length ?? 0,
    via: "client",
  };
}

/**
 * Deletes closed customer visits older than retentionDays.
 * Menu catalog is never touched. Active/open tables are never deleted.
 */
export async function runRetentionCleanup(
  retentionDays = RETENTION_DAYS,
  options?: { force?: boolean },
): Promise<RetentionResult> {
  const idle: RetentionResult = {
    ran: false,
    retentionDays,
    sessionsDeleted: 0,
    ordersDeleted: 0,
    auditDeleted: 0,
    resumeDeleted: 0,
  };

  if (!isSupabaseConfigured()) return idle;
  if (!options?.force && Date.now() - lastRunAt < MIN_INTERVAL_MS) return idle;
  lastRunAt = Date.now();

  try {
    const db = getSupabase();
    const { data, error } = await db.rpc("vistar_purge_old_customer_data", {
      retention_days: retentionDays,
    });
    if (!error && data && typeof data === "object") {
      const row = data as Record<string, unknown>;
      return {
        ran: true,
        retentionDays,
        sessionsDeleted: Number(row.sessions_deleted ?? 0),
        ordersDeleted: Number(row.orders_deleted ?? 0),
        auditDeleted: Number(row.audit_deleted ?? 0),
        resumeDeleted: Number(row.resume_deleted ?? 0),
        via: "rpc",
      };
    }
    // Function not installed yet — fall back to client deletes.
    return await purgeViaClient(retentionDays);
  } catch (err) {
    try {
      return await purgeViaClient(retentionDays);
    } catch (fallbackErr) {
      return {
        ...idle,
        ran: true,
        error:
          fallbackErr instanceof Error
            ? fallbackErr.message
            : err instanceof Error
              ? err.message
              : "Retention cleanup failed",
      };
    }
  }
}

/** Fire-and-forget throttle for admin floor / health traffic. */
export function scheduleRetentionCleanup() {
  void runRetentionCleanup().catch(() => {
    /* non-fatal */
  });
}
