"use client";

import { useEffect, useRef } from "react";
import { ApiError, orderService } from "@/lib/api";
import { isRetryableSubmitError, outboxDue, withTimeout } from "@/lib/outbox";
import { useOrderStore } from "@/store/order-store";
import { useOutboxStore } from "@/store/outbox-store";

export function OutboxProcessor() {
  const flushing = useRef(false);
  const timer = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function flush() {
      if (cancelled || flushing.current) return;
      const due = useOutboxStore.getState().items.filter((item) => outboxDue(item));
      if (due.length === 0) return;
      flushing.current = true;
      try {
        for (const item of due) {
          if (cancelled) return;
          try {
            const order = await withTimeout(
              orderService.createOrder({
                tableId: item.tableId,
                sessionId: item.sessionId,
                token: item.token,
                items: item.items,
                notes: item.notes,
                idempotencyKey: item.idempotencyKey,
              }),
            );
            useOutboxStore.getState().remove(item.localId);
            useOrderStore.getState().upsertOrder(order);
          } catch (err) {
            const message = err instanceof ApiError ? err.message : "Could not reach the kitchen";
            if (isRetryableSubmitError(err)) {
              useOutboxStore.getState().markRetry(item.localId, message);
            } else {
              useOutboxStore.getState().markFailed(item.localId, message);
            }
          }
        }
      } finally {
        flushing.current = false;
      }
    }

    function schedule() {
      if (cancelled) return;
      window.clearTimeout(timer.current);
      const now = Date.now();
      const waiting = useOutboxStore
        .getState()
        .items.filter((item) => !item.failed && item.nextAttemptAt > now);
      const nextAt = waiting.reduce((soonest, item) => Math.min(soonest, item.nextAttemptAt), Infinity);
      if (Number.isFinite(nextAt)) {
        timer.current = window.setTimeout(() => {
          void flush().then(schedule);
        }, Math.max(0, nextAt - Date.now()));
      }
    }

    function kick() {
      void flush().then(schedule);
    }

    kick();
    const unsub = useOutboxStore.subscribe(kick);

    const onOnline = () => {
      useOutboxStore.getState().bumpDueNow();
      kick();
    };
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      unsub();
      window.clearTimeout(timer.current);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
