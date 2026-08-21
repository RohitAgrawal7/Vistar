"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Coffee, Sandwich, Star, UtensilsCrossed, Milk, Leaf } from "lucide-react";
import { MenuItemCard } from "@/components/customer/menu-item-card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/menu";
import { useMenu } from "@/hooks/use-menu";
import type { MenuCategory } from "@/lib/types";

const CATEGORY_ICON = {
  mixed_veg: Leaf,
  paneer: Sandwich,
  cheese: Star,
  fries: UtensilsCrossed,
  coffee: Coffee,
  shake: Milk,
};

export function MenuBoard({
  quantityFor,
  onQuantityChange,
  onAdd,
}: {
  quantityFor: (itemId: string) => number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onAdd: (itemId: string) => void;
}) {
  const { items, loading, error } = useMenu();
  const [active, setActive] = useState<MenuCategory | "all">("all");

  const visible = useMemo(
    () => (active === "all" ? items : items.filter((item) => item.category === active)),
    [active, items],
  );

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: visible.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [visible]);

  return (
    <div id="menu" className="flex min-w-0 scroll-mt-[calc(4.75rem+env(safe-area-inset-top,0px))] flex-col gap-4 sm:gap-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 -mx-4 bg-cream/95 backdrop-blur sm:top-[calc(4rem+env(safe-area-inset-top,0px))] sm:mx-0 sm:overflow-hidden sm:rounded-full sm:border sm:border-espresso/8 sm:bg-white/80">
        <div
          className="hide-scrollbar flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-2 touch-pan-x sm:px-2"
          role="tablist"
          aria-label="Menu categories"
        >
          <CategoryTab
            selected={active === "all"}
            onSelect={() => setActive("all")}
            label="All"
          />
          {CATEGORY_ORDER.map((category) => {
            const Icon = CATEGORY_ICON[category];
            return (
              <CategoryTab
                key={category}
                selected={active === category}
                onSelect={() => setActive(category)}
                label={CATEGORY_META[category].label}
                icon={<Icon className="size-4 shrink-0" aria-hidden />}
              />
            );
          })}
        </div>
      </div>

      {error ? <Alert tone="info" message={error} /> : null}
      {loading ? <Spinner label="Loading menu…" /> : null}

      {grouped.map((group) => (
        <section key={group.category} aria-labelledby={`cat-${group.category}`}>
          <div className="mb-3">
            <h2
              id={`cat-${group.category}`}
              className="font-display text-xl italic text-espresso sm:text-3xl"
            >
              {CATEGORY_META[group.category].label}
            </h2>
            <p className="text-sm text-espresso/60">{CATEGORY_META[group.category].blurb}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {group.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={quantityFor(item.id)}
                onQuantityChange={(quantity) => onQuantityChange(item.id, quantity)}
                onAdd={() => onAdd(item.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CategoryTab({
  selected,
  onSelect,
  label,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "inline-flex h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta sm:h-11 sm:gap-2 sm:px-4",
        selected ? "bg-espresso text-cream" : "bg-white text-espresso hover:bg-paper",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
