"use client";

import { QRCodeSVG } from "qrcode.react";
import { appConfig } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { buildUpiPayUri } from "@/lib/upi";

export function UpiPayQr({
  amount,
  tableId,
  guestName,
}: {
  amount: number;
  tableId: string;
  guestName: string;
}) {
  const uri = buildUpiPayUri({ amount, tableId, guestName });

  return (
    <div className="rounded-3xl bg-white p-4 text-center text-espresso">
      <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">Scan to pay</p>
      <p className="mt-1 font-display text-2xl italic">{formatCurrency(amount)}</p>
      <div className="mx-auto my-3 w-[min(12.25rem,calc(100vw-5.5rem))] rounded-2xl border border-espresso/8 bg-white p-2">
        <QRCodeSVG
          value={uri}
          size={196}
          bgColor="#ffffff"
          fgColor="#1c120c"
          level="M"
          className="h-auto w-full"
          title={`UPI QR for Table ${tableId}`}
        />
      </div>
      <p className="break-all text-sm font-medium">{appConfig.upiVpa}</p>
      <p className="mt-1 text-xs leading-5 text-espresso/55">
        Scan with GPay, PhonePe, or Paytm. Staff tap Done when the payment is in — this phone
        then opens thank you.
      </p>
      <a
        href={uri}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-espresso px-4 text-sm font-medium text-cream sm:w-auto"
      >
        Open UPI app
      </a>
    </div>
  );
}
