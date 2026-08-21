"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SessionBoard } from "@/components/admin/session-board";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { OrderHistory } from "@/components/admin/order-history";
import { AuditLog } from "@/components/admin/audit-log";
import { AdminOrderCard } from "@/components/admin/admin-order-card";
import { Alert } from "@/components/ui/alert";
import { useAnalytics } from "@/hooks/use-analytics";
import { isActiveKitchen, useOrders } from "@/hooks/use-orders";

export function AdminDashboard() {
  const {
    orders,
    sessions,
    activeSessions,
    closedSessions,
    auditLog,
    advanceStatus,
    closeSession,
    abandonSession,
    createResumeCode,
    mutating,
    error,
  } = useOrders();
  const analytics = useAnalytics();

  const leftoverKitchen = useMemo(
    () =>
      orders.filter((order) => {
        const session = sessions.find((item) => item.id === order.sessionId);
        if (!session || session.status !== "closed") return false;
        if (session.closeReason !== "exited" && session.closeReason !== "abandoned") return false;
        return isActiveKitchen(order) || order.status === "cancelled";
      }),
    [orders, sessions],
  );

  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 pb-safe sm:gap-10 sm:px-6 sm:py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-espresso/50">Café floor</p>
          <h1 className="mt-1 font-display text-3xl italic text-espresso sm:text-5xl">
            Counter dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/70">
            Live tables stay here. If a guest taps Exit, the table frees immediately — their orders, unpaid bills, and
            kitchen status remain in history. Unfinished tickets still appear below so the café can cook them.
          </p>
          <Link
            href="/admin/tables"
            className="mt-3 inline-flex text-sm font-medium text-terracotta underline-offset-4 hover:underline"
          >
            Print Table 1–5 QR cards
          </Link>
        </div>
        {error ? <Alert message={error} /> : null}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <SessionBoard
            sessions={activeSessions}
            orders={orders}
            onAdvance={advanceStatus}
            onClose={closeSession}
            onAbandon={abandonSession}
            onResume={createResumeCode}
            busy={mutating}
          />
          <AnalyticsPanel analytics={analytics} />
        </div>
        {leftoverKitchen.length > 0 ? (
          <section aria-labelledby="leftover-heading">
            <h2 id="leftover-heading" className="mb-4 font-display text-3xl italic text-espresso">
              Guest left — still in kitchen
            </h2>
            <p className="mb-4 text-sm text-espresso/70">
              These tickets were placed before the guest exited or staff force-cleared. Confirm and Ready still work.
              Deleted tickets stay on this list so you can Undo.
            </p>
            <div className="grid gap-4">
              {leftoverKitchen.map((order) => (
                <AdminOrderCard
                  key={order.id}
                  order={order}
                  onAdvance={advanceStatus}
                  busy={mutating}
                />
              ))}
            </div>
          </section>
        ) : null}
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 font-display text-3xl italic text-espresso">
            History
          </h2>
          <OrderHistory sessions={closedSessions} orders={orders} />
        </section>
        <section aria-labelledby="audit-heading">
          <h2 id="audit-heading" className="mb-4 font-display text-3xl italic text-espresso">
            Audit log
          </h2>
          <AuditLog events={auditLog} />
        </section>
      </main>
    </div>
  );
}
