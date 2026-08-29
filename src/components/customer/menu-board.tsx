"use client";

import { useEffect, useMemo, useState } from "react";
import { Coffee, Leaf, Star, UtensilsCrossed } from "lucide-react";
import MenuItemCard from "@/components/customer/menu-item-card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { buildGuestShelves, SHELF_CATEGORY_IDS } from "@/lib/menu";
import { useMenu } from "@/hooks/use-menu";

function ShelfIcon({ id, className }: { id: string; className?: string }) {
  if (id === "combo") return <Star className={className} aria-hidden />;
  if (id === "sandwiches") return <Leaf className={className} aria-hidden />;
  if (id === "fries") return <UtensilsCrossed className={className} aria-hidden />;
  return <Coffee className={className} aria-hidden />;
}

export function MenuBoard({
  quantityFor,
  onQuantityChange,
  onAdd,
}: {
  quantityFor: (itemId: string) => number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onAdd: (itemId: string) => void;
}) {
  const { categories, items, loading, error } = useMenu();
  const [shelfId, setShelfId] = useState("sandwiches");

  const shelves = useMemo(() => {
    const activeIds = new Set(categories.map((item) => item.id));
    const core = buildGuestShelves(activeIds);
    // Extra super-admin categories (not combo/sandwich/fries/coffee) become their own tabs.
    const extras = categories
      .filter((item) => item.active !== false && !SHELF_CATEGORY_IDS.has(item.id))
      .map((item) => ({
        id: item.id,
        label: item.label,
        blurb: item.blurb,
        categories: [item.id],
      }));
    return [...core, ...extras];
  }, [categories]);

  useEffect(() => {
    if (!shelves.length) return;
    if (!shelves.some((shelf) => shelf.id === shelfId)) {
      setShelfId(shelves[0].id);
    }
  }, [shelves, shelfId]);

  const selected = shelves.find((shelf) => shelf.id === shelfId) ?? shelves[0];

  const visible = useMemo(() => {
    if (!selected) return [];
    const allowed = new Set(selected.categories);
    return items.filter((item) => item.available && allowed.has(item.category));
  }, [items, selected]);

  return (
    <div
      id="menu"
      className="flex min-w-0 scroll-mt-[calc(4.75rem+env(safe-area-inset-top,0px))] flex-col gap-3 sm:gap-4"
    >
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 -mx-4 bg-cream/95 px-3 py-2 backdrop-blur sm:top-[calc(4rem+env(safe-area-inset-top,0px))] sm:mx-0 sm:rounded-2xl sm:border sm:border-espresso/8 sm:bg-white/85 sm:px-2">
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Menu categories">
          {shelves.map((option) => {
            const isSelected = shelfId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setShelfId(option.id)}
                className={cn(
                  "inline-flex min-h-11 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta",
                  isSelected
                    ? "bg-espresso text-cream"
                    : "bg-white text-espresso ring-1 ring-espresso/10",
                )}
              >
                <ShelfIcon id={option.id} className="size-3.5 shrink-0 sm:size-4" />
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight sm:text-[11px]">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        {selected?.blurb ? (
          <p className="mt-1.5 text-center text-[10px] text-espresso/55 sm:text-xs">
            {selected.blurb}
          </p>
        ) : null}
      </div>

      {error ? <Alert tone="info" message={error} /> : null}
      {loading ? <Spinner label="Loading menu…" /> : null}

      {!loading && visible.length === 0 ? (
        <p className="rounded-2xl border border-espresso/10 bg-paper px-4 py-6 text-center text-sm text-espresso/60">
          No dishes in this category right now.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {visible.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            quantity={quantityFor(item.id)}
            onQuantityChange={(quantity) => onQuantityChange(item.id, quantity)}
            onAdd={() => onAdd(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
