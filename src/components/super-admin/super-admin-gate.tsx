"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SuperAdminLogin } from "@/components/super-admin/super-admin-login";
import { useSuperAdminStore } from "@/store/super-admin-store";

export function SuperAdminGate({ children }: { children: ReactNode }) {
  const token = useSuperAdminStore((state) => state.token);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const result = useSuperAdminStore.persist.rehydrate();
    void Promise.resolve(result).finally(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream text-sm text-espresso/60">
        Loading…
      </div>
    );
  }
  if (!token) return <SuperAdminLogin />;
  return children;
}
