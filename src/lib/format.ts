import { appConfig } from "@/lib/config";
import { CATEGORY_ORDER } from "@/lib/menu";
import type { OrderLine } from "@/lib/types";

export function formatCurrency(amount: number) {
  const wholeRupees = appConfig.currency === "INR";
  try {
    return new Intl.NumberFormat(appConfig.locale, {
      style: "currency",
      currency: appConfig.currency,
      minimumFractionDigits: wholeRupees ? 0 : 2,
      maximumFractionDigits: wholeRupees ? 0 : 2,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount)}`;
  }
}

export function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(appConfig.locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
}

export function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(appConfig.locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

const categoryNoun: Record<string, { one: string; many: string }> = {
  combo: { one: "combo", many: "combos" },
  mixed_veg: { one: "sandwich", many: "sandwiches" },
  paneer: { one: "sandwich", many: "sandwiches" },
  cheese: { one: "sandwich", many: "sandwiches" },
  fries: { one: "fries", many: "fries" },
  coffee: { one: "coffee", many: "coffees" },
  shake: { one: "shake", many: "shakes" },
};

export function formatCategoryHeadline(items: OrderLine[]) {
  const counts: Record<string, number> = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, 0]),
  );

  for (const item of items) {
    counts[item.category] = (counts[item.category] ?? 0) + item.quantity;
  }

  const sandwichCount =
    (counts.mixed_veg ?? 0) + (counts.paneer ?? 0) + (counts.cheese ?? 0);
  const parts: string[] = [];
  if ((counts.combo ?? 0) > 0) {
    parts.push(`${counts.combo} ${counts.combo === 1 ? "combo" : "combos"}`);
  }
  if (sandwichCount > 0) {
    parts.push(`${sandwichCount} ${sandwichCount === 1 ? "sandwich" : "sandwiches"}`);
  }
  for (const category of ["fries", "coffee", "shake"] as const) {
    const count = counts[category] ?? 0;
    if (count > 0) {
      const nounEntry = categoryNoun[category];
      const noun = count === 1 ? nounEntry.one : nounEntry.many;
      parts.push(`${count} ${noun}`);
    }
  }

  // Custom categories (super-admin added)
  for (const [category, count] of Object.entries(counts)) {
    if (
      count > 0 &&
      !CATEGORY_ORDER.includes(category) &&
      !["mixed_veg", "paneer", "cheese", "combo", "fries", "coffee", "shake"].includes(category)
    ) {
      parts.push(`${count} ${category}`);
    }
  }

  return parts.join(", ") || "No items selected";
}

export function formatItemNames(items: OrderLine[]) {
  if (items.length === 0) return "No items";
  return items.map((line) => `${line.quantity}× ${line.name}`).join(", ");
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeTotals(items: OrderLine[], taxRate = appConfig.taxRate) {
  const subtotal = roundMoney(
    items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
  const tax = roundMoney(subtotal * taxRate);
  const total = roundMoney(subtotal + tax);
  return { subtotal, tax, total };
}
