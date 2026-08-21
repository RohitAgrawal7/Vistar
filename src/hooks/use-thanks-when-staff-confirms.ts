"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { computeSessionTotals, ordersForSession } from "@/lib/session";
import { clearPaidVisit, readPaidVisit, savePaidVisit } from "@/lib/visit-complete";
import { useGuestStore } from "@/store/guest-store";
import { useOrderStore } from "@/store/order-store";

export function useThanksWhenStaffConfirms(tableId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const claim = useGuestStore((state) => state.claimsByTable[tableId]);
  const sessions = useOrderStore((state) => state.sessions);
  const orders = useOrderStore((state) => state.orders);

  useEffect(() => {
    if (pathname?.includes("/thanks")) return;

    const mine = claim
      ? sessions.find((session) => session.id === claim.sessionId)
      : undefined;

    if (mine?.reviewedAt) {
      if (readPaidVisit(tableId)?.sessionId === mine.id) clearPaidVisit(tableId);
      return;
    }

    const staffPaid = Boolean(
      mine && (mine.status === "paid" || (mine.status === "closed" && mine.closeReason === "paid")),
    );

    if (staffPaid && mine) {
      const totals = computeSessionTotals(ordersForSession(orders, mine.id));
      savePaidVisit({
        tableId,
        sessionId: mine.id,
        guestName: mine.guestName,
        total: totals.total,
      });
      router.replace(`/table/${tableId}/thanks`);
      return;
    }

    if (!mine && readPaidVisit(tableId)) {
      router.replace(`/table/${tableId}/thanks`);
    }
  }, [claim, orders, pathname, router, sessions, tableId]);
}
