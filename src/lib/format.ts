import { appConfig } from "@/lib/config";
import { CATEGORY_ORDER } from "@/lib/menu";
import type { MenuCategory, OrderLine } from "@/lib/types";

export function formatCurrency(amount: number) {
  const wholeRupees = appConfig.currency === "INR";
  return new Intl.NumberFormat(appConfig.locale, {
    style: "currency",
    currency: appConfig.currency,
    minimumFractionDigits: wholeRupees ? 0 : 2,
    maximumFractionDigits: wholeRupees ? 0 : 2,
  }).format(amount);
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(appConfig.locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(appConfig.locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

const categoryNoun: Record<MenuCategory, { one: string; many: string }> = {
  mixed_veg: { one: "sandwich", many: "sandwiches" },
  paneer: { one: "sandwich", many: "sandwiches" },
  cheese: { one: "sandwich", many: "sandwiches" },
  fries: { one: "fries", many: "fries" },
  coffee: { one: "coffee", many: "coffees" },
  shake: { one: "shake", many: "shakes" },
};

export function formatCategoryHeadline(items: OrderLine[]) {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<
    MenuCategory,
    number
  >;

  for (const item of items) {
    if (item.category in counts) counts[item.category] += item.quantity;
  }

  const sandwichCount = counts.mixed_veg + counts.paneer + counts.cheese;
  const parts: string[] = [];
  if (sandwichCount > 0) {
    parts.push(`${sandwichCount} ${sandwichCount === 1 ? "sandwich" : "sandwiches"}`);
  }
  (["fries", "coffee", "shake"] as const).forEach((category) => {
    const count = counts[category];
    if (count > 0) {
      const noun = count === 1 ? categoryNoun[category].one : categoryNoun[category].many;
      parts.push(`${count} ${noun}`);
    }
  });

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
