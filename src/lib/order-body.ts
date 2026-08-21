import type { Order, OrderLine } from "@/lib/types";

function normalizeLines(items: OrderLine[]) {
  return [...items]
    .map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}

export function orderBodiesMatch(left: Pick<Order, "items" | "notes">, right: Pick<Order, "items" | "notes">) {
  if ((left.notes ?? "").trim() !== (right.notes ?? "").trim()) return false;
  return JSON.stringify(normalizeLines(left.items)) === JSON.stringify(normalizeLines(right.items));
}
