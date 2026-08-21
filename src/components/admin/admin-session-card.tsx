"use client";

import { useState } from "react";
import { Check, ChefHat, Smartphone, TriangleAlert, Trash2, Undo2 } from "lucide-react";
import { AbandonDialog } from "@/components/admin/abandon-dialog";
import { ResumeDialog } from "@/components/admin/resume-dialog";
import { RemoveOrderDialog } from "@/components/admin/remove-order-dialog";
import { OrderLineList } from "@/components/order-line-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { appConfig } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { computeSessionTotals, idleMinutes, isSessionStale, ordersForSession, staffOrdersForSession } from "@/lib/session";
import { SESSION_COPY, STATUS_COPY } from "@/lib/status";
import type { DiningSession, Order, OrderStatus, ResumeTicket } from "@/lib/types";

export function AdminSessionCard({
  session,
  orders,
  onAdvance,
  onClose,
  onAbandon,
  onResume,
  busy,
  now,
}: {
  session: DiningSession;
  orders: Order[];
  onAdvance: (id: string, status: OrderStatus) => void;
  onClose: (sessionId: string) => void;
  onAbandon: (sessionId: string, note: string) => void | Promise<unknown>;
  onResume: (sessionId: string) => Promise<ResumeTicket>;
  busy: boolean;
  now: number;
}) {
  const tickets = staffOrdersForSession(orders, session.id);
  const liveTickets = ordersForSession(orders, session.id);
  const totals = computeSessionTotals(liveTickets);
  const copy = SESSION_COPY[session.status];
  const stale = isSessionStale(session, now);
  const idle = idleMinutes(session, now);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [resumeTicket, setResumeTicket] = useState<ResumeTicket | null>(null);
  const [removeOrder, setRemoveOrder] = useState<Order | null>(null);

  return (
    <Card
      className={cn(
        "p-4 sm:p-5",
        stale && "ring-2 ring-amber-500",
        !stale && session.status === "open" && liveTickets.some((order) => order.status === "pending") && "ring-2 ring-terracotta/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-espresso/50">
            {session.status === "open" ? (
              <span className="size-2 animate-pulse rounded-full bg-terracotta" aria-hidden />
            ) : null}
            Table {session.tableId}
          </p>
          <h3 className="mt-1 font-display text-xl text-espresso sm:text-2xl">{session.guestName}</h3>
          <p className="text-xs text-espresso/55">
            {liveTickets.length} order{liveTickets.length === 1 ? "" : "s"} · live session
            {idle > 0 ? ` · idle ${idle}m` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={copy.tone}>{copy.label}</Badge>
          {stale ? (
            <Badge tone="amber">
              <TriangleAlert className="size-3" aria-hidden />
              Stale · {appConfig.sessionIdleMinutes}m+
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-espresso/45">
            <tr>
              <th className="pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Order</th>
              <th className="pb-2 font-medium">Kitchen</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((order) => {
              const next =
                order.status === "pending"
                  ? { status: "confirmed" as const, label: "Confirm" }
                  : order.status === "confirmed"
                    ? { status: "ready" as const, label: "Ready" }
                    : null;
              return (
                <tr
                  key={order.id}
                  className={cn(
                    "border-t border-espresso/8",
                    order.status === "cancelled" && "bg-espresso/[0.03] text-espresso/55",
                  )}
                >
                  <td className="py-2.5 pr-2 font-semibold">{order.sequence}</td>
                  <td className="py-2.5 pr-2">
                    <div className={cn(order.status === "cancelled" && "line-through")}>
                      <OrderLineList items={order.items} />
                    </div>
                    {order.status === "cancelled" ? (
                      <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wider text-espresso/50">
                        Deleted
                      </span>
                    ) : null}
                    {order.notes && order.status !== "cancelled" ? (
                      <span className="mt-0.5 block text-xs text-amber-800">Note: {order.notes}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Badge tone={STATUS_COPY[order.status].tone}>{STATUS_COPY[order.status].label}</Badge>
                      {order.status === "cancelled" && session.status !== "paid" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onAdvance(order.id, order.cancelledFrom ?? "pending")}
                          loading={busy}
                          icon={<Undo2 className="size-3.5" aria-hidden />}
                        >
                          Undo
                        </Button>
                      ) : null}
                      {next && session.status !== "closed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onAdvance(order.id, next.status)}
                          loading={busy}
                          icon={
                            next.status === "confirmed" ? (
                              <ChefHat className="size-3.5" aria-hidden />
                            ) : (
                              <Check className="size-3.5" aria-hidden />
                            )
                          }
                        >
                          {next.label}
                        </Button>
                      ) : null}
                      {order.status !== "paid" && order.status !== "cancelled" && session.status !== "paid" && session.status !== "billing" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => setRemoveOrder(order)}
                          disabled={busy}
                          icon={<Trash2 className="size-3.5" aria-hidden />}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  <td className={cn("py-2.5 text-right tabular-nums", order.status === "cancelled" && "line-through")}>
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {stale ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          No guest or kitchen activity for {idle} minutes. The table may be abandoned — Force clear
          frees it without payment.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-espresso/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold">
            Session total{" "}
            <span className="tabular-nums text-terracotta">{formatCurrency(totals.total)}</span>
          </p>
          {session.status === "billing" ? (
            <p className="mt-1 text-xs text-espresso/55">
              Guest is on the bill. Tap Done when you have the payment — their phone opens thank you.
            </p>
          ) : session.status === "open" ? (
            <p className="mt-1 text-xs text-espresso/55">Guest can still add orders. Total updates live.</p>
          ) : session.status === "paid" ? (
            <p className="mt-1 text-xs text-espresso/55">Payment is in. Done sends thank you to their phone and frees the table.</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {liveTickets.length > 0 ? (
            <Button
              type="button"
              className="w-full min-h-11 sm:w-auto"
              onClick={() => onClose(session.id)}
              loading={busy}
              icon={<Check className="size-4" aria-hidden />}
            >
              Done — payment received
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full min-h-11 sm:w-auto"
            onClick={async () => {
              try {
                const ticket = await onResume(session.id);
                setResumeTicket(ticket);
              } catch {
                /* error on dashboard */
              }
            }}
            loading={busy}
            icon={<Smartphone className="size-3.5" aria-hidden />}
          >
            Resume on new device
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full min-h-11 sm:w-auto"
            onClick={() => setAbandonOpen(true)}
            loading={busy}
          >
            Force clear
          </Button>
        </div>
      </div>
      {abandonOpen ? (
        <AbandonDialog
          session={session}
          busy={busy}
          onCancel={() => setAbandonOpen(false)}
          onConfirm={async (note) => {
            await onAbandon(session.id, note);
            setAbandonOpen(false);
          }}
        />
      ) : null}
      {removeOrder ? (
        <RemoveOrderDialog
          order={removeOrder}
          busy={busy}
          onCancel={() => setRemoveOrder(null)}
          onConfirm={async () => {
            await onAdvance(removeOrder.id, "cancelled");
            setRemoveOrder(null);
          }}
        />
      ) : null}
      {resumeTicket ? (
        <ResumeDialog ticket={resumeTicket} onClose={() => setResumeTicket(null)} />
      ) : null}
    </Card>
  );
}
