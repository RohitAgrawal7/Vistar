"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, QrCode } from "lucide-react";
import { GuestEntryShell } from "@/components/brand/guest-entry-shell";
import { FloorQrGrid } from "@/components/tables/floor-qr-grid";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { FLOOR_META, FLOOR_TABLES } from "@/lib/floor";
import { parseTableInput } from "@/lib/tables";

export function HomeEntry() {
  const router = useRouter();
  const [tableInput, setTableInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function goToTable(event: FormEvent) {
    event.preventDefault();
    const tableId = parseTableInput(tableInput);
    if (!tableId) {
      setError(`Enter a table from ${appConfig.tableMin} to ${appConfig.tableMax}.`);
      return;
    }
    router.push(`/table/${tableId}`);
  }

  return (
    <GuestEntryShell
      entryKey="app"
      wide
      kicker={appConfig.tagline}
      title={appConfig.welcomeMessage}
      subtitle={appConfig.welcomeBody}
    >
      <div className="rounded-[28px] border border-white/15 bg-cream/95 p-4 text-espresso shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Your table</p>
        <h2 className="mt-2 font-display text-2xl italic sm:text-3xl">Scan or enter a table</h2>
        <p className="mt-2 text-sm leading-6 text-espresso/70">
          Table 1 opens Table 1 only. After that you will see the welcome screen and enter your name.
        </p>

        <form onSubmit={goToTable} className="mt-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Table number</span>
            <input
              value={tableInput}
              onChange={(event) => {
                setTableInput(event.target.value);
                setError(null);
              }}
              inputMode="numeric"
              placeholder="1"
              className="h-12 w-full rounded-2xl border border-espresso/15 bg-paper px-4 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
          {error ? <Alert className="mt-3" message={error} /> : null}
          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            icon={<ArrowRight className="size-4" aria-hidden />}
          >
            Continue to table
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {FLOOR_TABLES.map((tableId) => (
            <Link
              key={tableId}
              href={`/table/${tableId}`}
              className="inline-flex min-h-11 items-center rounded-full border border-espresso/12 bg-white px-3 text-sm font-medium text-espresso hover:border-terracotta/40"
            >
              {FLOOR_META[tableId].label}
            </Link>
          ))}
        </div>

        <div className="mt-6 hidden border-t border-espresso/8 pt-5 sm:block">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-espresso/45">
            <QrCode className="size-3.5" aria-hidden />
            Floor QR
          </p>
          <FloorQrGrid interactive />
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
          <Link
            href="/admin/tables"
            className="inline-flex min-h-11 items-center gap-2 text-terracotta underline-offset-4 hover:underline"
          >
            <QrCode className="size-4" aria-hidden />
            Print table QR cards
          </Link>
        </div>
      </div>
    </GuestEntryShell>
  );
}
