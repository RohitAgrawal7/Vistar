"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isValidAbandonNote } from "@/lib/staff";
import type { DiningSession } from "@/lib/types";

export function AbandonDialog({
  session,
  busy,
  onCancel,
  onConfirm,
}: {
  session: DiningSession;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidAbandonNote(note)) {
      setError("Write a short reason (at least 8 characters).");
      return;
    }
    try {
      await onConfirm(note);
    } catch {
      setError("Could not free the table. Try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-espresso/40 p-4 sheet-overlay sm:place-items-center"
      role="presentation"
      onClick={onCancel}
    >
      <form
        role="dialog"
        aria-labelledby="abandon-title"
        aria-modal="true"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        className="sheet-panel w-full max-w-md overflow-y-auto rounded-[28px] border border-espresso/10 bg-cream p-5 shadow-[0_24px_60px_-28px_rgba(44,24,16,0.55)]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">Force clear · Table {session.tableId}</p>
        <h2 id="abandon-title" className="mt-1 font-display text-2xl italic text-espresso">
          Why is this table being abandoned?
        </h2>
        <p className="mt-2 text-sm leading-6 text-espresso/70">
          This closes the visit without payment and revokes the guest token. The note is stored in the audit log.
        </p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Reason</span>
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setError(null);
            }}
            required
            minLength={8}
            maxLength={160}
            rows={3}
            placeholder="Guest left without paying / phone died / walked out"
            className="w-full rounded-2xl border border-espresso/15 bg-white px-4 py-3 text-sm outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
          />
        </label>
        {error ? <Alert className="mt-3" message={error} /> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Force clear table
          </Button>
        </div>
      </form>
    </div>
  );
}
