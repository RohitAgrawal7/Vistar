"use client";

import { useEffect, useState } from "react";
import { Printer, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useAppOrigin } from "@/hooks/use-app-origin";
import { buildResumeScanUrl, RESUME_TTL_MS } from "@/lib/resume";
import type { ResumeTicket } from "@/lib/types";

export function ResumeDialog({
  ticket,
  onClose,
}: {
  ticket: ResumeTicket;
  onClose: () => void;
}) {
  const { origin, isLocalhost } = useAppOrigin();
  const [remaining, setRemaining] = useState(() => ticket.expiresAt - Date.now());
  const scanUrl = origin ? buildResumeScanUrl(ticket.code, origin) : "";
  const expired = remaining <= 0;

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(ticket.expiresAt - Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticket.expiresAt]);

  const minutes = Math.max(0, Math.floor(remaining / 60000));
  const seconds = Math.max(0, Math.floor((remaining % 60000) / 1000));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-espresso/40 p-4 sheet-overlay sm:place-items-center print:bg-white print:p-0"
      role="presentation"
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-labelledby="resume-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="sheet-panel w-full max-w-md overflow-y-auto rounded-[28px] border border-espresso/10 bg-cream p-5 text-center shadow-[0_24px_60px_-28px_rgba(44,24,16,0.55)] print:border-0 print:shadow-none"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">
          Resume · Table {ticket.tableId}
        </p>
        <h2 id="resume-title" className="mt-1 font-display text-2xl italic text-espresso">
          New device for {ticket.guestName}
        </h2>
        <p className="mt-2 text-sm leading-6 text-espresso/70">
          Show this QR at the counter. It works once, for {RESUME_TTL_MS / 60000} minutes. Scanning
          revokes the dead phone’s session.
        </p>
        {expired ? (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
            This code expired. Close and tap Resume on new device again.
          </p>
        ) : scanUrl ? (
          <div className="mx-auto my-4 w-[min(12.5rem,calc(100vw-5.5rem))] rounded-2xl bg-white p-3">
            <QRCodeSVG
              value={scanUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#1c120c"
              level="M"
              className="h-auto w-full"
              title={`Resume QR for Table ${ticket.tableId}`}
            />
          </div>
        ) : (
          <p className="mt-6 text-sm text-espresso/60">Preparing QR…</p>
        )}
        <p className="font-display text-3xl tabular-nums text-espresso">
          {minutes}:{String(seconds).padStart(2, "0")}
        </p>
        <p className="mt-1 text-xs text-espresso/50">Single use · signed resume code</p>
        {isLocalhost ? (
          <p className="mt-3 text-xs text-amber-800">
            Phone cameras cannot read localhost. Open this dashboard on your LAN IP before showing the QR.
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center print:hidden">
          <Button type="button" variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" aria-hidden />}>
            Print slip
          </Button>
          <Button type="button" onClick={onClose} icon={<Smartphone className="size-4" aria-hidden />}>
            Done
          </Button>
        </div>
      </article>
    </div>
  );
}
