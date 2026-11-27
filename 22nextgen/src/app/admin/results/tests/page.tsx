import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Panel, StatusBadge } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { TestTypeForm } from "@/components/admin/test-type-form";
import { setTestTypeActive } from "@/lib/actions/admin/results";

export const dynamic = "force-dynamic";

export default async function TestTypesPage() {
  await requireCapability("results.verify");
  const supabase = await createClient();
  const { data } = await supabase.from("combine_test_types").select("*").order("sort_order").order("name");
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Test types" backHref="/admin/results" description="Built-in tests cannot be deleted. Add custom tests with plausible ranges so bad data is rejected." />
      <Panel title="Tests">
        <DataTable
          caption="Test types"
          rows={data ?? []}
          empty="No tests."
          columns={[
            { header: "Name", cell: (t) => <div><p className="font-medium">{t.name}</p><p className="text-xs text-white/40">{t.slug}</p></div> },
            { header: "Unit", cell: (t) => t.unit },
            { header: "Better", cell: (t) => (t.direction === "lower_is_better" ? "Lower" : "Higher") },
            { header: "Range", cell: (t) => `${t.min_value}–${t.max_value}` },
            { header: "Kind", cell: (t) => (t.is_builtin ? "Built-in" : "Custom") },
            { header: "Status", cell: (t) => <StatusBadge status={t.active ? "active" : "inactive"} /> },
            { header: "Actions", className: "text-right", cell: (t) => <ActionButton label={t.active ? "Deactivate" : "Activate"} action={setTestTypeActive.bind(null, t.id, !t.active)} /> },
          ]}
        />
      </Panel>
      <Panel title="Add custom test"><TestTypeForm /></Panel>
    </div>
  );
}
