"use client";

import { AdminOrderCard } from "@/components/admin/admin-order-card";
import { EmptyState } from "@/components/ui/empty-state";
import { isActiveKitchen, isPayable } from "@/hooks/use-orders";
import type { Order, OrderStatus } from "@/lib/types";
import { Bell } from "lucide-react";

export function IncomingOrders({
  orders,
  onAdvance,
  busy,
}: {
  orders: Order[];
  onAdvance: (id: string, status: OrderStatus) => void;
  busy: boolean;
}) {
  const kitchen = orders.filter(isActiveKitchen);
  const ready = orders.filter(isPayable);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="incoming-heading">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="size-4 text-terracotta" aria-hidden />
          <h2 id="incoming-heading" className="font-display text-3xl italic text-espresso">
            Incoming
          </h2>
          <span className="rounded-full bg-terracotta/15 px-2 py-0.5 text-xs font-semibold text-terracotta-dark">
            {kitchen.length}
          </span>
        </div>
        {kitchen.length === 0 ? (
          <EmptyState
            title="Kitchen is clear"
            body="New guest tickets will land here with table numbers the moment they are submitted."
          />
        ) : (
          <div className="grid gap-4">
            {kitchen.map((order) => (
              <AdminOrderCard
                key={order.id}
                order={order}
                onAdvance={onAdvance}
                busy={busy}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="ready-heading">
        <h2 id="ready-heading" className="mb-4 font-display text-3xl italic text-espresso">
          Pending payment
        </h2>
        {ready.length === 0 ? (
          <EmptyState
            title="No open checks"
            body="Completed tickets wait here until staff tap Done on the table."
          />
        ) : (
          <div className="grid gap-4">
            {ready.map((order) => (
              <AdminOrderCard
                key={order.id}
                order={order}
                onAdvance={onAdvance}
                busy={busy}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
