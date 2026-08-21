"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { FLOOR_META, type FloorTableId, buildTableScanUrl, tableMenuPath } from "@/lib/floor";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";

export function TableQrCard({
  tableId,
  origin,
  interactive = false,
  size = 168,
}: {
  tableId: FloorTableId;
  origin: string;
  interactive?: boolean;
  size?: number;
}) {
  const meta = FLOOR_META[tableId];
  const scanUrl = buildTableScanUrl(tableId, origin);
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-espresso/45">
        {appConfig.restaurantName}
      </p>
      <p className="mt-1 font-display text-3xl italic text-espresso">{meta.label}</p>
      <p className="text-xs uppercase tracking-[0.18em] text-espresso/50">{meta.zone}</p>
      <div className="mx-auto my-4 w-fit rounded-2xl bg-white p-3">
        <QRCodeSVG
          value={scanUrl}
          size={size}
          bgColor="#ffffff"
          fgColor="#1c120c"
          level="M"
          title={`QR code for ${meta.label}. Opens only this table.`}
        />
      </div>
      <p className="text-sm font-medium text-espresso">Scan to order</p>
      <p className="mt-1 text-[11px] leading-4 text-espresso/50">
        This code opens {meta.label} only
      </p>
    </>
  );

  const className = cn(
    "flex h-full flex-col items-center rounded-[28px] border border-espresso/10 bg-paper px-5 py-6 text-center shadow-[0_18px_40px_-28px_rgba(44,24,16,0.55)]",
    interactive &&
      "transition hover:-translate-y-0.5 hover:border-terracotta/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
  );

  if (interactive) {
    return (
      <Link href={tableMenuPath(tableId)} className={className} aria-label={`Open ${meta.label} menu`}>
        {inner}
      </Link>
    );
  }

  return <article className={className}>{inner}</article>;
}
