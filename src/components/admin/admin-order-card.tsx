"use client";

import { useState } from "react";
import { formatCurrency, formatTime } from "@/lib/format";
import { STATUS_COPY } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { RemoveOrderDialog } from "@/components/admin/remove-order-dialog";
import type { Order, OrderStatus } from "@/lib/types";
import { Check, ChefHat, Trash2, Undo2 } from "lucide-react";

export function AdminOrderCard({
  order,
  onAdvance,
  busy,
}: {
  order: Order;
  onAdvance: (id: string, status: OrderStatus) => void;
  busy: boolean;
}) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const next =
    order.status === "pending"
      ? { status: "confirmed" as const, label: "Confirm order" }
      : order.status === "confirmed"
        ? { status: "ready" as const, label: "Mark ready / complete" }
        : null;

  return (
    <Card
      className={cn(
        "p-4 sm:p-5",
        order.status === "pending" && "ring-2 ring-terracotta/35",
        order.status === "cancelled" && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-espresso/50">
            {order.status === "pending" ? (
              <span className="size-2 animate-pulse rounded-full bg-terracotta" aria-hidden />
            ) : null}
            Table {order.tableId}
          </p>
          <h3 className={cn("mt-1 font-display text-xl text-espresso sm:text-2xl", order.status === "cancelled" && "line-through")}>
            Ticket #{order.sequence}
          </h3>
          {order.status === "cancelled" ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-espresso/50">Deleted</p>
          ) : null}
          <p className="text-xs text-espresso/55">
            {formatTime(order.createdAt)} · {order.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <Badge tone={STATUS_COPY[order.status].tone}>{STATUS_COPY[order.status].label}</Badge>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {order.items.map((line) => (
          <li key={line.itemId} className="flex justify-between gap-3 text-espresso/80">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span className="tabular-nums">{formatCurrency(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
      </ul>

      {order.notes ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Guest note: {order.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-espresso/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-semibold tabular-nums">{formatCurrency(order.total)}</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {order.status === "cancelled" ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full min-h-11 sm:w-auto"
            onClick={() => onAdvance(order.id, order.cancelledFrom ?? "pending")}
            loading={busy}
            icon={<Undo2 className="size-4" aria-hidden />}
          >
            Undo delete
          </Button>
        ) : next ? (
          <Button
            type="button"
            size="sm"
            className="w-full min-h-11 sm:w-auto"
            onClick={() => onAdvance(order.id, next.status)}
            loading={busy}
            icon={
              next.status === "confirmed" ? (
                <ChefHat className="size-4" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )
            }
          >
            {next.label}
          </Button>
        ) : (
          <p className="text-xs text-espresso/55">Waiting for staff to tap Done</p>
        )}
        {order.status !== "paid" && order.status !== "cancelled" ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="w-full min-h-11 sm:w-auto"
            onClick={() => setRemoveOpen(true)}
            disabled={busy}
            icon={<Trash2 className="size-3.5" aria-hidden />}
          >
            Delete
          </Button>
        ) : null}
        </div>
      </div>
      {removeOpen ? (
        <RemoveOrderDialog
          order={order}
          busy={busy}
          onCancel={() => setRemoveOpen(false)}
          onConfirm={async () => {
            await onAdvance(order.id, "cancelled");
            setRemoveOpen(false);
          }}
        />
      ) : null}
    </Card>
  );
}
