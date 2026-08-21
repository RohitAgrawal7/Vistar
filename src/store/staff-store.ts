"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const STAFF_STORAGE_KEY = "vistar-staff-v1";

interface StaffState {
  token: string;
  staffName: string;
  login: (input: { token: string; staffName: string }) => void;
  logout: () => void;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      token: "",
      staffName: "",
      login: ({ token, staffName }) => set({ token, staffName }),
      logout: () => set({ token: "", staffName: "" }),
    }),
    {
      name: STAFF_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

export function getStaffToken() {
  return useStaffStore.getState().token;
}

export function getStaffName() {
  return useStaffStore.getState().staffName;
}
