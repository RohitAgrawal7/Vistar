"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { QuantitySelector } from "@/components/customer/quantity-selector";
import { Badge } from "@/components/ui/badge";
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

  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gold/25 bg-paper shadow-[0_12px_32px_-28px_rgba(44,24,16,0.7)] sm:rounded-3xl"
      aria-labelledby={headingId}
    >
      <div className="relative aspect-[16/10] w-full bg-cream">
        <Image
          src={item.imageSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3.5 sm:p-5">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-start justify-between gap-3">
            <h3
              id={headingId}
              className="min-w-0 flex-1 text-pretty font-display text-lg leading-snug text-espresso sm:text-xl"
            >
              {item.name}
            </h3>
            <p className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-terracotta">
              {formatCurrency(item.price)}
            </p>
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-espresso/70 sm:leading-6">{item.description}</p>
          {item.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} tone="gold">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-11 min-h-11 w-full items-center justify-center gap-2 rounded-full bg-terracotta text-sm font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Add
            </button>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.18em] text-espresso/45">Qty</p>
              <QuantitySelector
                value={quantity}
                onChange={onQuantityChange}
                labelledBy={headingId}
                name={item.name}
              />
            </>
          )}
        </div>
      </div>
    </article>
  );
}
