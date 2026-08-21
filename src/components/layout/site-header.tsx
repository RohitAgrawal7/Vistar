"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChefHat, LogOut, QrCode } from "lucide-react";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";
import { orderService } from "@/lib/api";
import { useStaffStore } from "@/store/staff-store";

export function SiteHeader({
  tableId,
  onExit,
  exitBusy = false,
  backHref,
  backLabel = "Back",
}: {
  tableId?: string;
  onExit?: () => void;
  exitBusy?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const staffName = useStaffStore((state) => state.staffName);
  const staffToken = useStaffStore((state) => state.token);
  const logout = useStaffStore((state) => state.logout);

  async function signOut() {
    try {
      await orderService.staffLogout();
    } catch {
      /* still clear local staff session */
    }
    logout();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-espresso/8 bg-cream/80 pt-safe backdrop-blur-md">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl min-w-0 items-center justify-between gap-2 overflow-hidden px-3 sm:min-h-16 sm:px-6">
        <Link href={tableId ? `/table/${tableId}` : "/"} className="group flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLogo
            variant="light"
            size={40}
            className="size-9 shrink-0 rounded-full bg-cream ring-1 ring-espresso/10 sm:size-10"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-base italic text-espresso sm:text-xl">
              {appConfig.restaurantName}
            </span>
            <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-espresso/55 sm:text-[11px] sm:tracking-[0.22em]">
              {tableId ? `Table ${tableId}` : "Kitchen & table"}
            </span>
          </span>
        </Link>

        {tableId ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-espresso/12 bg-white px-2.5 text-xs font-semibold uppercase tracking-wider text-espresso hover:border-terracotta/40 sm:gap-1.5 sm:px-3"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {backLabel}
              </Link>
            ) : null}
            {onExit ? (
              <button
                type="button"
                onClick={onExit}
                disabled={exitBusy}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-espresso/12 bg-white px-2.5 text-xs font-semibold uppercase tracking-wider text-espresso hover:border-terracotta/40 sm:gap-1.5 sm:px-3"
              >
                <LogOut className="size-3.5" aria-hidden />
                Exit
              </button>
            ) : null}
            <p className="hidden rounded-full bg-espresso px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cream sm:inline-flex">
              Table {tableId}
            </p>
          </div>
        ) : (
          <nav aria-label="Primary" className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/admin/tables"
              className={cn(
                "inline-flex size-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors sm:size-auto sm:px-3 sm:py-2",
                pathname.startsWith("/admin/tables")
                  ? "bg-espresso text-cream"
                  : "text-espresso/70 hover:bg-espresso/5 hover:text-espresso",
              )}
              aria-label="Table QR codes"
            >
              <QrCode className="size-4" aria-hidden />
              <span className="hidden sm:inline">QR</span>
            </Link>
            <Link
              href="/admin"
              className={cn(
                "inline-flex size-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors sm:size-auto sm:px-3 sm:py-2",
                isAdmin && !pathname.startsWith("/admin/tables")
                  ? "bg-espresso text-cream"
                  : "text-espresso/70 hover:bg-espresso/5 hover:text-espresso",
              )}
              aria-label="Kitchen dashboard"
            >
              <ChefHat className="size-4" aria-hidden />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            {isAdmin && staffToken ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex size-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-espresso/70 transition-colors hover:bg-espresso/5 hover:text-espresso sm:size-auto sm:px-3 sm:py-2"
                aria-label="Sign out"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">{staffName || "Sign out"}</span>
              </button>
            ) : null}
          </nav>
        )}
      </div>
    </header>
  );
}
