import { computeTotals } from "@/lib/format";
import type { DiningSession, Order, OrderLine, PaymentMethod } from "@/lib/types";

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function closedSession(
  id: string,
  tableId: string,
  guestName: string,
  hours: number,
  paymentMethod: PaymentMethod,
): DiningSession {
  const createdAt = hoursAgo(hours);
  return {
    id,
    tableId,
    guestName,
    token: "",
    tokenRevokedAt: hoursAgo(hours - 0.5),
    status: "closed",
    createdAt,
    updatedAt: hoursAgo(hours - 0.5),
    lastActivityAt: hoursAgo(hours - 0.5),
    billedAt: hoursAgo(hours - 0.35),
    paidAt: hoursAgo(hours - 0.4),
    closedAt: hoursAgo(hours - 0.5),
    closeReason: "paid",
    paymentMethod,
  };
}

function paidOrder(
  id: string,
  sessionId: string,
  tableId: string,
  sequence: number,
  hours: number,
  items: OrderLine[],
  paymentMethod: PaymentMethod = "card",
): Order {
  const createdAt = hoursAgo(hours);
  const totals = computeTotals(items);
  return {
    id,
    sessionId,
    tableId,
    sequence,
    items,
    status: "paid",
    notes: "",
    ...totals,
    createdAt,
    updatedAt: hoursAgo(hours - 0.4),
    confirmedAt: hoursAgo(hours - 0.15),
    readyAt: hoursAgo(hours - 0.35),
    paidAt: hoursAgo(hours - 0.4),
    paymentMethod,
  };
}

export function getSeedFloor(): { sessions: DiningSession[]; orders: Order[] } {
  const sessions: DiningSession[] = [
    closedSession("ses_seed_01", "4", "Ananya", 6, "card"),
    closedSession("ses_seed_02", "1", "Rohan", 5, "wallet"),
    closedSession("ses_seed_03", "2", "Priya", 4, "cash"),
    closedSession("ses_seed_04", "5", "Kabir", 3, "card"),
    closedSession("ses_seed_05", "3", "Meera", 2, "wallet"),
  ];

  const orders: Order[] = [
    paidOrder("ord_seed_01", "ses_seed_01", "4", 1, 6, [
      { itemId: "snd-pnr-tikka", name: "Paneer Tikka", category: "paneer", unitPrice: 149, quantity: 8 },
      { itemId: "fry-loaded", name: "Loaded Fries", category: "fries", unitPrice: 129, quantity: 3 },
      { itemId: "cof-classic", name: "Classic Cold Coffee", category: "coffee", unitPrice: 129, quantity: 6 },
    ]),
    paidOrder("ord_seed_02a", "ses_seed_02", "1", 1, 5.1, [
      { itemId: "snd-veg-peri", name: "Peri-Peri Sandwich", category: "mixed_veg", unitPrice: 109, quantity: 2 },
    ], "wallet"),
    paidOrder("ord_seed_02b", "ses_seed_02", "1", 2, 5, [
      { itemId: "snd-pnr-tikka", name: "Paneer Tikka", category: "paneer", unitPrice: 149, quantity: 4 },
      { itemId: "snd-veg-makhani", name: "Makhani Sandwich", category: "mixed_veg", unitPrice: 119, quantity: 3 },
      { itemId: "fry-salted", name: "Salted Fries", category: "fries", unitPrice: 89, quantity: 4 },
      { itemId: "shk-oreo", name: "Oreo Shake", category: "shake", unitPrice: 159, quantity: 3 },
    ], "wallet"),
    paidOrder("ord_seed_03", "ses_seed_03", "2", 1, 4, [
      { itemId: "snd-veg-regular", name: "Regular Mixed Veg", category: "mixed_veg", unitPrice: 99, quantity: 3 },
      { itemId: "fry-peri", name: "Peri-Peri Fries", category: "fries", unitPrice: 99, quantity: 6 },
      { itemId: "cof-chocolate", name: "Chocolate Cold Coffee", category: "coffee", unitPrice: 149, quantity: 4 },
    ], "cash"),
    paidOrder("ord_seed_04", "ses_seed_04", "5", 1, 3, [
      { itemId: "snd-chc-chocolate", name: "Chocolate Cheese Sandwich", category: "cheese", unitPrice: 139, quantity: 6 },
      { itemId: "snd-pnr-makhani", name: "Paneer Makhani", category: "paneer", unitPrice: 149, quantity: 2 },
      { itemId: "fry-loaded", name: "Loaded Fries", category: "fries", unitPrice: 129, quantity: 5 },
      { itemId: "shk-kitkat", name: "KitKat Shake", category: "shake", unitPrice: 159, quantity: 2 },
      { itemId: "cof-nutella", name: "Nutella Cold Coffee", category: "coffee", unitPrice: 159, quantity: 5 },
    ]),
    paidOrder("ord_seed_05", "ses_seed_05", "3", 1, 2, [
      { itemId: "snd-chc-grilled", name: "Cheese Grilled Sandwich", category: "cheese", unitPrice: 129, quantity: 4 },
      { itemId: "fry-chaat", name: "Chaat Masala Fries", category: "fries", unitPrice: 99, quantity: 2 },
      { itemId: "fry-loaded", name: "Loaded Fries", category: "fries", unitPrice: 129, quantity: 2 },
      { itemId: "cof-vanilla", name: "Vanilla Cold Coffee", category: "coffee", unitPrice: 149, quantity: 8 },
    ], "wallet"),
  ];

  return { sessions, orders };
}
