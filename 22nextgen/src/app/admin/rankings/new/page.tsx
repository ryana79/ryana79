import { requireCapability } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { RankingForm } from "@/components/admin/ranking-form";

export default async function NewRankingPage() {
  await requireCapability("rankings.manage");
  return (
    <div>
      <AdminPageHeader title="New ranking" backHref="/admin/rankings" />
      <RankingForm rankingId={null} initial={{ title: "", slug: "", description: "", criteria: "", graduation_year: "", position: "", region: "" }} initialEntries={[]} />
    </div>
  );
}
