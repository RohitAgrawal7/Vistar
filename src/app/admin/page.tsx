import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen dashboard",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
