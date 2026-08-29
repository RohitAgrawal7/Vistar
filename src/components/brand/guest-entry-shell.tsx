"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { RestaurantBackdrop } from "@/components/brand/restaurant-backdrop";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";
import { safeSessionGet, safeSessionSet } from "@/lib/safe-storage";

const ENTRY_STORAGE_PREFIX = "vistar-entry-seen:";

type Phase = "splash" | "welcome";

export function GuestEntryShell({
  entryKey,
  kicker,
  title = appConfig.welcomeMessage,
  subtitle = appConfig.welcomeBody,
  skipIntro = false,
  wide = false,
  children,
}: {
  entryKey: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  skipIntro?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>(skipIntro ? "welcome" : "splash");
  const [showForm, setShowForm] = useState(skipIntro);

  useEffect(() => {
    if (skipIntro) return;
    const storageKey = `${ENTRY_STORAGE_PREFIX}${entryKey}`;
    const seen = safeSessionGet(storageKey) === "1";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = seen || reduceMotion ? 0 : appConfig.splashMs;

    const splash = window.setTimeout(() => {
      setPhase("welcome");
      safeSessionSet(storageKey, "1");
    }, delay);
    const form = window.setTimeout(
      () => setShowForm(true),
      delay + (seen || reduceMotion ? 0 : 480),
    );
    return () => {
      window.clearTimeout(splash);
      window.clearTimeout(form);
    };
  }, [entryKey, skipIntro]);

  return (
    <div className="relative min-h-dvh overflow-x-clip overflow-y-auto text-cream">
      <RestaurantBackdrop />
      {phase === "splash" ? (
        <div className="relative z-10 grid min-h-dvh place-items-center px-6">
          <div className="flex flex-col items-center text-center animate-[vistar-scale-in_700ms_ease-out]">
            <BrandLogo
              variant="dark"
              size={220}
              priority
              className="h-auto w-[min(13.75rem,72vw)] drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
            />
            <p className="mt-6 px-2 text-center text-[11px] uppercase tracking-[0.28em] text-gold-light/80 sm:text-xs sm:tracking-[0.32em]">
              {appConfig.tagline}
            </p>
          </div>
        </div>
      ) : (
        <main
          id="main"
          className={cn(
            "relative z-10 mx-auto flex min-h-dvh w-full flex-col justify-end px-4 pb-safe pt-14 sm:justify-center sm:py-12",
            wide ? "max-w-4xl" : "max-w-md",
          )}
        >
          <div className="animate-[vistar-fade-up_500ms_ease-out]">
            <div className="mb-4 flex justify-center sm:mb-5">
              <BrandLogo
                variant="dark"
                size={128}
                priority
                className="h-auto w-[min(7.5rem,42vw)] drop-shadow-[0_12px_28px_rgba(0,0,0,0.5)] sm:w-32"
              />
            </div>
            <p className="text-center text-[11px] uppercase tracking-[0.24em] text-gold-light/85 sm:text-xs sm:tracking-[0.28em]">
              {kicker ?? appConfig.tagline}
            </p>
            <h1 className="mt-2 text-balance text-center font-display text-3xl italic leading-tight text-cream sm:text-5xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-center text-sm leading-6 text-cream/75">
              {subtitle}
            </p>
          </div>
          <div
            className={cn(
              "mt-6 transition-all duration-500",
              showForm ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
            )}
          >
            {children}
          </div>
        </main>
      )}
    </div>
  );
}
