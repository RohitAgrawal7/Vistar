"use client";

import { Plus } from "lucide-react";
import { QuantitySelector } from "@/components/customer/quantity-selector";
import { formatCurrency } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

export function MenuItemCard({
  item,
  quantity,
  onQuantityChange,
  onAdd,
}: {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
}) {
  const headingId = `${item.id}-name`;
  const comboImages = item.comboImages;
  const isCombo = item.category === "combo" && Boolean(comboImages);

  return (
    <article
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-espresso/10 bg-paper"
      aria-labelledby={headingId}
    >
      <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-cream">
        {isCombo && comboImages ? (
          <div className="grid size-full grid-cols-3 gap-0.5 bg-espresso/10">
            {comboImages.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${item.id}-img-${index}`}
                src={src}
                alt=""
                className="size-full object-cover"
              />
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/70 to-transparent px-1.5 pb-1.5 pt-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cream/95">
                Sandwich · Fries · Coffee
              </p>
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageSrc} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-2.5">
        <div className="min-h-0">
          <h3
            id={headingId}
            className="line-clamp-2 text-pretty font-display text-[13px] leading-snug text-espresso sm:text-sm"
          >
            {item.name}
          </h3>
          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-terracotta sm:text-sm">
            {formatCurrency(item.price)}
          </p>
        </div>

        {quantity === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="mt-auto inline-flex h-9 w-full items-center justify-center gap-1 rounded-full bg-terracotta text-xs font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden />
            Add
          </button>
        ) : (
          <div className="mt-auto flex justify-center">
            <QuantitySelector
              value={quantity}
              onChange={onQuantityChange}
              labelledBy={headingId}
              name={item.name}
              compact
            />
          </div>
        )}
      </div>
    </article>
  );
}

export default MenuItemCard;
