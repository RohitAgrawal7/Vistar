"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExitSessionDialog({
  guestName,
  tableId,
  hasOrders,
  unpaid,
  busy,
  onCancel,
  onConfirm,
}: {
  guestName: string;
  tableId: string;
  hasOrders: boolean;
  unpaid: boolean;
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
        aria-labelledby="exit-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="sheet-panel w-full max-w-md overflow-y-auto rounded-[28px] border border-espresso/10 bg-cream p-5 shadow-[0_24px_60px_-28px_rgba(44,24,16,0.55)]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">Table {tableId}</p>
        <h2 id="exit-title" className="mt-1 font-display text-2xl italic text-espresso">
          Leave this table?
        </h2>
        <p className="mt-2 text-sm leading-6 text-espresso/70">
          {hasOrders
            ? unpaid
              ? `${guestName}, your orders stay with the café even if the bill is not paid. Staff see every ticket in history. This phone is signed out and Table ${tableId} opens for the next guest.`
              : `${guestName}, your paid visit stays on the counter history. This phone is signed out and Table ${tableId} is freed.`
            : `${guestName}, this ends your session. Table ${tableId} will be free for the next guest.`}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Stay
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void onConfirm()}
            loading={busy}
            icon={<LogOut className="size-4" aria-hidden />}
          >
            Exit session
          </Button>
        </div>
      </article>
    </div>
  );
}
