import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { RankingForm } from "@/components/admin/ranking-form";
import { athleteName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditRankingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("rankings.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase.from("rankings").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: entries } = await supabase.from("ranking_entries").select("athlete_id, note, rank, athletes(first_name, last_name, display_name, graduation_year, team, public_visibility)").eq("ranking_id", id).order("rank");
  return (
    <div>
      <AdminPageHeader title={r.title} backHref="/admin/rankings" actions={<StatusBadge status={r.status} />} />
      <RankingForm
        rankingId={id}
        initial={{ title: r.title, slug: r.slug, description: r.description ?? "", criteria: r.criteria, graduation_year: r.graduation_year?.toString() ?? "", position: r.position ?? "", region: r.region ?? "" }}
        initialEntries={(entries ?? []).map((e) => {
          const a = e.athletes as unknown as { first_name: string; last_name: string; display_name: string | null; graduation_year: number | null; team: string | null; public_visibility: boolean };
          return { athlete_id: e.athlete_id, note: e.note ?? "", label: `${athleteName(a)}${a.graduation_year ? ` · ${a.graduation_year}` : ""}${a.team ? ` · ${a.team}` : ""}`, isPublic: a.public_visibility };
        })}
      />
    </div>
  );
}
