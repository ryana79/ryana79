import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Notice, StatusBadge } from "@/components/admin/ui";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MembershipsPage() {
  await requireCapability("memberships.view");
  const supabase = await createClient();
  const { data } = await supabase.from("memberships").select("id, plan, status, current_period_end, created_at, athletes(first_name, last_name)").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Memberships" description="NEXT GEN+ subscriber records." />
      <Notice tone="amber" title="Billing is not connected">The membership data model is ready for Stripe (customer, subscription and period fields), but no checkout or webhook is implemented. No one can be charged and no membership rows are created automatically. The displayed price and benefits are edited under Site content.</Notice>
      <DataTable
        caption="Memberships"
        rows={data ?? []}
        empty="No memberships yet."
        columns={[
          { header: "Plan", cell: (m) => m.plan },
          { header: "Athlete", cell: (m) => { const a = m.athletes as unknown as { first_name: string; last_name: string } | null; return a ? `${a.first_name} ${a.last_name}` : "—"; } },
          { header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
          { header: "Renews", cell: (m) => (m.current_period_end ? formatPublishedDate(m.current_period_end) : "—") },
          { header: "Created", cell: (m) => formatPublishedDate(m.created_at) },
        ]}
      />
    </div>
  );
}
