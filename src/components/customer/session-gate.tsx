"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { GuestEntryShell } from "@/components/brand/guest-entry-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { isValidGuestName, isValidGuestPhone, sanitizeGuestPhone } from "@/lib/session";

export function SessionGate({
  tableId,
  occupied = false,
  error,
  mutating,
  onStart,
}: {
  tableId: string;
  occupied?: boolean;
  error?: string | null;
  mutating: boolean;
  onStart: (input: { guestName: string; guestPhone: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutating) return;
    if (!isValidGuestName(name)) {
      setLocalError("Enter your name (at least two letters).");
      return;
    }
    if (!isValidGuestPhone(phone)) {
      setLocalError("Enter exactly 10 digits (e.g. 9876543210).");
      return;
    }
    try {
      await onStart({ guestName: name, guestPhone: sanitizeGuestPhone(phone) });
    } catch {
      /* occupancy and validation stay on the gate — never crash the table */
    }
  }

  return (
    <GuestEntryShell
      entryKey="app"
      kicker={`Table ${tableId}`}
      title={appConfig.welcomeMessage}
      subtitle={
        occupied
          ? "This table is already in a live visit. Staff will free it when that guest is done."
          : appConfig.welcomeBody
      }
    >
      {occupied ? (
        <div className="rounded-[28px] border border-white/15 bg-cream/95 p-4 text-center text-espresso shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Table {tableId}</p>
          <h2 className="mt-2 font-display text-2xl italic sm:text-3xl">Table occupied</h2>
          <p className="mt-3 text-sm leading-6 text-espresso/70">
            Please wait. If this is a leftover demo visit, staff can tap Done or Force clear on the
            kitchen dashboard to free it.
          </p>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="rounded-[28px] border border-white/15 bg-cream/95 p-4 text-espresso shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] sm:p-6"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Table {tableId}</p>
          <h2 className="mt-2 font-display text-2xl italic sm:text-3xl">Who is ordering?</h2>
          <p className="mt-2 text-sm leading-6 text-espresso/70">
            Your name and mobile start a private session on this table. The café counter can see both.
          </p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium">Your name</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setLocalError(null);
              }}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Aanya"
              className="h-12 w-full rounded-2xl border border-espresso/15 bg-paper px-4 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Mobile number (10 digits)</span>
            <input
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                setLocalError(null);
              }}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              placeholder="9876543210"
              className="h-12 w-full rounded-2xl border border-espresso/15 bg-paper px-4 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
          </label>
          {localError || error ? <Alert className="mt-3" message={localError ?? error ?? ""} /> : null}
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            loading={mutating}
            icon={<ArrowRight className="size-4" aria-hidden />}
          >
            Start ordering
          </Button>
        </form>
      )}
    </GuestEntryShell>
  );
}
