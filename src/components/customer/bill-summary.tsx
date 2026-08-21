"use client";

import { formatCurrency, formatItemNames } from "@/lib/format";
import { appConfig } from "@/lib/config";
import type { OrderLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Plus, Send } from "lucide-react";

export function BillSummary({
  lines,
  subtotal,
  tax,
  total,
  notes,
  onNotesChange,
  onSubmit,
  onAddMore,
  submitting,
  disabled,
  compactActions = false,
}: {
  lines: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  onAddMore: () => void;
  submitting: boolean;
  disabled: boolean;
  compactActions?: boolean;
}) {
  const headline = formatItemNames(lines);

  return (
    <aside
      className="flex flex-col gap-4 rounded-2xl border border-espresso/10 bg-white p-4 shadow-[0_20px_50px_-32px_rgba(44,24,16,0.55)] sm:gap-5 sm:rounded-[28px] sm:p-5 lg:sticky lg:top-24"
      aria-labelledby="bill-heading"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Live bill</p>
        <h2 id="bill-heading" className="mt-1 font-display text-2xl text-espresso">
          Your order
        </h2>
        <p className="mt-2 text-sm font-medium text-terracotta" aria-live="polite">
          {headline}
        </p>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm leading-6 text-espresso/60">
          Tap Add on a dish. Submit sends this ticket to the café counter with your table number.
        </p>
      ) : (
        <ul className="flex max-h-36 flex-col gap-3 overflow-y-auto sm:max-h-none" aria-label="Selected items">
          {lines.map((line) => (
            <li key={line.itemId} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-medium text-espresso">{line.name}</span>
                <span className="block text-espresso/50">× {line.quantity}</span>
              </span>
              <span className="tabular-nums text-espresso">
                {formatCurrency(line.unitPrice * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="space-y-2 border-t border-espresso/10 pt-4 text-sm">
        <div className="flex justify-between text-espresso/70">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-espresso/70">
          <dt>{appConfig.taxLabel}</dt>
          <dd className="tabular-nums">{formatCurrency(tax)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-espresso">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCurrency(total)}</dd>
        </div>
      </dl>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-espresso/55">
          Kitchen notes
        </span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={2}
          placeholder="No onions, extra hot, allergy notes…"
          className="w-full resize-none rounded-2xl border border-espresso/10 bg-paper px-3 py-2 text-sm outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        />
      </label>

      {compactActions ? null : (
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onAddMore}
          icon={<Plus className="size-4" aria-hidden />}
        >
          Add
        </Button>
        <Button
          type="button"
          size="lg"
          className="w-full sm:col-start-2"
          onClick={onSubmit}
          disabled={disabled}
          loading={submitting}
          icon={<Send className="size-4" aria-hidden />}
        >
          Submit order
        </Button>
      </div>
      )}
    </aside>
  );
}
