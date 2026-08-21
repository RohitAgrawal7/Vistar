"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { appConfig } from "@/lib/config";
import { parseTableInput } from "@/lib/tables";

export function TableEntry() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const tableId = parseTableInput(value);
    if (!tableId) {
      setError(`Enter a table number between ${appConfig.tableMin} and ${appConfig.tableMax}.`);
      return;
    }
    router.push(`/table/${tableId}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-labelledby="table-entry-heading">
      <div className="flex items-center gap-3 text-espresso/70">
        <QrCode className="size-5" aria-hidden />
        <p className="text-sm">Scan the table QR, or type the table number to preview the flow.</p>
      </div>
      <label className="block">
        <span id="table-entry-heading" className="mb-2 block text-sm font-medium text-espresso">
          Table number or QR payload
        </span>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="off"
          placeholder="12  ·  T-12  ·  vistar://table/12"
          className="h-14 w-full rounded-2xl border border-espresso/15 bg-white px-4 text-lg text-espresso shadow-inner outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "table-entry-error" : "table-entry-hint"}
        />
      </label>
      <p id="table-entry-hint" className="text-xs text-espresso/55">
        Tables {appConfig.tableMin}–{appConfig.tableMax} are open on this floor.
      </p>
      {error ? <Alert id="table-entry-error" message={error} /> : null}
      <Button type="submit" size="lg" className="min-h-12 w-full" icon={<ArrowRight className="size-4" aria-hidden />}>
        Open table menu
      </Button>
    </form>
  );
}
