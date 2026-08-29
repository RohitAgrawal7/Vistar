"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, orderService } from "@/lib/api";
import { CustomerOrderExperience } from "@/components/customer/customer-order-experience";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";

function qrScanHint() {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (/localhost|127\.0\.0\.1|^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./i.test(host)) {
    return "This link uses a local address. Phones cannot open localhost or your Wi‑Fi IP unless they are on the same network. Reprint QR with your live site URL (NEXT_PUBLIC_APP_URL).";
  }
  return null;
}

export function TableEntryGuard({ tableId }: { tableId: string }) {
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [qrHint] = useState(qrScanHint);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setBlocked(null);
    void orderService
      .getTableOccupancy(tableId)
      .then(() => {
        if (!cancelled) setChecking(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setChecking(false);
        if (err instanceof ApiError && err.status === 404) {
          setBlocked(
            `Table ${tableId} is not set up on this floor yet. Ask staff to add it in Admin → Table QR.`,
          );
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not reach the café. Check mobile data or Wi‑Fi, then try again.";
        setBlocked(message);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6">
        <Spinner label={`Opening Table ${tableId}…`} />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6 text-espresso">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-3xl italic">Cannot open this table</h1>
          <Alert message={blocked} />
          {qrHint ? <Alert tone="info" message={qrHint} /> : null}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={`/table/${tableId}`}
              className="inline-flex h-11 items-center rounded-full bg-terracotta px-5 text-sm font-medium text-cream"
            >
              Try again
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-espresso/15 px-4 text-sm"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CustomerOrderExperience tableId={tableId} />;
}
