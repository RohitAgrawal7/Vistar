"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Send } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { RestaurantBackdrop } from "@/components/brand/restaurant-backdrop";
import { MenuBoard } from "@/components/customer/menu-board";
import { BillSummary } from "@/components/customer/bill-summary";
import { SessionGate } from "@/components/customer/session-gate";
import { SessionOrderTable } from "@/components/customer/session-order-table";
import { ExitSessionDialog } from "@/components/customer/exit-session-dialog";
import { ViewBillDialog } from "@/components/customer/view-bill-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useMenu } from "@/hooks/use-menu";
import { useTableSession } from "@/hooks/use-session";
import { formatCurrency } from "@/lib/format";
import { canAddOrders, formatGuestPhone } from "@/lib/session";
import { readPaidVisit, savePaidVisit } from "@/lib/visit-complete";
import { useThanksWhenStaffConfirms } from "@/hooks/use-thanks-when-staff-confirms";

export function CustomerOrderExperience({ tableId }: { tableId: string }) {
  const router = useRouter();
  const { items: menuItems } = useMenu();
  const cart = useCart(tableId, menuItems);
  const table = useTableSession(tableId);
  useThanksWhenStaffConfirms(tableId);
  const [mobileBillOpen, setMobileBillOpen] = useState(false);
  const [queued, setQueued] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [billAskOpen, setBillAskOpen] = useState(false);

  const session = table.isOwner ? table.session : undefined;
  const orderingOpen = Boolean(session && canAddOrders(session));

  useEffect(() => {
    if (table.isOwner) return;
    if (!readPaidVisit(tableId)) return;
    router.replace(`/table/${tableId}/thanks`);
  }, [router, table.isOwner, tableId]);

  function scrollToMenu() {
    setMobileBillOpen(false);
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmit() {
    if (cart.lines.length === 0 || !session) return;
    try {
      table.queueOrder({
        items: cart.lines,
        notes: cart.notes,
      });
      cart.clear();
      setQueued(true);
      setMobileBillOpen(false);
    } catch {
      setMobileBillOpen(true);
    }
  }

  function handleViewBill() {
    if (table.orders.length === 0 || table.sending.length > 0) return;
    setBillAskOpen(true);
  }

  function openFinalBill() {
    setBillAskOpen(false);
    router.push(`/table/${tableId}/pay`);
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

  if (!table.isOwner || !session) {
    return (
      <SessionGate
        tableId={tableId}
        error={table.error}
        mutating={table.mutating}
        onStart={async (input) => {
          await table.startSession(input);
        }}
      />
    );
  }

  const bill = (
    <BillSummary
      lines={cart.lines}
      subtotal={cart.totals.subtotal}
      tax={cart.totals.tax}
      total={cart.totals.total}
      notes={cart.notes}
      onNotesChange={cart.setNotes}
      onSubmit={handleSubmit}
      onAddMore={scrollToMenu}
      submitting={false}
      disabled={cart.lines.length === 0 || !orderingOpen}
      compactActions
    />
  );

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <RestaurantBackdrop overlay="soft" className="fixed inset-0" />
      <div className="relative min-w-0">
      <SiteHeader
        tableId={tableId}
        onExit={() => setExitOpen(true)}
        exitBusy={table.mutating}
      />
      <main
        id="main"
        className={
          orderingOpen
            ? "mx-auto grid w-full min-w-0 max-w-7xl gap-4 px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:pt-6"
            : "mx-auto grid w-full min-w-0 max-w-7xl gap-4 px-4 pb-safe pt-3 sm:gap-5 sm:px-6 sm:pt-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:pt-6"
        }
      >
        <div className="flex min-w-0 flex-col gap-3 sm:gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-espresso/50 sm:text-xs sm:tracking-[0.24em]">
              {session.guestName}
              {session.guestPhone ? ` · ${formatGuestPhone(session.guestPhone)}` : ""} · Table{" "}
              {tableId}
            </p>
            <h1 className="mt-0.5 text-balance font-display text-xl italic leading-tight text-espresso sm:mt-1 sm:text-5xl">
              {orderingOpen ? "Pick dishes, then submit" : "Session locked"}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-5 text-espresso/70 sm:mt-2 sm:leading-6">
              {orderingOpen
                ? "Pick sandwiches, fries, or drinks — combos are on the last tab. Tap Add when ready."
                : "The final bill is open. Scan UPI or pay at the counter. Staff tap Done, then this phone opens thank you."}
            </p>
          </div>

          {queued && table.sending.length > 0 ? (
            <div
              role="status"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-espresso sm:px-4 sm:py-3"
            >
              <p className="font-semibold">Sending to the kitchen…</p>
              <p className="mt-0.5 text-espresso/70">
                It counts as placed only after the kitchen receives it.
              </p>
            </div>
          ) : queued && table.sending.length === 0 && table.orders.length > 0 ? (
            <div
              role="status"
              className="rounded-2xl border border-sage/25 bg-sage/10 px-3 py-2.5 text-sm text-espresso sm:px-4 sm:py-3"
            >
              <p className="font-semibold">Order placed</p>
              <p className="mt-0.5 text-espresso/70">
                The kitchen has it. Add another order or view the final bill.
              </p>
            </div>
          ) : null}

          <SessionOrderTable
            session={session}
            orders={table.orders}
            sending={table.sending}
            totals={table.totals}
            onAddOrder={scrollToMenu}
            onViewBill={handleViewBill}
            canAdd={orderingOpen}
            canBill={orderingOpen && table.orders.length > 0 && table.sending.length === 0}
          />
          {table.error ? <Alert message={table.error} /> : null}
          {orderingOpen ? (
            <MenuBoard
              quantityFor={cart.quantityFor}
              onQuantityChange={cart.setQuantity}
              onAdd={cart.addItem}
            />
          ) : (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleViewBill}
              icon={<Receipt className="size-4" aria-hidden />}
            >
              Open final bill · {formatCurrency(table.totals.total)}
            </Button>
          )}
        </div>

        {orderingOpen ? <div className="hidden lg:block">
          <BillSummary
            lines={cart.lines}
            subtotal={cart.totals.subtotal}
            tax={cart.totals.tax}
            total={cart.totals.total}
            notes={cart.notes}
            onNotesChange={cart.setNotes}
            onSubmit={handleSubmit}
            onAddMore={scrollToMenu}
            submitting={false}
            disabled={cart.lines.length === 0 || !orderingOpen}
          />
        </div> : null}
      </main>

      {orderingOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-espresso/10 bg-cream/95 px-safe pt-2.5 backdrop-blur pb-safe lg:hidden">
          {mobileBillOpen ? <div className="mb-2.5 max-h-[38dvh] overflow-y-auto overscroll-contain">{bill}</div> : null}

          {cart.itemCount > 0 ? (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
              <button
                type="button"
                className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-full border border-espresso/15 bg-white px-3 text-sm font-semibold text-espresso"
                onClick={() => {
                  if (mobileBillOpen) scrollToMenu();
                  else setMobileBillOpen(true);
                }}
                aria-expanded={mobileBillOpen}
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                <span className="truncate">
                  {mobileBillOpen ? "Menu" : `${cart.itemCount} · ${formatCurrency(cart.totals.total)}`}
                </span>
              </button>
              <Button
                type="button"
                size="bar"
                className="w-full"
                onClick={handleSubmit}
                disabled={cart.lines.length === 0}
                icon={<Send className="size-4" aria-hidden />}
              >
                Submit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="dark"
                size="bar"
                className="w-full"
                onClick={scrollToMenu}
                icon={<Plus className="size-4" aria-hidden />}
              >
                Add order
              </Button>
              <Button
                type="button"
                variant="primary"
                size="bar"
                className="w-full"
                onClick={handleViewBill}
                disabled={table.orders.length === 0 || table.sending.length > 0 || table.mutating}
                loading={table.mutating}
                icon={<Receipt className="size-4" aria-hidden />}
              >
                Final bill
              </Button>
            </div>
          )}
        </div>
      ) : null}
      {billAskOpen && session ? (
        <ViewBillDialog
          guestName={session.guestName}
          tableId={tableId}
          total={table.totals.total}
          onStay={() => setBillAskOpen(false)}
          onOpenBill={openFinalBill}
        />
      ) : null}
      {exitOpen && session ? (
        <ExitSessionDialog
          guestName={session.guestName}
          tableId={tableId}
          hasOrders={table.orders.length > 0 || table.sending.length > 0}
          unpaid={table.orders.some((order) => order.status !== "paid")}
          busy={table.mutating}
          onCancel={() => setExitOpen(false)}
          onConfirm={async () => {
            const paid = session.status === "paid";
            if (paid) {
              savePaidVisit({
                tableId,
                sessionId: session.id,
                guestName: session.guestName,
                total: table.totals.total,
              });
            }
            await table.exitSession();
            setExitOpen(false);
            if (paid) router.replace(`/table/${tableId}/thanks`);
          }}
        />
      ) : null}
      </div>
    </div>
  );
}
