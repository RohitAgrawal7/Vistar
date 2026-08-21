"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/types";

const STEPS: { id: OrderStatus; label: string; hint: string }[] = [
  { id: "pending", label: "Submitted", hint: "Kitchen has the ticket" },
  { id: "confirmed", label: "Confirmed", hint: "Cooking now" },
  { id: "ready", label: "Ready", hint: "Review the bill and pay" },
  { id: "paid", label: "Paid", hint: "Thank you" },
];

function stepIndex(status: OrderStatus) {
  if (status === "awaiting_payment") return 2;
  if (status === "cancelled") return -1;
  return STEPS.findIndex((step) => step.id === status);
}

export function OrderStatusTracker({ status }: { status: OrderStatus }) {
  const current = stepIndex(status);

  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" aria-label="Order status">
      {STEPS.map((step, index) => {
        const complete = current > index || (status === "paid" && index <= 3);
        const active = current === index || (status === "awaiting_payment" && index === 2);
        return (
          <li
            key={step.id}
            className={cn(
              "rounded-2xl border px-3 py-3",
              active && "border-terracotta bg-terracotta/10",
              complete && !active && "border-sage/30 bg-sage/10",
              !complete && !active && "border-espresso/10 bg-white/40",
            )}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-espresso">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11px]",
                  active && "bg-terracotta text-white",
                  complete && !active && "bg-sage text-white",
                  !complete && !active && "bg-espresso/10 text-espresso/60",
                )}
              >
                {complete && !active ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              {step.label}
            </p>
            <p className="mt-1 hidden pl-8 text-xs text-espresso/60 sm:block">{step.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
