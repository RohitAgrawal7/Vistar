"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isKitchenAudioUnlocked,
  playKitchenChime,
  unlockKitchenAudio,
} from "@/lib/kitchen-chimes";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "vistar-kitchen-sounds-v1";

export function useKitchenSoundPreference() {
  const [enabled, setEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "on");
    } catch {
      setEnabled(false);
    }
    setUnlocked(isKitchenAudioUnlocked());
  }, []);

  async function enable() {
    const ok = await unlockKitchenAudio();
    setUnlocked(ok);
    if (!ok) return false;
    setEnabled(true);
    try {
      localStorage.setItem(STORAGE_KEY, "on");
    } catch {
      /* ignore */
    }
    await playKitchenChime("new_order");
    return true;
  }

  function disable() {
    setEnabled(false);
    try {
      localStorage.setItem(STORAGE_KEY, "off");
    } catch {
      /* ignore */
    }
  }

  async function testUpdate() {
    await unlockKitchenAudio();
    await playKitchenChime("order_update");
  }

  return { enabled, unlocked, enable, disable, testUpdate };
}

export function KitchenSoundToggle({
  enabled,
  onEnable,
  onDisable,
  onTestUpdate,
}: {
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onTestUpdate: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
        enabled
          ? "border-terracotta/30 bg-terracotta/10 text-espresso"
          : "border-espresso/15 bg-white text-espresso/80",
      )}
    >
      {enabled ? (
        <Bell className="size-4 shrink-0 text-terracotta" aria-hidden />
      ) : (
        <BellOff className="size-4 shrink-0 text-espresso/45" aria-hidden />
      )}
      <span className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
        {enabled
          ? "Kitchen sounds on — new ticket vs status update use different rings."
          : "Turn on kitchen sounds (required once — browsers block audio until you tap)."}
      </span>
      {enabled ? (
        <>
          <Button type="button" size="sm" variant="secondary" onClick={onTestUpdate}>
            <Volume2 className="size-3.5" aria-hidden />
            Test update
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDisable}>
            Mute
          </Button>
        </>
      ) : (
        <Button type="button" size="sm" onClick={onEnable}>
          Enable sounds
        </Button>
      )}
    </div>
  );
}
