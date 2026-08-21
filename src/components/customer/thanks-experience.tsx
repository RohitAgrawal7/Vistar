"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { GuestEntryShell } from "@/components/brand/guest-entry-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { orderService } from "@/lib/api";
import { appConfig } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { clearPaidVisit, readPaidVisit, type PaidVisit } from "@/lib/visit-complete";
import { useOrderStore } from "@/store/order-store";

const STAR_LABELS = ["Poor", "Okay", "Good", "Great", "Loved it"] as const;

export function ThanksExperience({ tableId }: { tableId: string }) {
  const router = useRouter();
  const [visit, setVisit] = useState<PaidVisit | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setVisit(readPaidVisit(tableId));
  }, [tableId]);

  useEffect(() => {
    if (visit === null) {
      router.replace(`/table/${tableId}`);
    }
  }, [router, tableId, visit]);

  if (visit === undefined || visit === null || leaving) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream">
        <Spinner label={leaving ? "Opening your table…" : "Opening your thank you…"} />
      </div>
    );
  }

  const paidVisit = visit;

  function goToTable() {
    clearPaidVisit(tableId);
    setLeaving(true);
    router.replace(`/table/${tableId}`);
  }

  async function finish(nextRating?: number, nextNote?: string) {
    const stars = nextRating ?? rating;
    try {
      const next = await orderService.reviewSession(paidVisit.sessionId, {
        tableId,
        rating: stars,
        reviewNote: nextNote ?? note,
      });
      useOrderStore.getState().upsertSession(next);
    } catch {
      const now = new Date().toISOString();
      const existing = useOrderStore.getState().sessions.find((item) => item.id === paidVisit.sessionId);
      if (existing) {
        useOrderStore.getState().upsertSession({
          ...existing,
          rating: stars > 0 ? stars : existing.rating,
          reviewNote: stars > 0 ? (nextNote ?? note).trim() : existing.reviewNote,
          reviewedAt: now,
        });
      }
    }
    goToTable();
  }

  return (
    <GuestEntryShell
      entryKey={`thanks:${visit.sessionId}`}
      skipIntro
      kicker={`${appConfig.restaurantName} · Table ${tableId}`}
      title={`Thank you, ${paidVisit.guestName}`}
      subtitle={`Your bill of ${formatCurrency(paidVisit.total)} is paid. Please tell us how this visit was.`}
    >
      <div className="rounded-[28px] border border-white/15 bg-cream/95 p-4 text-espresso shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] sm:p-6">
        <ReviewForm
          visit={paidVisit}
          rating={rating}
          note={note}
          onRating={setRating}
          onNote={setNote}
          onSend={() => finish()}
          onSkip={() => finish(0, "")}
        />
      </div>
    </GuestEntryShell>
  );
}

function ReviewForm({
  visit,
  rating,
  note,
  onRating,
  onNote,
  onSend,
  onSkip,
}: {
  visit: PaidVisit;
  rating: number;
  note: string;
  onRating: (value: number) => void;
  onNote: (value: string) => void;
  onSend: () => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">How was your visit?</p>
      <h2 className="mt-2 font-display text-2xl italic sm:text-3xl">Leave a quick review</h2>
      <p className="mt-2 text-sm leading-6 text-espresso/70">
        Tap a star for {visit.guestName}&apos;s meal at Table {visit.tableId}. This stays with the café.
      </p>

      <div className="mt-5 flex justify-center gap-1" role="radiogroup" aria-label="Star rating">
        {STAR_LABELS.map((label, index) => {
          const value = index + 1;
          const selected = rating >= value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"} · ${label}`}
              onClick={() => onRating(value)}
              className="grid size-12 place-items-center rounded-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            >
              <Star
                className={cn("size-8", selected ? "fill-gold text-gold" : "text-espresso/25")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-center text-sm font-medium text-terracotta" aria-live="polite">
        {rating > 0 ? STAR_LABELS[rating - 1] : "Tap a star"}
      </p>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium">Anything we should know? (optional)</span>
        <textarea
          value={note}
          onChange={(event) => onNote(event.target.value)}
          rows={3}
          placeholder="Food, service, or a favourite dish…"
          className="w-full resize-none rounded-2xl border border-espresso/10 bg-paper px-3 py-2 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        />
      </label>

      <div className="mt-5 flex flex-col gap-2">
        <Button type="button" size="lg" className="w-full" disabled={rating === 0} onClick={onSend}>
          Send review
        </Button>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
