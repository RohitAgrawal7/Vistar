"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const SUPER_ADMIN_STORAGE_KEY = "vistar-super-admin-v1";

interface SuperAdminState {
  token: string;
  staffName: string;
  login: (input: { token: string; staffName: string }) => void;
  logout: () => void;
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      token: "",
      staffName: "",
      login: ({ token, staffName }) => set({ token, staffName }),
      logout: () => set({ token: "", staffName: "" }),
    }),
    {
      name: SUPER_ADMIN_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

export function getSuperAdminToken() {
  return useSuperAdminStore.getState().token;
}

export function getSuperAdminName() {
  return useSuperAdminStore.getState().staffName;
}
