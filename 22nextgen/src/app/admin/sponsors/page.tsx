import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, StatusBadge, adminBtn } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { deleteSponsor, setSponsorActive } from "@/lib/actions/admin/sponsors";
import { MediaImage } from "@/components/site/media";
import { SPONSOR_TIERS, labelFor } from "@/lib/site";

export default async function AdminSponsorsPage() {
  await requireCapability("sponsors.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("sponsors").select("id, name, tier, logo_path, active, featured, website_url, sort_order").order("sort_order").order("name");
  return (
    <div>
      <AdminPageHeader title="Sponsors" description="Add, edit and remove sponsors and partners. Active sponsors appear on the homepage and Partners page." actions={<Link href="/admin/sponsors/new" className={adminBtn.primary}><Plus className="size-4" />Add sponsor</Link>} />
      <DataTable
        caption="Sponsors"
        rows={data ?? []}
        empty={<>No sponsors yet. <Link href="/admin/sponsors/new" className="text-brand underline">Add the first sponsor</Link>.</>}
        columns={[
          { header: "Sponsor", cell: (s) => <div className="flex items-center gap-3"><div className="relative size-10 shrink-0 overflow-hidden rounded bg-white/5">{s.logo_path ? <MediaImage path={s.logo_path} alt="" sizes="40px" className="object-contain p-1" /> : null}</div><Link href={`/admin/sponsors/${s.id}`} className="font-medium hover:text-brand">{s.name}</Link></div> },
          { header: "Tier", cell: (s) => labelFor(SPONSOR_TIERS, s.tier) },
          { header: "Featured", cell: (s) => (s.featured ? "Yes" : "—") },
          { header: "Status", cell: (s) => <StatusBadge status={s.active ? "active" : "inactive"} /> },
          { header: "Actions", className: "text-right", cell: (s) => (
            <div className="flex justify-end gap-2">
              <Link href={`/admin/sponsors/${s.id}`} className={adminBtn.secondary}>Edit</Link>
              <ActionButton label={s.active ? "Deactivate" : "Activate"} action={setSponsorActive.bind(null, s.id, !s.active)} />
              <ActionButton label="Remove" variant="danger" action={deleteSponsor.bind(null, s.id)} confirm={{ title: `Remove ${s.name}?`, description: "This permanently removes the sponsor and unlinks it from events.", confirmLabel: "Remove sponsor" }} />
            </div>
          ) },
        ]}
      />
    </div>
  );
}
