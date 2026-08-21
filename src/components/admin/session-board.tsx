"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { AdminSessionCard } from "@/components/admin/admin-session-card";
import { EmptyState } from "@/components/ui/empty-state";
import { isSessionStale } from "@/lib/session";
import type { DiningSession, Order, OrderStatus, ResumeTicket } from "@/lib/types";

export function SessionBoard({
  sessions,
  orders,
  onAdvance,
  onClose,
  onAbandon,
  onResume,
  busy,
}: {
  sessions: DiningSession[];
  orders: Order[];
  onAdvance: (id: string, status: OrderStatus) => void;
  onClose: (sessionId: string) => void;
  onAbandon: (sessionId: string, note: string) => void | Promise<unknown>;
  onResume: (sessionId: string) => Promise<ResumeTicket>;
  busy: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const ranked = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const staleA = isSessionStale(a, now) ? 0 : 1;
        const staleB = isSessionStale(b, now) ? 0 : 1;
        if (staleA !== staleB) return staleA - staleB;
        return Number(a.tableId) - Number(b.tableId);
      }),
    [now, sessions],
  );
  const staleCount = ranked.filter((session) => isSessionStale(session, now)).length;

  return (
    <section aria-labelledby="incoming-heading">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Bell className="size-4 text-terracotta" aria-hidden />
        <h2 id="incoming-heading" className="font-display text-3xl italic text-espresso">
          Active tables
        </h2>
        <span className="rounded-full bg-terracotta/15 px-2 py-0.5 text-xs font-semibold text-terracotta-dark">
          {sessions.length}
        </span>
        {staleCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {staleCount} stale
          </span>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          title="No open sessions"
          body="When a guest enters their name at a table QR, that session and every order they submit appear here together."
        />
      ) : (
        <div className="grid gap-4">
          {ranked.map((session) => (
            <AdminSessionCard
              key={session.id}
              session={session}
              orders={orders}
              onAdvance={onAdvance}
              onClose={onClose}
              onAbandon={onAbandon}
              onResume={onResume}
              busy={busy}
              now={now}
            />
          ))}
        </div>
      )}
    </section>
  );
}
