"use client";

import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export function ViewBillDialog({
  guestName,
  tableId,
  total,
  onStay,
  onOpenBill,
}: {
  guestName: string;
  tableId: string;
  total: number;
  onStay: () => void;
  onOpenBill: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-espresso/40 p-4 sheet-overlay sm:place-items-center"
      role="presentation"
      onClick={onStay}
    >
      <article
        role="dialog"
        aria-labelledby="view-bill-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="sheet-panel w-full max-w-md overflow-y-auto rounded-[28px] border border-espresso/10 bg-cream p-5 shadow-[0_24px_60px_-28px_rgba(44,24,16,0.55)]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">Table {tableId}</p>
        <h2 id="view-bill-title" className="mt-1 font-display text-2xl italic text-espresso">
          Open the final bill?
        </h2>
        <p className="mt-2 text-sm leading-6 text-espresso/70">
          {guestName}, this does not exit the table. Stay to add more dishes, or open the bill to
          show the UPI QR for {formatCurrency(total)}. Staff tap Done when they have the money —
          then this phone opens thank you.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onStay}>
            Stay and add more
          </Button>
          <Button
            type="button"
            onClick={onOpenBill}
            icon={<Receipt className="size-4" aria-hidden />}
          >
            Open final bill
          </Button>
        </div>
      </article>
    </div>
  );
}
