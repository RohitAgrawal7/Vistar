"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloorQrGrid } from "@/components/tables/floor-qr-grid";
import { useAppOrigin } from "@/hooks/use-app-origin";
import { FLOOR_TABLES, buildTableScanUrl, FLOOR_META } from "@/lib/floor";

export function QrPrintStudio() {
  const { origin, isLocalhost, ready } = useAppOrigin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-espresso/50">Floor QR</p>
          <h1 className="mt-1 font-display text-3xl italic text-espresso sm:text-5xl">
            Five table codes
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-espresso/70">
            Print these tent cards and place one on each table. Scanning Table 1 opens only Table 1. Same for 2–5.
          </p>
        </div>
        <Button
          type="button"
          variant="dark"
          className="w-full sm:w-auto"
          onClick={() => window.print()}
          icon={<Printer className="size-4" aria-hidden />}
        >
          Print QR cards
        </Button>
      </div>

      {ready && isLocalhost ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 print:hidden">
          Phone cameras cannot reach <span className="font-medium">localhost</span>. Open this page on your
          computer’s LAN address (for example <span className="font-medium">http://192.168.x.x:3000</span>)
          or set <span className="font-medium">NEXT_PUBLIC_APP_URL</span>, then print. Tapping a card still
          works on this device.
        </p>
      ) : null}

      <FloorQrGrid />

      {ready ? (
        <ul className="print:hidden space-y-2 rounded-[24px] border border-espresso/8 bg-white p-4 text-sm">
          {FLOOR_TABLES.map((id) => (
            <li key={id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-espresso">{FLOOR_META[id].label}</span>
              <code className="break-all text-xs text-espresso/60">{buildTableScanUrl(id, origin)}</code>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
