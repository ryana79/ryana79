import { requireCapability } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { SponsorForm, EMPTY_SPONSOR } from "@/components/admin/sponsor-form";

export default async function NewSponsorPage() {
  await requireCapability("sponsors.manage");
  return (
    <div>
      <AdminPageHeader title="Add sponsor" backHref="/admin/sponsors" />
      <SponsorForm sponsorId={null} initial={EMPTY_SPONSOR} />
    </div>
  );
}
