"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { orderBodiesMatch } from "@/lib/order-body";
import { activeSessionForTable, isActiveSession } from "@/lib/session";
import type { AuditEvent, DiningSession, Order, ResumeGrant } from "@/lib/types";

export const FLOOR_STORAGE_KEY = "vistar-floor-v3";

export type OrderCommitResult =
  | { status: "created"; order: Order }
  | { status: "replayed"; order: Order }
  | { status: "conflict" };

interface FloorState {
  sessions: DiningSession[];
  orders: Order[];
  auditLog: AuditEvent[];
  resumeGrants: ResumeGrant[];
  hasSeededDemo: boolean;
  replaceFloor: (payload: {
    sessions: DiningSession[];
    orders: Order[];
    auditLog?: AuditEvent[];
  }) => void;
  upsertSession: (session: DiningSession) => void;
  upsertOrder: (order: Order) => void;
  appendAudit: (event: AuditEvent) => void;
  putResumeGrant: (grant: ResumeGrant) => void;
  claimTable: (session: DiningSession) => boolean;
  commitIdempotentOrder: (draft: Order) => OrderCommitResult;
}

export const useOrderStore = create<FloorState>()(
  persist(
    (set, get) => ({
      sessions: [],
      orders: [],
      auditLog: [],
      resumeGrants: [],
      hasSeededDemo: false,
      replaceFloor: ({ sessions, orders, auditLog }) =>
        set(auditLog ? { sessions, orders, auditLog } : { sessions, orders }),
      upsertSession: (session) => {
        const existing = get().sessions;
        const index = existing.findIndex((item) => item.id === session.id);
        if (index === -1) {
          if (isActiveSession(session) && activeSessionForTable(existing, session.tableId)) {
            return;
          }
          set({ sessions: [session, ...existing] });
          return;
        }
        const next = [...existing];
        next[index] = session;
        set({ sessions: next });
      },
      upsertOrder: (order) => {
        const existing = get().orders;
        const index = existing.findIndex((item) => item.id === order.id);
        if (index === -1) {
          set({ orders: [order, ...existing] });
          return;
        }
        const next = [...existing];
        next[index] = order;
        set({ orders: next });
      },
      appendAudit: (event) => {
        set({ auditLog: [event, ...get().auditLog].slice(0, 200) });
      },
      putResumeGrant: (grant) => {
        set({
          resumeGrants: [
            grant,
            ...get().resumeGrants.filter(
              (item) => !(item.sessionId === grant.sessionId && !item.usedAt) && item.nonce !== grant.nonce,
            ),
          ].slice(0, 100),
        });
      },
      claimTable: (session) => {
        let claimed = false;
        set((state) => {
          if (activeSessionForTable(state.sessions, session.tableId)) {
            return state;
          }
          claimed = true;
          return { sessions: [session, ...state.sessions] };
        });
        return claimed;
      },
      commitIdempotentOrder: (draft) => {
        let result: OrderCommitResult = { status: "conflict" };
        set((state) => {
          const replayed = state.orders.find(
            (item) =>
              item.sessionId === draft.sessionId &&
              Boolean(item.idempotencyKey) &&
              item.idempotencyKey === draft.idempotencyKey,
          );
          if (replayed) {
            result = orderBodiesMatch(replayed, draft)
              ? { status: "replayed", order: replayed }
              : { status: "conflict" };
            return state;
          }

          const sequence =
            state.orders
              .filter((item) => item.sessionId === draft.sessionId && item.status !== "cancelled")
              .reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
          const order = { ...draft, sequence };
          const now = order.updatedAt;
          result = { status: "created", order };
          return {
            orders: [order, ...state.orders],
            sessions: state.sessions.map((session) =>
              session.id === draft.sessionId
                ? { ...session, updatedAt: now, lastActivityAt: now }
                : session,
            ),
          };
        });
        return result;
      },
    }),
    {
      name: FLOOR_STORAGE_KEY,
      skipHydration: true,
    },
  ),
);

export function pullFloorFromStorage() {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(FLOOR_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as {
      state?: {
        sessions?: DiningSession[];
        orders?: Order[];
        auditLog?: AuditEvent[];
        resumeGrants?: ResumeGrant[];
        hasSeededDemo?: boolean;
      };
    };
    const state = parsed.state;
    if (!state?.sessions || !state?.orders) return;
    useOrderStore.setState({
      sessions: state.sessions,
      orders: state.orders,
      auditLog: state.auditLog ?? useOrderStore.getState().auditLog,
      resumeGrants: state.resumeGrants ?? useOrderStore.getState().resumeGrants,
      hasSeededDemo: state.hasSeededDemo ?? useOrderStore.getState().hasSeededDemo,
    });
  } catch {
    /* ignore corrupt persist blob */
  }
}
