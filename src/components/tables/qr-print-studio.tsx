"use client";

import { SuperAdminTableQr } from "@/components/super-admin/super-admin-table-qr";

/** Kitchen /admin/tables — add table numbers + print QR (same as super admin). */
export function QrPrintStudio() {
  return <SuperAdminTableQr canManage />;
}
