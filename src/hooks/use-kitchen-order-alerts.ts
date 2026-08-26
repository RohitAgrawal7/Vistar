"use client";

import { useEffect, useRef } from "react";
import {
  playKitchenChime,
  type KitchenChimeKind,
} from "@/lib/kitchen-chimes";
import { isActiveKitchen } from "@/hooks/use-orders";
import type { Order } from "@/lib/types";

type OrderSnap = {
  status: Order["status"];
  updatedAt: string;
  total: number;
  itemKey: string;
};

type SuppressRef = { current: number };

function snapshot(order: Order): OrderSnap {
  return {
    status: order.status,
    updatedAt: order.updatedAt,
    total: order.total,
    itemKey: order.items.map((line) => `${line.itemId}:${line.quantity}`).join("|"),
  };
}

function fingerprint(orders: Order[]) {
  const map = new Map<string, OrderSnap>();
  for (const order of orders) {
    map.set(order.id, snapshot(order));
  }
  return map;
}

/**
 * Watches kitchen order list and plays distinct chimes:
 * - new_order: brand-new ticket (usually pending)
 * - order_update: existing ticket status / contents changed
 *
 * Skips the first poll (baseline) and a short window after local staff actions.
 */
export function useKitchenOrderAlerts(
  orders: Order[],
  {
    enabled,
    suppressUntilRef,
  }: {
    enabled: boolean;
    /** When staff tap Confirm/Ready locally, set Date.now()+ms to avoid self-chimes. */
    suppressUntilRef: SuppressRef;
  },
) {
  const baselineRef = useRef<Map<string, OrderSnap> | null>(null);
  const lastAlertRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      baselineRef.current = fingerprint(orders);
      return;
    }

    const next = fingerprint(orders);
    const prev = baselineRef.current;

    if (!prev) {
      baselineRef.current = next;
      return;
    }

    if (Date.now() < suppressUntilRef.current) {
      baselineRef.current = next;
      return;
    }

    const events: KitchenChimeKind[] = [];

    for (const [id, snap] of next) {
      const before = prev.get(id);
      if (!before) {
        // New ticket arriving for the kitchen.
        const order = orders.find((item) => item.id === id);
        if (order && (isActiveKitchen(order) || order.status === "pending")) {
          events.push("new_order");
        }
        continue;
      }
      const changed =
        before.status !== snap.status ||
        before.total !== snap.total ||
        before.itemKey !== snap.itemKey;
      if (changed) {
        events.push("order_update");
      }
    }

    baselineRef.current = next;

    if (!events.length) return;

    // Prefer the louder new-order chime if both happened in one poll.
    const kind: KitchenChimeKind = events.includes("new_order")
      ? "new_order"
      : "order_update";

    // Debounce rapid polls (min 1.2s between sounds).
    const now = Date.now();
    if (now - lastAlertRef.current < 1200) return;
    lastAlertRef.current = now;

    void playKitchenChime(kind);

    if (kind === "new_order" && typeof document !== "undefined") {
      const previous = document.title;
      document.title = "● New order — Vistar";
      window.setTimeout(() => {
        if (document.title.startsWith("● New order")) document.title = previous;
      }, 4000);
    }
  }, [orders, enabled, suppressUntilRef]);
}
