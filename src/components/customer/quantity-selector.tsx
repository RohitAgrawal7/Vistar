"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantitySelector({
  value,
  onChange,
  labelledBy,
  name,
}: {
  value: number;
  onChange: (next: number) => void;
  labelledBy?: string;
  name: string;
}) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-espresso/10 bg-paper p-0.5"
      role="group"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className={cn(
          "grid size-11 place-items-center rounded-full text-espresso transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
          value === 0 && "opacity-40",
        )}
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        aria-label={`Decrease ${name}`}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full text-espresso transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        onClick={() => onChange(value + 1)}
        disabled={value >= 99}
        aria-label={`Increase ${name}`}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
