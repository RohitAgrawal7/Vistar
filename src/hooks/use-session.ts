"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, orderService } from "@/lib/api";
import { appConfig, isRemoteApiEnabled } from "@/lib/config";
import { createId, createIdempotencyKey } from "@/lib/id";
import { computeTotals } from "@/lib/format";
import {
  activeSessionForTable,
  computeSessionTotals,
  guestOwnsSession,
  ordersForSession,
} from "@/lib/session";
import { useCartStore } from "@/store/cart-store";
import { useGuestStore } from "@/store/guest-store";
import { useOrderStore } from "@/store/order-store";
import { useOutboxStore } from "@/store/outbox-store";
import { clearPaidVisit, savePaidVisit } from "@/lib/visit-complete";
import type { DiningSession, OutboxEntry, PaymentMethod } from "@/lib/types";

export function useTableSession(tableId: string) {
  const sessions = useOrderStore((state) => state.sessions);
  const allOrders = useOrderStore((state) => state.orders);
  const upsertSession = useOrderStore((state) => state.upsertSession);
  const upsertOrder = useOrderStore((state) => state.upsertOrder);
  const claim = useGuestStore((state) => state.claimsByTable[tableId]);
  const saveClaim = useGuestStore((state) => state.claim);
  const release = useGuestStore((state) => state.release);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupied, setOccupied] = useState(false);
  const startInFlight = useRef<Promise<DiningSession | null> | null>(null);
  const allOutbox = useOutboxStore((state) => state.items);

  const active = useMemo(
    () => activeSessionForTable(sessions, tableId),
    [sessions, tableId],
  );

  const claimedSession = useMemo(
    () => (claim ? sessions.find((item) => item.id === claim.sessionId) : undefined),
    [claim, sessions],
  );

  const isOwner = guestOwnsSession(active, claim);
  const session = isOwner ? active : undefined;
  const occupiedByOther = Boolean((occupied || Boolean(active)) && !isOwner);

  const orders = useMemo(
    () => (session ? ordersForSession(allOrders, session.id) : []),
    [allOrders, session],
  );

  const sending = useMemo(
    () =>
      session
        ? allOutbox
            .filter((item) => item.sessionId === session.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [allOutbox, session],
  );

  const totals = useMemo(() => computeSessionTotals(orders), [orders]);

  useEffect(() => {
    if (!active || !claim || !guestOwnsSession(active, claim)) return;
    if (active.token === claim.token) return;
    useOrderStore.getState().upsertSession({ ...active, token: claim.token });
  }, [active, claim]);

  useEffect(() => {
    if (claimedSession?.status !== "closed") return;
    if (claimedSession.closeReason === "paid" && !claimedSession.reviewedAt) {
      savePaidVisit({
        tableId,
        sessionId: claimedSession.id,
        guestName: claimedSession.guestName,
        total: computeSessionTotals(ordersForSession(allOrders, claimedSession.id)).total,
      });
    }
    const frame = window.requestAnimationFrame(() => {
      useGuestStore.getState().release(tableId);
      useCartStore.getState().clear(tableId);
      useOutboxStore.getState().clearSession(claimedSession.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allOrders, claimedSession, tableId]);

  useEffect(() => {
    let cancelled = false;
    const claimToken = claim?.token;
    const claimSessionId = claim?.sessionId;

    const pullPublic = () => {
      void orderService
        .getTableOccupancy(tableId)
        .then((result) => {
          if (!cancelled) setOccupied(result.occupied);
        })
        .catch(() => {
          /* occupancy is best-effort; writes stay token-gated */
        });
    };

    const pullMine = () => {
      if (!claimToken || !claimSessionId) return;
      void orderService
        .getMySession(tableId, claimToken)
        .then((snapshot) => {
          if (cancelled) return;
          if (!snapshot) {
            const current = useOrderStore
              .getState()
              .sessions.find((item) => item.id === claimSessionId);
            if (!current || current.status === "closed" || !current.token) {
              useGuestStore.getState().release(tableId);
              useCartStore.getState().clear(tableId);
            }
            return;
          }
          useOrderStore.getState().upsertSession({ ...snapshot.session, token: claimToken });
          for (const order of snapshot.orders) {
            useOrderStore.getState().upsertOrder(order);
            if (order.idempotencyKey) {
              useOutboxStore.getState().removeByIdempotencyKey(order.idempotencyKey);
            }
          }
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            const live = activeSessionForTable(useOrderStore.getState().sessions, tableId);
            const currentClaim = useGuestStore.getState().claimsByTable[tableId];
            if (live && currentClaim && guestOwnsSession(live, currentClaim)) {
              useOrderStore.getState().upsertSession({ ...live, token: currentClaim.token });
              return;
            }
            useGuestStore.getState().release(tableId);
            useCartStore.getState().clear(tableId);
          }
        });
    };

    pullPublic();
    pullMine();

    if (!isRemoteApiEnabled()) {
      return () => {
        cancelled = true;
      };
    }

    const id = window.setInterval(() => {
      pullPublic();
      pullMine();
    }, appConfig.pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [claim?.sessionId, claim?.token, tableId]);

  const startSession = useCallback(
    async (guestName: string) => {
      if (startInFlight.current) return startInFlight.current;
      setMutating(true);
      setError(null);
      const run = (async (): Promise<DiningSession | null> => {
        try {
          const existingClaim = useGuestStore.getState().claimsByTable[tableId];
          if (existingClaim) {
            try {
              const snapshot = await orderService.getMySession(tableId, existingClaim.token);
              if (snapshot) {
                upsertSession({ ...snapshot.session, token: existingClaim.token });
                for (const order of snapshot.orders) {
                  upsertOrder(order);
                }
                saveClaim(tableId, existingClaim);
                setOccupied(true);
                return { ...snapshot.session, token: existingClaim.token };
              }
            } catch (err) {
              const live = activeSessionForTable(useOrderStore.getState().sessions, tableId);
              if (live && guestOwnsSession(live, existingClaim)) {
                upsertSession({ ...live, token: existingClaim.token });
                setOccupied(true);
                return { ...live, token: existingClaim.token };
              }
              if (!(err instanceof ApiError && (err.status === 401 || err.status === 403))) {
                throw err;
              }
              release(tableId);
            }
          }

          const occupancy = await orderService.getTableOccupancy(tableId);
          if (occupancy.occupied) {
            setOccupied(true);
            setError("This table is occupied. Please wait.");
            return null;
          }

          const next = await orderService.startSession({ tableId, guestName });
          upsertSession(next);
          saveClaim(tableId, { sessionId: next.id, token: next.token });
          clearPaidVisit(tableId);
          setOccupied(true);
          return next;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Could not start session";
          setError(message);
          if (err instanceof ApiError && err.status === 409) {
            setOccupied(true);
          }
          return null;
        } finally {
          startInFlight.current = null;
          setMutating(false);
        }
      })();
      startInFlight.current = run;
      return run;
    },
    [release, saveClaim, tableId, upsertOrder, upsertSession],
  );

  const queueOrder = useCallback(
    (input: { items: OutboxEntry["items"]; notes?: string }): OutboxEntry => {
      if (!session || !claim) {
        throw new ApiError("Start a session before ordering", 401);
      }
      if (!input.items.length) {
        throw new ApiError("Add at least one item before submitting", 400);
      }
      const totals = computeTotals(input.items);
      const now = new Date().toISOString();
      const entry: OutboxEntry = {
        localId: createId("out"),
        tableId,
        sessionId: session.id,
        token: claim.token,
        idempotencyKey: createIdempotencyKey(),
        items: input.items.map((item) => ({ ...item })),
        notes: input.notes?.trim() ?? "",
        ...totals,
        createdAt: now,
        attemptCount: 0,
        nextAttemptAt: 0,
        lastError: null,
        failed: false,
      };
      useOutboxStore.getState().enqueue(entry);
      return entry;
    },
    [claim, session, tableId],
  );

  const requestBill = useCallback(async () => {
    if (!session || !claim) throw new ApiError("No session to bill", 401);
    const pending = useOutboxStore.getState().items.filter((item) => item.sessionId === session.id);
    if (pending.length > 0) {
      throw new ApiError("Wait until your orders finish sending", 409);
    }
    setMutating(true);
    setError(null);
    try {
      const next = await orderService.requestBill(session.id, claim.token);
      upsertSession({ ...next, token: claim.token });
      return next;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not open the bill";
      setError(message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, [claim, session, upsertSession]);

  const paySession = useCallback(
    async (method: PaymentMethod) => {
      if (!session || !claim) throw new ApiError("No session to pay", 401);
      setMutating(true);
      setError(null);
      try {
        const next = await orderService.paySession(session.id, claim.token, method);
        upsertSession({ ...next, token: claim.token });
        savePaidVisit({
          tableId,
          sessionId: next.id,
          guestName: next.guestName,
          total: totals.total,
        });
        return next;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Payment could not be completed";
        setError(message);
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [claim, session, tableId, totals.total, upsertSession],
  );

  const exitSession = useCallback(async () => {
    if (!session || !claim) throw new ApiError("No session to leave", 401);
    setMutating(true);
    setError(null);
    try {
      const next = await orderService.exitSession(session.id, claim.token);
      upsertSession(next);
      useOutboxStore.getState().clearSession(session.id);
      useCartStore.getState().clear(tableId);
      release(tableId);
      return next;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not leave the table";
      setError(message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, [claim, release, session, tableId, upsertSession]);

  const clearLocalTable = useCallback(() => {
    release(tableId);
    useCartStore.getState().clear(tableId);
  }, [release, tableId]);

  return {
    session,
    orders,
    sending,
    totals,
    isOwner,
    occupiedByOther,
    mutating,
    error,
    setError,
    startSession,
    queueOrder,
    requestBill,
    paySession,
    exitSession,
    clearLocalTable,
  };
}
