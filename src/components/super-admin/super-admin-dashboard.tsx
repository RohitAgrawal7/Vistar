"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { SuperAdminMenuEditor } from "@/components/super-admin/super-admin-menu-editor";
import { SuperAdminTableQr } from "@/components/super-admin/super-admin-table-qr";
import { orderService } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useSuperAdminStore } from "@/store/super-admin-store";

type Tab = "menu" | "qr";

export function SuperAdminDashboard() {
  const staffName = useSuperAdminStore((state) => state.staffName);
  const logoutStore = useSuperAdminStore((state) => state.logout);
  const [tab, setTab] = useState<Tab>("menu");

  async function onLogout() {
    try {
      await orderService.superAdminLogout();
    } catch {
      // still clear local session
    }
    logoutStore();
  }

  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 pb-safe sm:gap-8 sm:px-6 sm:py-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-espresso/50">Control room</p>
            <h1 className="mt-1 font-display text-3xl italic text-espresso sm:text-4xl">
              Super admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/70">
              Signed in as {staffName}. Edit the menu, add table numbers, and generate QR codes for
              each table. Kitchen staff cannot change these.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onLogout()}
            icon={<LogOut className="size-4" aria-hidden />}
          >
            Sign out
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          {(
            [
              ["menu", "Menu"],
              ["qr", "Table QR"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold uppercase tracking-wider",
                tab === id
                  ? "bg-espresso text-cream"
                  : "border border-espresso/12 bg-white text-espresso/70",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "menu" ? <SuperAdminMenuEditor embedded /> : <SuperAdminTableQr canManage />}
      </main>
    </div>
  );
}
