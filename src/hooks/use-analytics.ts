"use client";

import { useMemo } from "react";
import { computeAnalytics } from "@/lib/analytics";
import { useOrderStore } from "@/store/order-store";

export function useAnalytics() {
  const orders = useOrderStore((state) => state.orders);
  return useMemo(() => computeAnalytics(orders), [orders]);
}
