"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, CreditCard, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { RestaurantBackdrop } from "@/components/brand/restaurant-backdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SessionGate } from "@/components/customer/session-gate";
import { UpiPayQr } from "@/components/customer/upi-pay-qr";
import { OrderLineList } from "@/components/order-line-list";
import { useTableSession } from "@/hooks/use-session";
import { useThanksWhenStaffConfirms } from "@/hooks/use-thanks-when-staff-confirms";
import { formatCurrency } from "@/lib/format";
import { SESSION_COPY, STATUS_COPY } from "@/lib/status";
import { cn } from "@/lib/cn";
import { readPaidVisit } from "@/lib/visit-complete";
import type { PaymentMethod } from "@/lib/types";

export function PaymentExperience({ tableId }: { tableId: string }) {
  const router = useRouter();
  const table = useTableSession(tableId);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("wallet");
  useThanksWhenStaffConfirms(tableId);

  useEffect(() => {
    const visit = readPaidVisit(tableId);
    if (visit && !table.isOwner) {
      router.replace(`/table/${tableId}/thanks`);
    }
  }, [router, table.isOwner, tableId]);

  useEffect(() => {
    if (!table.isOwner || !table.session) return;
    if (table.session.status !== "open") return;
    if (table.orders.length === 0 || table.sending.length > 0) return;
    void table.requestBill();
  }, [table.isOwner, table.session, table.orders.length, table.sending.length, table.requestBill]);

  function scrollToPayment() {
    document.getElementById("payment-panel")?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  if (table.occupiedByOther) {
    return (
      <SessionGate
        tableId={tableId}
        occupied
        mutating={false}
        onStart={async () => undefined}
      />
    );
  }

  if (!table.isOwner || !table.session) {
    if (readPaidVisit(tableId)) {
      return (
        <div className="grid min-h-dvh place-items-center bg-cream">
          <Spinner label="Opening your thank you…" />
        </div>
      );
    }
    return (
      <div className="min-h-dvh bg-cream">
        <SiteHeader tableId={tableId} />
        <main className="mx-auto max-w-xl px-4 py-16">
          <EmptyState
            title="No session on this table"
            body="Enter your name at the table menu, place orders, then open the final bill."
            action={
              <Link href={`/table/${tableId}`} className="text-sm font-medium text-terracotta underline">
                Start a session
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const session = table.session;
  const sendingTotal = table.sending.reduce((sum, item) => sum + item.total, 0);
  const dueTotal = table.totals.total + sendingTotal;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <RestaurantBackdrop overlay="soft" className="fixed inset-0" />
      <div className="relative">
      <SiteHeader
        tableId={tableId}
        backHref={`/table/${tableId}`}
        backLabel="Menu"
      />
      <main id="main" className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-safe pt-3 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-espresso/50">
              {session.guestName} · Table {tableId}
            </p>
            <h1 className="font-display text-2xl italic text-espresso sm:text-4xl">Final bill</h1>
          </div>
          {session.status === "open" || session.status === "billing" ? (
            <Link
              href={`/table/${tableId}`}
              className="text-sm font-medium text-espresso/70 underline-offset-4 hover:text-espresso hover:underline"
            >
              Back to menu
            </Link>
          ) : (
            <Badge tone={SESSION_COPY[session.status].tone}>{SESSION_COPY[session.status].label}</Badge>
          )}
        </div>

        {table.error ? <Alert className="mb-4" message={table.error} /> : null}
        {table.sending.length > 0 ? (
          <Alert
            className="mb-4"
            tone="info"
            message="This order is still sending. The bill unlocks after the kitchen acknowledges it."
          />
        ) : null}

        <div
          className="flex flex-col gap-4 pb-8 md:flex-row md:snap-x md:snap-mandatory md:overflow-x-auto md:pb-6"
          aria-label="Session bill and payment"
        >
          <section className="w-full min-w-0 shrink-0 rounded-2xl border border-espresso/10 bg-white p-4 sm:rounded-[32px] sm:p-8 md:w-[min(100%,720px)] md:snap-start">
            <p className="text-xs uppercase tracking-[0.2em] text-espresso/50">All orders this visit</p>
            <h2 className="font-display text-2xl text-espresso sm:text-3xl">
              {table.orders.length + table.sending.length} order
              {table.orders.length + table.sending.length === 1 ? "" : "s"} · {formatCurrency(dueTotal)}
            </h2>

            <ul className="mt-4 divide-y divide-espresso/8 overflow-hidden rounded-2xl border border-espresso/8">
              {table.orders.map((order) => (
                <li key={order.id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-espresso/45">#{order.sequence}</p>
                    <OrderLineList items={order.items} className="mt-0.5 font-medium" />
                    <Badge className="mt-1" tone={STATUS_COPY[order.status].tone}>
                      {STATUS_COPY[order.status].label}
                    </Badge>
                  </div>
                  <p className="shrink-0 pt-0.5 text-sm tabular-nums">{formatCurrency(order.total)}</p>
                </li>
              ))}
              {table.sending.map((item) => (
                <li key={item.localId} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <OrderLineList items={item.items} className="font-medium" />
                    <Badge className="mt-1" tone="amber">
                      {item.failed ? "Could not send" : "Sending…"}
                    </Badge>
                  </div>
                  <p className="shrink-0 pt-0.5 text-sm tabular-nums">{formatCurrency(item.total)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-lg font-semibold">
                <dt>Amount due</dt>
                <dd className="tabular-nums">{formatCurrency(dueTotal)}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-espresso/60">
                This total is the same number the kitchen dashboard shows for {session.guestName}.
              </p>
              <Button
                type="button"
                variant="dark"
                className="w-full sm:w-auto"
                onClick={scrollToPayment}
                icon={<ArrowRight className="size-4" aria-hidden />}
              >
                Show UPI QR
              </Button>
            </div>
          </section>

          <section
            id="payment-panel"
            className="w-full min-w-0 shrink-0 scroll-mt-[calc(5.5rem+env(safe-area-inset-top,0px))] rounded-2xl bg-espresso p-4 text-cream sm:rounded-[32px] sm:p-8 md:w-[min(100%,640px)] md:snap-start"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Payment</p>
            <h2 className="mt-1 font-display text-3xl italic text-cream">Pay this bill</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-cream/70">
              Scan UPI or pay cash/card at the counter. Do not confirm on this phone. When staff tap
              Done, this page opens thank you.
            </p>

            <div className="mt-6 flex flex-col gap-5">
              <fieldset>
                <legend className="mb-3 text-sm font-medium">How are you paying?</legend>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <PayMethod
                    selected={selectedMethod === "card"}
                    onSelect={() => setSelectedMethod("card")}
                    icon={<CreditCard className="size-5" aria-hidden />}
                    label="Card"
                  />
                  <PayMethod
                    selected={selectedMethod === "wallet"}
                    onSelect={() => setSelectedMethod("wallet")}
                    icon={<Wallet className="size-5" aria-hidden />}
                    label="UPI"
                  />
                  <PayMethod
                    selected={selectedMethod === "cash"}
                    onSelect={() => setSelectedMethod("cash")}
                    icon={<Banknote className="size-5" aria-hidden />}
                    label="Cash"
                  />
                </div>
              </fieldset>
              {selectedMethod === "wallet" ? (
                <UpiPayQr amount={dueTotal} tableId={tableId} guestName={session.guestName} />
              ) : null}
              {selectedMethod === "card" ? (
                <p className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-cream/75">
                  Pay by card at the counter. Staff tap Done when it has gone through.
                </p>
              ) : null}
              {selectedMethod === "cash" ? (
                <p className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-cream/75">
                  Hand {formatCurrency(dueTotal)} to the counter. Staff tap Done, then this phone
                  opens thank you.
                </p>
              ) : null}
              <p
                className="rounded-2xl border border-gold/35 bg-white/8 px-4 py-3 text-center text-sm text-gold-light"
                role="status"
              >
                Waiting for the counter to tap Done…
              </p>
            </div>
          </section>
        </div>
      </main>
      </div>
    </div>
  );
}

function PayMethod({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-11 flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:items-start sm:px-4 sm:text-left",
        selected ? "border-gold bg-white/10" : "border-white/10 bg-white/5 hover:border-white/25",
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
