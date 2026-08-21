"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { ApiError, orderService } from "@/lib/api";
import { isValidStaffName, isValidStaffPin } from "@/lib/staff";
import { useStaffStore } from "@/store/staff-store";

export function StaffLogin() {
  const login = useStaffStore((state) => state.login);
  const [staffName, setStaffName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!isValidStaffName(staffName)) {
      setError("Enter your name.");
      return;
    }
    if (!isValidStaffPin(pin)) {
      setError("PIN must be 4–8 digits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await orderService.staffLogin({ pin, staffName });
      login(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />
      <main id="main" className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 py-8 pb-safe">
        <form
          onSubmit={onSubmit}
          className="rounded-[28px] border border-espresso/10 bg-white p-4 shadow-[0_20px_50px_-32px_rgba(44,24,16,0.5)] sm:p-6"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Staff only</p>
          <h1 className="mt-2 font-display text-2xl italic text-espresso sm:text-3xl">Café counter sign-in</h1>
          <p className="mt-2 text-sm leading-6 text-espresso/70">
            Guest names, tickets, totals, Done, and Force clear are behind this PIN. Sign in on the counter tablet.
          </p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium">Your name</span>
            <input
              value={staffName}
              onChange={(event) => {
                setStaffName(event.target.value);
                setError(null);
              }}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Alex"
              className="h-12 w-full rounded-2xl border border-espresso/15 bg-paper px-4 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Kitchen PIN</span>
            <input
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 8));
                setError(null);
              }}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              className="h-12 w-full rounded-2xl border border-espresso/15 bg-paper px-4 text-base tracking-[0.3em] outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
          {error ? <Alert className="mt-3" message={error} /> : null}
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            loading={loading}
            icon={<KeyRound className="size-4" aria-hidden />}
          >
            Sign in
          </Button>
          <p className="mt-4 text-xs leading-5 text-espresso/50">
            Default PIN is <span className="font-medium text-espresso/70">2468</span>. On Vercel it
            must match <code className="rounded bg-espresso/5 px-1">STAFF_PIN</code> (or{" "}
            <code className="rounded bg-espresso/5 px-1">NEXT_PUBLIC_STAFF_PIN</code>).
          </p>
        </form>
      </main>
    </div>
  );
}
