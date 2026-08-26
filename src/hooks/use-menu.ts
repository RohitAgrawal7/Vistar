"use client";

import { useEffect, useState } from "react";
import { seedCategories, seedMenuItems } from "@/lib/menu";
import { orderService } from "@/lib/api";
import type { MenuCatalog, MenuCategoryRecord, MenuItem } from "@/lib/types";

const fallback: MenuCatalog = {
  categories: seedCategories().filter((item) => item.active),
  items: seedMenuItems().filter((item) => item.available),
};

export function useMenu() {
  const [catalog, setCatalog] = useState<MenuCatalog>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void orderService
      .getMenu()
      .then((menu) => {
        if (!cancelled) setCatalog(menu);
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

  return {
    catalog,
    categories: catalog.categories as MenuCategoryRecord[],
    items: catalog.items as MenuItem[],
    loading,
    error,
  };
}
