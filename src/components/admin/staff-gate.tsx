"use client";

import type { ReactNode } from "react";
import { StaffLogin } from "@/components/admin/staff-login";
import { useStaffStore } from "@/store/staff-store";

export function StaffGate({ children }: { children: ReactNode }) {
  const token = useStaffStore((state) => state.token);
  if (!token) return <StaffLogin />;
  return children;
}
