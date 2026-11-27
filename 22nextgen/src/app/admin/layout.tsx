import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | 22 NEXT GEN Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCapability("dashboard.view");
  return <AdminShell email={user.email} roles={user.roles}>{children}</AdminShell>;
}
