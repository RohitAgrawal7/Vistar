"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
        .filter((session) => (tableId ? session.tableId === tableId : true) && isActiveSession(session))
        .sort((a, b) => Number(a.tableId) - Number(b.tableId)),
    [sessions, tableId],
  );

  const closedSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "closed")
        .sort((a, b) => new Date(b.closedAt ?? b.updatedAt).getTime() - new Date(a.closedAt ?? a.updatedAt).getTime()),
    [sessions],
  );

  useEffect(() => {
    if (!isRemoteApiEnabled()) return;
    let cancelled = false;
    const pull = () => {
      void Promise.all([
        orderService.listSessions(),
        orderService.listOrders(),
        orderService.listAuditEvents(),
      ])
        .then(([remoteSessions, remoteOrders, remoteAudit]) => {
          if (cancelled) return;
          setError(null);
          useOrderStore.getState().replaceFloor({
            sessions: remoteSessions,
            orders: remoteOrders,
            auditLog: remoteAudit,
          });
        })
        .catch((err) => {
          if (cancelled) return;
          const message =
            err instanceof ApiError
              ? err.message
              : "Kitchen is offline. In a second terminal run: cd backend && npm run dev";
          setError(message);
        });
    };
    pull();
    const id = window.setInterval(pull, appConfig.pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const advanceStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      setMutating(true);
      setError(null);
      try {
        const order = await orderService.updateOrderStatus(id, status);
        upsertOrder(order);
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
      try {
        const session = await orderService.closeSession(sessionId);
        upsertSession(session);
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
      try {
        const session = await orderService.abandonSession(sessionId, note);
        upsertSession(session);
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
