import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, StatusBadge, adminBtn } from "@/components/admin/ui";
import { EventForm } from "@/components/admin/event-form";
import { ActionButton } from "@/components/admin/action-button";
import { setEventStatus } from "@/lib/actions/admin/events";
import { eventToFormValues } from "@/lib/events/mapper";
import type { EventRow } from "@/lib/types";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("events.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) notFound();
  const [{ data: staff }, { data: links }, { data: sponsors }] = await Promise.all([
    supabase.from("event_staff").select("*").eq("event_id", id).order("sort_order"),
    supabase.from("event_sponsors").select("sponsor_id").eq("event_id", id),
    supabase.from("sponsors").select("id, name").order("name"),
  ]);
  const e = event as EventRow;
  const initial = {
    ...eventToFormValues(e),
    staff: (staff ?? []).map((s) => ({ name: s.name, role_title: s.role_title ?? "", bio: s.bio ?? "", image_path: s.image_path ?? "" })),
    sponsor_ids: (links ?? []).map((l) => l.sponsor_id),
  };
  return (
    <div>
      <AdminPageHeader
        title={e.title}
        backHref="/admin/events"
        description={`/events/${e.slug}`}
        actions={
          <>
            <StatusBadge status={e.status} />
            {e.status === "published" ? <Link href={`/events/${e.slug}`} target="_blank" className={adminBtn.secondary}><ExternalLink className="size-4" />View live</Link> : null}
            {e.status === "published" ? <ActionButton label="Unpublish" action={setEventStatus.bind(null, id, "draft")} confirm={{ title: "Unpublish event?", description: "It will disappear from the public site." }} /> : <ActionButton label="Publish" variant="primary" action={setEventStatus.bind(null, id, "published")} />}
            {e.status !== "archived" ? <ActionButton label="Archive" action={setEventStatus.bind(null, id, "archived")} confirm={{ title: "Archive event?", description: "It will leave public listings but keep registrations and results." }} /> : null}
          </>
        }
      />
      <EventForm eventId={id} initial={initial} sponsors={sponsors ?? []} status={e.status} />
    </div>
  );
}
