"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, orderService } from "@/lib/api";
import { appConfig, isRemoteApiEnabled } from "@/lib/config";
import { isActiveSession } from "@/lib/session";
import { useOrderStore } from "@/store/order-store";
import type { DiningSession, Order, OrderStatus } from "@/lib/types";

export function useOrders(tableId?: string) {
  const allOrders = useOrderStore((state) => state.orders);
  const sessions = useOrderStore((state) => state.sessions);
  const auditLog = useOrderStore((state) => state.auditLog);
  const upsertOrder = useOrderStore((state) => state.upsertOrder);
  const upsertSession = useOrderStore((state) => state.upsertSession);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const pollGenRef = useRef(0);
  const quietUntilRef = useRef(0);

  const orders = useMemo(() => {
    const scoped = tableId
      ? allOrders.filter((order) => order.tableId === tableId)
      : allOrders;
    return [...scoped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [allOrders, tableId]);

  const activeSessions = useMemo(
    () =>
      sessions
        .filter(
          (session) =>
            (tableId ? session.tableId === tableId : true) && isActiveSession(session),
        )
        .sort((a, b) => Number(a.tableId) - Number(b.tableId)),
    [sessions, tableId],
  );

  const closedSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "closed")
        .sort(
          (a, b) =>
            new Date(b.closedAt ?? b.updatedAt).getTime() -
            new Date(a.closedAt ?? a.updatedAt).getTime(),
        ),
    [sessions],
  );

  useEffect(() => {
    if (!isRemoteApiEnabled()) return;
    let cancelled = false;
    let timer: number | null = null;

    const pull = async (reason: "interval" | "focus" | "mount") => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden && reason === "interval") {
        return;
      }
      if (inFlightRef.current) return;
      if (Date.now() < quietUntilRef.current && reason === "interval") return;

      inFlightRef.current = true;
      const gen = ++pollGenRef.current;
      try {
        const floor = await orderService.getFloor();
        if (cancelled || gen !== pollGenRef.current) return;
        setError(null);
        useOrderStore.getState().replaceFloor({
          sessions: floor.sessions,
          orders: floor.orders,
          auditLog: floor.auditLog,
        });
      } catch (err) {
        if (cancelled) return;
        // Keep showing last good floor — never blank the board on a blip.
        const message =
          err instanceof ApiError
            ? err.message
            : "Kitchen is offline. Check /api/health and try again.";
        setError(message);
      } finally {
        inFlightRef.current = false;
      }
    };

    const schedule = () => {
      if (timer != null) window.clearInterval(timer);
      timer = window.setInterval(() => void pull("interval"), appConfig.pollIntervalMs);
    };

    void pull("mount");
    schedule();

    const onVisibility = () => {
      if (!document.hidden) void pull("focus");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  const bumpQuiet = () => {
    pollGenRef.current += 1;
    quietUntilRef.current = Date.now() + 2000;
  };

  const advanceStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      setMutating(true);
      setError(null);
      bumpQuiet();
      try {
        const order = await orderService.updateOrderStatus(id, status);
        upsertOrder(order);
        bumpQuiet();
        return order;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not update order";
        setError(message);
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [upsertOrder],
  );

  const closeSession = useCallback(
    async (sessionId: string) => {
      setMutating(true);
      setError(null);
      bumpQuiet();
      try {
        const session = await orderService.closeSession(sessionId);
        upsertSession(session);
        bumpQuiet();
        return session;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not close the table";
        setError(message);
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [upsertSession],
  );

  const abandonSession = useCallback(
    async (sessionId: string, note: string) => {
      setMutating(true);
      setError(null);
      bumpQuiet();
      try {
        const session = await orderService.abandonSession(sessionId, note);
        upsertSession(session);
        bumpQuiet();
        return session;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not free the table";
        setError(message);
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [upsertSession],
  );

  const createResumeCode = useCallback(async (sessionId: string) => {
    setMutating(true);
    setError(null);
    try {
      return await orderService.createResumeCode(sessionId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not issue a resume code";
      setError(message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  return {
    orders,
    sessions,
    auditLog,
    activeSessions,
    closedSessions,
    mutating,
    error,
    advanceStatus,
    closeSession,
    abandonSession,
    createResumeCode,
  };
}

export function isPayable(order: Order) {
  return order.status === "ready" || order.status === "awaiting_payment";
}

export function isActiveKitchen(order: Order) {
  return order.status === "pending" || order.status === "confirmed";
}

export function sessionById(sessions: DiningSession[], id: string) {
  return sessions.find((session) => session.id === id);
}
