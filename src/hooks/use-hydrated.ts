"use client";

import { useEffect, useState } from "react";
import { isRemoteApiEnabled } from "@/lib/config";
import { getSeedFloor } from "@/lib/seed";
import { useCartStore, CART_STORAGE_KEY } from "@/store/cart-store";
import { useGuestStore } from "@/store/guest-store";
import { FLOOR_STORAGE_KEY, pullFloorFromStorage, useOrderStore } from "@/store/order-store";
import { STAFF_STORAGE_KEY, useStaffStore } from "@/store/staff-store";
import {
  SUPER_ADMIN_STORAGE_KEY,
  useSuperAdminStore,
} from "@/store/super-admin-store";
import { OUTBOX_STORAGE_KEY, useOutboxStore } from "@/store/outbox-store";

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([
      useOrderStore.persist.rehydrate(),
      useCartStore.persist.rehydrate(),
      useGuestStore.persist.rehydrate(),
      useStaffStore.persist.rehydrate(),
      useSuperAdminStore.persist.rehydrate(),
      useOutboxStore.persist.rehydrate(),
    ]).then(() => {
      const state = useOrderStore.getState();
      if (isRemoteApiEnabled()) {
        useOrderStore.setState({
          sessions: [],
          orders: [],
          auditLog: [],
          resumeGrants: [],
          hasSeededDemo: true,
        });
      } else if (!state.hasSeededDemo) {
        const seed = getSeedFloor();
        useOrderStore.setState({
          sessions: seed.sessions,
          orders: seed.orders,
          hasSeededDemo: true,
        });
      }
      setHydrated(true);
    });

    const onStorage = (event: StorageEvent) => {
      // Remote café floor is API-owned — never let another tab wipe admin/guest UI.
      if (event.key === FLOOR_STORAGE_KEY && !isRemoteApiEnabled()) {
        pullFloorFromStorage();
      }
      if (event.key === CART_STORAGE_KEY) {
        void useCartStore.persist.rehydrate();
      }
      if (event.key === "vistar-guest-v2") {
        void useGuestStore.persist.rehydrate();
      }
      if (event.key === STAFF_STORAGE_KEY) {
        void useStaffStore.persist.rehydrate();
      }
      if (event.key === SUPER_ADMIN_STORAGE_KEY) {
        void useSuperAdminStore.persist.rehydrate();
      }
      if (event.key === OUTBOX_STORAGE_KEY) {
        void useOutboxStore.persist.rehydrate();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return hydrated;
}
