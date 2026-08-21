"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { outboxBackoffMs } from "@/lib/outbox";
import type { OutboxEntry } from "@/lib/types";

export const OUTBOX_STORAGE_KEY = "vistar-outbox-v2";

interface OutboxState {
  items: OutboxEntry[];
  enqueue: (entry: OutboxEntry) => void;
  remove: (localId: string) => void;
  removeByIdempotencyKey: (idempotencyKey: string) => void;
  markRetry: (localId: string, error: string) => void;
  markFailed: (localId: string, error: string) => void;
  bumpDueNow: () => void;
  clearSession: (sessionId: string) => void;
}

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      items: [],
      enqueue: (entry) => {
        if (get().items.some((item) => item.idempotencyKey === entry.idempotencyKey)) {
          return;
        }
        set({ items: [...get().items, entry] });
      },
      remove: (localId) => {
        set({ items: get().items.filter((item) => item.localId !== localId) });
      },
      removeByIdempotencyKey: (idempotencyKey) => {
        set({ items: get().items.filter((item) => item.idempotencyKey !== idempotencyKey) });
      },
      markRetry: (localId, error) => {
        set({
          items: get().items.map((item) => {
            if (item.localId !== localId || item.failed) return item;
            const attemptCount = item.attemptCount + 1;
            return {
              ...item,
              attemptCount,
              lastError: error,
              nextAttemptAt: Date.now() + outboxBackoffMs(attemptCount - 1),
            };
          }),
        });
      },
      markFailed: (localId, error) => {
        set({
          items: get().items.map((item) =>
            item.localId === localId
              ? { ...item, failed: true, lastError: error, nextAttemptAt: Number.MAX_SAFE_INTEGER }
              : item,
          ),
        });
      },
      bumpDueNow: () => {
        set({
          items: get().items.map((item) =>
            item.failed ? item : { ...item, nextAttemptAt: 0 },
          ),
        });
      },
      clearSession: (sessionId) => {
        set({ items: get().items.filter((item) => item.sessionId !== sessionId) });
      },
    }),
    {
      name: OUTBOX_STORAGE_KEY,
      skipHydration: true,
    },
  ),
);
