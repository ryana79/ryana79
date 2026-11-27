import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, StatusBadge, adminBtn } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { deleteRanking, setRankingStatus } from "@/lib/actions/admin/rankings";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminRankingsPage() {
  await requireCapability("rankings.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("rankings").select("id, title, slug, status, graduation_year, position, published_at, ranking_entries(count)").order("updated_at", { ascending: false });
  return (
    <div>
      <AdminPageHeader title="Rankings" description="Editorial rankings, separate from combine metrics. Publishing records admin approval." actions={<Link href="/admin/rankings/new" className={adminBtn.primary}><Plus className="size-4" />New ranking</Link>} />
      <DataTable
        caption="Rankings"
        rows={data ?? []}
        empty={<>No rankings yet. <Link className="text-brand underline" href="/admin/rankings/new">Create one</Link>.</>}
        columns={[
          { header: "Ranking", cell: (r) => <Link href={`/admin/rankings/${r.id}`} className="font-medium hover:text-brand">{r.title}</Link> },
          { header: "Scope", cell: (r) => [r.graduation_year ? `Class ${r.graduation_year}` : null, r.position].filter(Boolean).join(" · ") || "All" },
          { header: "Athletes", cell: (r) => (r.ranking_entries as unknown as { count: number }[])?.[0]?.count ?? 0 },
          { header: "Published", cell: (r) => (r.published_at ? formatPublishedDate(r.published_at) : "—") },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "Actions", className: "text-right", cell: (r) => (
            <div className="flex justify-end gap-2">
              <Link href={`/admin/rankings/${r.id}`} className={adminBtn.secondary}>Edit</Link>
              {r.status === "published" ? <ActionButton label="Unpublish" action={setRankingStatus.bind(null, r.id, "draft")} /> : <ActionButton label="Approve & publish" variant="primary" action={setRankingStatus.bind(null, r.id, "published")} confirm={{ title: "Approve and publish this ranking?", description: "Your approval is recorded and the ranking becomes public." }} />}
              <ActionButton label="Delete" variant="danger" action={deleteRanking.bind(null, r.id)} confirm={{ title: "Delete ranking?", description: "This permanently deletes the ranking and its entries.", confirmLabel: "Delete" }} />
            </div>
          ) },
        ]}
      />
    </div>
  );
}
