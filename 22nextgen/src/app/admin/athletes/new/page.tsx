import { requireCapability } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { AthleteForm, EMPTY_ATHLETE } from "@/components/admin/athlete-form";

export default async function NewAthletePage() {
  await requireCapability("athletes.manage");
  return (
    <div>
      <AdminPageHeader title="Add athlete" backHref="/admin/athletes" description="New athletes start as private drafts. Record guardian consent and approve to publish." />
      <AthleteForm athleteId={null} initial={EMPTY_ATHLETE} />
    </div>
  );
}
