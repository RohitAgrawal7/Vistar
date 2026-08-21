"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

export const CART_STORAGE_KEY = "vistar-carts-v2";

interface CartState {
  itemsByTable: Record<string, CartLine[]>;
  notesByTable: Record<string, string>;
  addItem: (tableId: string, itemId: string) => void;
  setQuantity: (tableId: string, itemId: string, quantity: number) => void;
  setNotes: (tableId: string, notes: string) => void;
  clear: (tableId: string) => void;
}

function updateLines(lines: CartLine[], itemId: string, quantity: number) {
  const next = lines.filter((line) => line.itemId !== itemId);
  if (quantity > 0) {
    next.push({ itemId, quantity });
  }
  return next;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      itemsByTable: {},
      notesByTable: {},
      addItem: (tableId, itemId) => {
        const current = get().itemsByTable[tableId] ?? [];
        const existing = current.find((line) => line.itemId === itemId);
        const quantity = (existing?.quantity ?? 0) + 1;
        set({
          itemsByTable: {
            ...get().itemsByTable,
            [tableId]: updateLines(current, itemId, quantity),
          },
        });
      },
      setQuantity: (tableId, itemId, quantity) => {
        const current = get().itemsByTable[tableId] ?? [];
        set({
          itemsByTable: {
            ...get().itemsByTable,
            [tableId]: updateLines(current, itemId, Math.max(0, Math.min(99, quantity))),
          },
        });
      },
      setNotes: (tableId, notes) => {
        set({
          notesByTable: {
            ...get().notesByTable,
            [tableId]: notes,
          },
        });
      },
      clear: (tableId) => {
        const itemsByTable = { ...get().itemsByTable };
        const notesByTable = { ...get().notesByTable };
        delete itemsByTable[tableId];
        delete notesByTable[tableId];
        set({ itemsByTable, notesByTable });
      },
    }),
    {
      name: CART_STORAGE_KEY,
      skipHydration: true,
    },
  ),
);
