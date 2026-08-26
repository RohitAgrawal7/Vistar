"use client";

import { useState } from "react";
import { formatCategoryHeadline, formatCurrency, formatItemNames } from "@/lib/format";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/menu";
import type { OrderLine } from "@/lib/types";

export function OrderItemsDialog({
  title,
  items,
  notes,
  onClose,
}: {
  title?: string;
  items: OrderLine[];
  notes?: string;
  onClose: () => void;
}) {
  const groups = (() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const category of CATEGORY_ORDER) {
      if (items.some((item) => item.category === category)) {
        ordered.push(category);
        seen.add(category);
      }
    }
    for (const item of items) {
      if (!seen.has(item.category)) {
        ordered.push(item.category);
        seen.add(item.category);
      }
    }
    return ordered.map((category) => ({
      category,
      lines: items.filter((item) => item.category === category),
    }));
  })();

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-espresso/40 p-4 sheet-overlay sm:place-items-center"
      role="presentation"
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-labelledby="order-items-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="sheet-panel w-full max-w-md overflow-y-auto rounded-[28px] border border-espresso/10 bg-cream p-5 shadow-[0_24px_60px_-28px_rgba(44,24,16,0.55)]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">Dishes in this ticket</p>
        <h2 id="order-items-title" className="mt-1 font-display text-2xl italic text-espresso">
          {title ?? formatCategoryHeadline(items)}
        </h2>
        <p className="mt-1 text-sm text-espresso/65">
          This is the exact dish — not only the category count.
        </p>

        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <section key={group.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-espresso/50">
                {CATEGORY_META[group.category]?.label ?? group.category}
              </h3>
              <ul className="mt-2 space-y-2">
                {group.lines.map((line) => (
                  <li
                    key={line.itemId}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 text-sm"
                  >
                    <span>
                      <span className="font-medium text-espresso">{line.name}</span>
                      <span className="mt-0.5 block text-espresso/55">× {line.quantity}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-espresso">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {notes ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Kitchen note: {notes}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-espresso px-4 text-sm font-medium text-cream"
        >
          Close
        </button>
      </article>
    </div>
  );
}

export function OrderItemsButton({
  items,
  notes,
}: {
  items: OrderLine[];
  notes?: string;
}) {
  const [open, setOpen] = useState(false);
  const headline = formatItemNames(items);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="max-w-full text-left font-medium break-words text-terracotta underline decoration-terracotta/35 underline-offset-4 hover:decoration-terracotta"
      >
        {headline}
      </button>
      {open ? (
        <OrderItemsDialog title={headline} items={items} notes={notes} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
