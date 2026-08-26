"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantitySelector({
  value,
  onChange,
  labelledBy,
  name,
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  labelledBy?: string;
  name: string;
  compact?: boolean;
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
          "grid place-items-center rounded-full text-espresso transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
          compact ? "size-8" : "size-11",
          value === 0 && "opacity-40",
        )}
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        aria-label={`Decrease ${name}`}
      >
        <Minus className={compact ? "size-3.5" : "size-4"} aria-hidden />
      </button>
      <span
        className={cn(
          "text-center font-semibold tabular-nums",
          compact ? "min-w-6 text-xs" : "min-w-8 text-sm",
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={cn(
          "grid place-items-center rounded-full text-espresso transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
          compact ? "size-8" : "size-11",
        )}
        onClick={() => onChange(value + 1)}
        disabled={value >= 99}
        aria-label={`Increase ${name}`}
      >
        <Plus className={compact ? "size-3.5" : "size-4"} aria-hidden />
      </button>
    </div>
  );
}
