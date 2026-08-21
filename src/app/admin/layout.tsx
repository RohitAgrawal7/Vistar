import { StaffGate } from "@/components/admin/staff-gate";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <StaffGate>{children}</StaffGate>;
}
