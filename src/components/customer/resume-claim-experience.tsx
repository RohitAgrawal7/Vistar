"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, orderService } from "@/lib/api";
import { useGuestStore } from "@/store/guest-store";
import { useOrderStore } from "@/store/order-store";

export function ResumeClaimExperience({ code }: { code: string }) {
  const router = useRouter();
  const saveClaim = useGuestStore((state) => state.claim);
  const upsertSession = useOrderStore((state) => state.upsertSession);
  const upsertOrder = useOrderStore((state) => state.upsertOrder);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void orderService
      .claimResume(code)
      .then(async (result) => {
        const snapshot = await orderService.getMySession(result.tableId, result.token);
        if (cancelled) return;
        saveClaim(result.tableId, { sessionId: result.sessionId, token: result.token });
        if (snapshot) {
          upsertSession({ ...snapshot.session, token: result.token });
          for (const order of snapshot.orders) {
            upsertOrder(order);
          }
        }
        router.replace(`/table/${result.tableId}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "This resume link could not be used.");
      });
    return () => {
      cancelled = true;
    };
  }, [code, router, saveClaim, upsertOrder, upsertSession]);

  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />
      <main id="main" className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 py-8 pb-safe">
        {error ? (
          <div className="rounded-[28px] border border-espresso/10 bg-white p-6 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Resume</p>
            <h1 className="mt-2 font-display text-3xl italic text-espresso">Ask staff for a new code</h1>
            <Alert className="mt-4 text-left" message={error} />
            <p className="mt-3 text-sm leading-6 text-espresso/70">
              Resume codes work once and expire in five minutes. Staff can tap Resume on new device again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <Spinner label="Connecting this phone to your table…" />
            <p className="text-sm text-espresso/70">Staff issued this one-time link. Your old phone will no longer work.</p>
          </div>
        )}
      </main>
    </div>
  );
}
