"use client";

import type { ReactNode } from "react";
import { Coffee, Sandwich, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { AnalyticsSnapshot, PeakDemand } from "@/lib/types";

export function AnalyticsPanel({ analytics }: { analytics: AnalyticsSnapshot }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl italic text-espresso sm:text-3xl">Service pulse</h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Tickets" value={String(analytics.totalOrders)} />
        <Stat label="Kitchen" value={String(analytics.activeKitchenCount)} />
        <Stat label="To collect" value={String(analytics.pendingPaymentCount)} />
        <Stat label="Revenue" value={formatCurrency(analytics.revenue)} />
      </div>
      <p className="text-sm text-espresso/60">
        Average paid ticket {formatCurrency(analytics.averageTicket)}
      </p>

      <PeakCard
        icon={<Sandwich className="size-5" aria-hidden />}
        title="Peak sandwich demand"
        peak={analytics.peakSandwich}
        empty="No sandwiches ordered yet"
      />
      <PeakCard
        icon={<UtensilsCrossed className="size-5" aria-hidden />}
        title="Peak fries demand"
        peak={analytics.peakFries}
        empty="No fries ordered yet"
      />
      <PeakCard
        icon={<Coffee className="size-5" aria-hidden />}
        title="Peak drink demand"
        peak={analytics.peakCoffee}
        empty="No iced coffees or shakes ordered yet"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-espresso/50">{label}</p>
      <p className="mt-1 break-all font-display text-xl tabular-nums text-espresso sm:text-2xl">{value}</p>
    </Card>
  );
}

function PeakCard({
  icon,
  title,
  peak,
  empty,
}: {
  icon: ReactNode;
  title: string;
  peak: PeakDemand | null;
  empty: string;
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-espresso">
        <span className="text-terracotta">{icon}</span>
        {title}
      </p>
      {peak ? (
        <div className="mt-3">
          <p className="font-display text-2xl text-espresso">{peak.name}</p>
          <p className="text-sm text-espresso/60">{peak.quantity} ordered across all tickets</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-terracotta"
              style={{ width: `${Math.min(100, 24 + peak.quantity * 4)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-espresso/55">{empty}</p>
      )}
    </Card>
  );
}
