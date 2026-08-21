"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatItemNames, formatCurrency } from "@/lib/format";
import { STATUS_COPY } from "@/lib/status";
import { isPayable } from "@/hooks/use-orders";
import type { Order } from "@/lib/types";

export function TableTickets({
  orders,
  tableId,
  onAddOrder,
}: {
  orders: Order[];
  tableId: string;
  onAddOrder: () => void;
}) {
  const open = orders.filter((order) => order.status !== "paid" && order.status !== "cancelled");

  if (open.length === 0) return null;

  const awaiting = open.filter(isPayable);

  return (
    <section
      className="rounded-2xl border border-gold/40 bg-gold-light/60 p-4 sm:rounded-[28px] sm:p-5"
      aria-labelledby="tickets-heading"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="tickets-heading" className="font-display text-xl text-espresso sm:text-2xl">
            Sent to kitchen
          </h2>
          <p className="text-sm text-espresso/70">
            {awaiting.length > 0
              ? `${awaiting.length} ready to pay`
              : `${open.length} ticket${open.length === 1 ? "" : "s"} on the dashboard`}
          </p>
        </div>
        <Badge tone={awaiting.length > 0 ? "terracotta" : "amber"}>
          {awaiting.length > 0 ? `${awaiting.length} to pay` : "Live"}
        </Badge>
      </div>

      <ul className="flex flex-col gap-2">
        {open.map((order) => {
          const copy = STATUS_COPY[order.status];
          return (
            <li key={order.id}>
              <Link
                href={`/table/${tableId}/pay?order=${order.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-3 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-espresso">
                    {formatItemNames(order.items)}
                  </p>
                  <p className="text-xs text-espresso/55">{copy.label}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(order.total)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="secondary"
        className="mt-3 w-full"
        onClick={onAddOrder}
        icon={<Plus className="size-4" aria-hidden />}
      >
        Add another order
      </Button>
    </section>
  );
}
