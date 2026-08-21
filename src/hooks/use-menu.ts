"use client";

import { useEffect, useState } from "react";
import { MENU_ITEMS } from "@/lib/menu";
import { orderService } from "@/lib/api";
import type { MenuItem } from "@/lib/types";

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void orderService
      .getMenu()
      .then((menu) => {
        if (!cancelled) setItems(menu);
      })
      .catch(() => {
        if (!cancelled) setError("Menu could not be loaded. Showing the local list.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
