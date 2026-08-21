import { DRINK_CATEGORIES, SANDWICH_CATEGORIES } from "@/lib/menu";
import type {
  AnalyticsSnapshot,
  MenuCategory,
  Order,
  PeakDemand,
} from "@/lib/types";

export function computeAnalytics(orders: Order[]): AnalyticsSnapshot {
  const countable = orders.filter((order) => order.status !== "cancelled");
  const paid = countable.filter((order) => order.status === "paid");
  const pendingPayment = countable.filter(
    (order) => order.status === "ready" || order.status === "awaiting_payment",
  );
  const activeKitchen = countable.filter(
    (order) => order.status === "pending" || order.status === "confirmed",
  );
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);

  const peakFor = (categories: MenuCategory[]): PeakDemand | null => {
    const tally = new Map<string, { name: string; category: MenuCategory; quantity: number }>();
    for (const order of countable) {
      for (const line of order.items) {
        if (!categories.includes(line.category)) continue;
        const existing = tally.get(line.itemId) ?? {
          name: line.name,
          category: line.category,
          quantity: 0,
        };
        existing.quantity += line.quantity;
        tally.set(line.itemId, existing);
      }
    }
    let winner: PeakDemand | null = null;
    for (const [itemId, value] of tally) {
      if (!winner || value.quantity > winner.quantity) {
        winner = {
          category: value.category,
          itemId,
          name: value.name,
          quantity: value.quantity,
        };
      }
    }
    return winner;
  };

  return {
    totalOrders: countable.length,
    paidOrders: paid.length,
    pendingPaymentCount: pendingPayment.length,
    activeKitchenCount: activeKitchen.length,
    revenue,
    averageTicket: paid.length ? revenue / paid.length : 0,
    peakSandwich: peakFor(SANDWICH_CATEGORIES),
    peakFries: peakFor(["fries"]),
    peakCoffee: peakFor(DRINK_CATEGORIES),
  };
}
