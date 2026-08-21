"use client";

import { Plus, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderLineList } from "@/components/order-line-list";
import { formatCurrency } from "@/lib/format";
import { GUEST_STATUS_COPY } from "@/lib/status";
import type { DiningSession, Order, OutboxEntry, SessionTotals } from "@/lib/types";

export function SessionOrderTable({
  session,
  orders,
  sending,
  totals,
  onAddOrder,
  onViewBill,
  canAdd,
  canBill,
}: {
  session: DiningSession;
  orders: Order[];
  sending: OutboxEntry[];
  totals: SessionTotals;
  onAddOrder: () => void;
  onViewBill: () => void;
  canAdd: boolean;
  canBill: boolean;
}) {
  if (orders.length === 0 && sending.length === 0) return null;

  const sendingTotal = sending.reduce((sum, item) => sum + item.total, 0);

  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-gold/40 bg-gold-light/60 p-3 sm:rounded-[28px] sm:p-5"
      aria-labelledby="tickets-heading"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="tickets-heading" className="truncate font-display text-lg text-espresso sm:text-2xl">
            {session.guestName} · Table {session.tableId}
          </h2>
          <p className="text-sm text-espresso/70">
            {orders.length} placed
            {sending.length > 0 ? ` · ${sending.length} sending` : ""}
          </p>
        </div>
        <p className="shrink-0 text-base font-semibold tabular-nums text-espresso">
          {formatCurrency(totals.total)}
        </p>
      </div>

      <ul className="divide-y divide-espresso/8 overflow-hidden rounded-2xl bg-white/80">
        {orders.map((order) => (
          <li key={order.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs text-espresso/45">#{order.sequence}</p>
              <OrderLineList items={order.items} className="mt-0.5 font-medium" />
              {order.notes ? (
                <span className="mt-0.5 block text-xs text-espresso/50">{order.notes}</span>
              ) : null}
              <Badge className="mt-1" tone={GUEST_STATUS_COPY[order.status].tone}>
                {GUEST_STATUS_COPY[order.status].label}
              </Badge>
            </div>
            <p className="shrink-0 pt-0.5 text-sm tabular-nums text-espresso">
              {formatCurrency(order.total)}
            </p>
          </li>
        ))}
        {sending.map((item) => (
          <li key={item.localId} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <OrderLineList items={item.items} className="font-medium" />
              {item.notes ? (
                <span className="mt-0.5 block text-xs text-espresso/50">{item.notes}</span>
              ) : null}
              {item.failed && item.lastError ? (
                <span className="mt-0.5 block text-xs text-terracotta">{item.lastError}</span>
              ) : item.attemptCount > 0 ? (
                <span className="mt-0.5 block text-xs text-espresso/50">
                  Retrying the same ticket
                </span>
              ) : null}
              <Badge className="mt-1" tone="amber">
                {item.failed ? "Couldn’t send" : "Sending…"}
              </Badge>
            </div>
            <p className="shrink-0 pt-0.5 text-sm tabular-nums text-espresso">
              {formatCurrency(item.total)}
            </p>
          </li>
        ))}
        {sendingTotal > 0 ? (
          <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-espresso/60">
            <span>Sending (not in kitchen yet)</span>
            <span className="shrink-0 tabular-nums">{formatCurrency(sendingTotal)}</span>
          </li>
        ) : null}
        <li className="flex items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-espresso">
          <span>Placed total</span>
          <span className="shrink-0 tabular-nums">{formatCurrency(totals.total)}</span>
        </li>
      </ul>

      <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2">
        {canAdd ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onAddOrder}
            icon={<Plus className="size-4" aria-hidden />}
          >
            Add another order
          </Button>
        ) : null}
        {canBill ? (
          <Button
            type="button"
            className="w-full"
            onClick={onViewBill}
            icon={<Receipt className="size-4" aria-hidden />}
          >
            View final bill
          </Button>
        ) : null}
      </div>
    </section>
  );
}
