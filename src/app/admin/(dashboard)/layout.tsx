import { AdminGate } from "@/components/admin/admin-gate";

// All /admin/* routes except /admin/login are gated: unauthenticated or
// non-allow-listed users are redirected to /admin/login.
export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGate>{children}</AdminGate>;
}
