"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { computeSessionTotals, ordersForSession, sessionHasUnpaidOrders, sessionOutcomeLabel } from "@/lib/session";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { OrderLineList } from "@/components/order-line-list";
import { STATUS_COPY } from "@/lib/status";
import type { DiningSession, Order, SessionCloseReason } from "@/lib/types";

type HistoryFilter = "all" | SessionCloseReason;

export function OrderHistory({
  sessions,
  orders,
}: {
  sessions: DiningSession[];
  orders: Order[];
}) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const visible = useMemo(
    () =>
      sessions.filter((session) => (filter === "all" ? true : session.closeReason === filter)),
    [filter, sessions],
  );

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No closed sessions yet"
        body="Paid visits, guest exits, and Force clear all land here with every order still attached."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["paid", "Paid"],
            ["exited", "Guest exited"],
            ["abandoned", "Force clear"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={
              filter === id
                ? "inline-flex min-h-11 items-center rounded-full bg-espresso px-4 text-xs font-semibold uppercase tracking-wider text-cream"
                : "inline-flex min-h-11 items-center rounded-full border border-espresso/12 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-espresso/70"
            }
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState title="Nothing in this filter" body="Try All to see every closed visit." />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-espresso/8 bg-white">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Closed guest sessions with full order detail</caption>
            <thead className="border-b border-espresso/8 text-xs uppercase tracking-wider text-espresso/50">
              <tr>
                <th className="px-4 py-3 font-medium">Closed</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((session) => {
                const tickets = ordersForSession(orders, session.id);
                const totals = computeSessionTotals(tickets);
                const unpaid = sessionHasUnpaidOrders(tickets);
                return (
                  <tr key={session.id} className="border-b border-espresso/5 last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-espresso/70">
                      {formatDateTime(session.closedAt ?? session.updatedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">{session.tableId}</td>
                    <td className="px-4 py-3">{session.guestName}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-espresso">{sessionOutcomeLabel(session)}</span>
                      {unpaid ? (
                        <span className="mt-0.5 block text-xs font-semibold text-terracotta-dark">
                          Unpaid / pending
                        </span>
                      ) : null}
                      {session.abandonNote ? (
                        <span className="mt-0.5 block text-xs text-espresso/55">{session.abandonNote}</span>
                      ) : null}
                      {session.rating ? (
                        <span className="mt-0.5 block text-xs text-espresso/55">
                          Guest review: {session.rating}/5
                          {session.reviewNote ? ` · ${session.reviewNote}` : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {tickets.length === 0 ? (
                        <span className="text-espresso/50">No orders</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {tickets.map((order) => (
                            <li key={order.id} className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">#{order.sequence}</span>
                                <Badge tone={STATUS_COPY[order.status].tone}>
                                  {STATUS_COPY[order.status].label}
                                </Badge>
                                <span className="tabular-nums text-espresso/70">
                                  {formatCurrency(order.total)}
                                </span>
                              </div>
                              <OrderLineList items={order.items} />
                              {order.notes ? (
                                <span className="block text-xs text-amber-800">Note: {order.notes}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">{formatCurrency(totals.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
