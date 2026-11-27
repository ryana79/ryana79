import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { EventForm, EMPTY_EVENT } from "@/components/admin/event-form";

export default async function NewEventPage() {
  await requireCapability("events.manage");
  const supabase = await createClient();
  const { data: sponsors } = await supabase.from("sponsors").select("id, name").order("name");
  return (
    <div>
      <AdminPageHeader title="New event" backHref="/admin/events" description="Start as a draft. Nothing is public until you publish." />
      <EventForm eventId={null} initial={EMPTY_EVENT} sponsors={sponsors ?? []} />
    </div>
  );
}
