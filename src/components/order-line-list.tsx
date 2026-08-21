import { cn } from "@/lib/cn";
import type { OrderLine } from "@/lib/types";

export function OrderLineList({
  items,
  className,
}: {
  items: OrderLine[];
  className?: string;
}) {
  if (items.length === 0) {
    return <p className={cn("text-sm text-espresso/50", className)}>No items</p>;
  }

  return (
    <ul className={cn("space-y-0.5", className)}>
      {items.map((line) => (
        <li key={line.itemId} className="min-w-0 text-sm leading-5 text-espresso">
          <span className="tabular-nums text-espresso/55">{line.quantity}×</span> {line.name}
        </li>
      ))}
    </ul>
  );
}
