import { requireCapability } from "@/lib/auth";
import { AdminPageHeader, Notice, Panel } from "@/components/admin/ui";
import { LeadImport } from "@/components/admin/lead-import";

export const dynamic = "force-dynamic";

export default async function LeadImportPage() {
  await requireCapability("registrations.view");
  return (
    <div>
      <AdminPageHeader backHref="/admin/leads" title="Import Turkey Bowl 2026" description="Upload the Jotform registration export. Only the parent columns you map are saved." />
      <div className="mb-4">
        <Notice tone="amber" title="Parent contact details only">Marketing permission is saved only when a mapped column explicitly says yes or no. Otherwise it stays unknown, and unknown contacts are left out of the marketing send list. Event interests stay blank until a parent chooses an event. Running this again updates matching emails and does not create duplicates.</Notice>
      </div>
      <Panel>
        <LeadImport />
      </Panel>
    </div>
  );
}
