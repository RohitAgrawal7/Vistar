"use client";

import { OutboxProcessor } from "@/hooks/use-outbox";
import { useHydrated } from "@/hooks/use-hydrated";
import { BrandLogo } from "@/components/brand/brand-logo";
import { RestaurantBackdrop } from "@/components/brand/restaurant-backdrop";
import { appConfig } from "@/lib/config";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#120b08]">
        <RestaurantBackdrop />
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <BrandLogo
            variant="dark"
            size={180}
            priority
            className="h-auto w-[min(11.25rem,70vw)] drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          />
          <p className="mt-5 text-xs uppercase tracking-[0.32em] text-gold-light/80">
            {appConfig.tagline}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OutboxProcessor />
      {children}
    </>
  );
}
