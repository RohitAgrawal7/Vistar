"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GuestClaim {
  sessionId: string;
  token: string;
}

interface GuestState {
  claimsByTable: Record<string, GuestClaim>;
  claim: (tableId: string, claim: GuestClaim) => void;
  release: (tableId: string) => void;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set, get) => ({
      claimsByTable: {},
      claim: (tableId, claim) => {
        set({
          claimsByTable: {
            ...get().claimsByTable,
            [tableId]: claim,
          },
        });
      },
      release: (tableId) => {
        const claimsByTable = { ...get().claimsByTable };
        delete claimsByTable[tableId];
        set({ claimsByTable });
      },
    }),
    {
      name: "vistar-guest-v2",
      skipHydration: true,
    },
  ),
);
