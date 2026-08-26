"use client";

import { useMemo } from "react";
import { computeTotals, formatCategoryHeadline } from "@/lib/format";
import { getMenuItem } from "@/lib/menu";
import { useCartStore } from "@/store/cart-store";
import type { CartLine, MenuItem, OrderLine } from "@/lib/types";

const EMPTY_CART: CartLine[] = [];

export function useCart(tableId: string, menuItems?: MenuItem[]) {
  const rawLines = useCartStore((state) => state.itemsByTable[tableId] ?? EMPTY_CART);
  const notes = useCartStore((state) => state.notesByTable[tableId] ?? "");
  const addItem = useCartStore((state) => state.addItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const setNotes = useCartStore((state) => state.setNotes);
  const clear = useCartStore((state) => state.clear);

  const lines: OrderLine[] = useMemo(() => {
    const next: OrderLine[] = [];
    for (const line of rawLines) {
      const fromApi = menuItems?.find((item) => item.id === line.itemId);
      const item = fromApi ?? getMenuItem(line.itemId);
      if (!item) continue;
      next.push({
        itemId: item.id,
        name: item.name,
        category: item.category,
        unitPrice: item.price,
        quantity: line.quantity,
      });
    }
    return next;
  }, [rawLines, menuItems]);

  const totals = useMemo(() => computeTotals(lines), [lines]);
  const headline = useMemo(() => formatCategoryHeadline(lines), [lines]);
  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const quantityFor = (itemId: string) =>
    rawLines.find((line) => line.itemId === itemId)?.quantity ?? 0;

  return {
    lines,
    notes,
    totals,
    headline,
    itemCount,
    quantityFor,
    addItem: (itemId: string) => addItem(tableId, itemId),
    setQuantity: (itemId: string, quantity: number) =>
      setQuantity(tableId, itemId, quantity),
    setNotes: (value: string) => setNotes(tableId, value),
    clear: () => clear(tableId),
  };
}
