"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatItemNames } from "@/lib/format";
import type { Order } from "@/lib/types";

export function RemoveOrderDialog({
  order,
  busy,
  onCancel,
  onConfirm,
}: {
  order: Order;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<unknown>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-espresso/40 p-4 sheet-overlay sm:place-items-center"
      role="presentation"
      onClick={onCancel}
    >
      <article
        role="dialog"
        aria-labelledby="remove-order-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="sheet-panel w-full max-w-md overflow-y-auto rounded-[28px] border border-espresso/10 bg-cream p-5 shadow-[0_24px_60px_-28px_rgba(44,24,16,0.55)]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">Staff only</p>
        <h2 id="remove-order-title" className="mt-1 font-display text-2xl italic text-espresso">
          Remove ticket #{order.sequence}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-espresso/70">
          {formatItemNames(order.items)} · {formatCurrency(order.total)}. The guest cannot
          delete orders. This ticket is marked Deleted on the kitchen board. You can Undo if this
          was a mistake.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-espresso/80">
          {order.items.map((line) => (
            <li key={line.itemId}>
              {line.quantity} × {line.name}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Keep ticket
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={busy}
            onClick={() => void onConfirm()}
            icon={<Trash2 className="size-4" aria-hidden />}
          >
            Delete order
          </Button>
        </div>
      </article>
    </div>
  );
}
