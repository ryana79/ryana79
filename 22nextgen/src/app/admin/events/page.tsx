import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Pagination, SearchBar, StatusBadge, adminBtn, parsePage, safeTerm } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { setEventStatus, deleteEvent } from "@/lib/actions/admin/events";
import { formatEventDate, formatCents } from "@/lib/format";
import { can } from "@/lib/permissions";
import { typeLabel } from "@/lib/event-utils";

const PAGE_SIZE = 15;
type SP = Promise<{ q?: string; status?: string; page?: string }>;

export default async function AdminEventsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireCapability("events.manage");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  let q = supabase.from("events").select("id, slug, title, event_type, event_date, status, registration_status, price_cents, jotform_form_id, jotform_url", { count: "exact" }).order("event_date", { ascending: false, nullsFirst: true });
  const term = safeTerm(sp.q);
  if (term) q = q.or(`title.ilike.%${term}%,slug.ilike.%${term}%,city.ilike.%${term}%`);
  if (sp.status && ["draft", "published", "archived"].includes(sp.status)) q = q.eq("status", sp.status);
  const { data, count, error } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = data ?? [];

  return (
    <div>
      <AdminPageHeader title="Events" description="Create, edit, publish and archive events. Changes appear on the public site immediately." actions={<Link href="/admin/events/new" className={adminBtn.primary}><Plus className="size-4" />New event</Link>} />
      <SearchBar action="/admin/events" q={sp.q} placeholder="Search title, slug or city">
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field h-10 w-auto"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
      </SearchBar>
      {error ? <p role="alert" className="mb-4 text-sm text-red-300">Could not load events.</p> : null}
      <DataTable
        caption="Events"
        rows={rows}
        empty={<>No events yet. <Link className="text-brand underline" href="/admin/events/new">Create the first event</Link>.</>}
        columns={[
          { header: "Event", cell: (e) => <div><Link href={`/admin/events/${e.id}`} className="font-medium hover:text-brand">{e.title}</Link><div className="text-xs text-white/40">/events/{e.slug}</div></div> },
          { header: "Type", cell: (e) => typeLabel(e.event_type) },
          { header: "Date", cell: (e) => formatEventDate(e.event_date, "short") },
          { header: "Price", cell: (e) => formatCents(e.price_cents) ?? "—" },
          { header: "Jotform", cell: (e) => (e.jotform_form_id || e.jotform_url ? <span className="text-emerald-300">Connected</span> : <span className="text-white/40">None</span>) },
          { header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
          {
            header: "Actions",
            className: "text-right",
            cell: (e) => (
              <div className="flex justify-end gap-2">
                <Link href={`/admin/events/${e.id}`} className={adminBtn.secondary}>Edit</Link>
                {e.status === "published" ? <ActionButton label="Unpublish" action={setEventStatus.bind(null, e.id, "draft")} confirm={{ title: "Unpublish event?", description: "It will disappear from the public site until published again." }} /> : <ActionButton label="Publish" variant="primary" action={setEventStatus.bind(null, e.id, "published")} successMessage="Event published" />}
                {e.status !== "archived" ? <ActionButton label="Archive" action={setEventStatus.bind(null, e.id, "archived")} confirm={{ title: "Archive event?", description: "Archived events leave public listings but keep registrations and results." }} /> : null}
                {can(user.roles, "athletes.manage") ? <ActionButton label="Delete" variant="danger" action={deleteEvent.bind(null, e.id)} confirm={{ title: "Delete event permanently?", description: "This cannot be undone. Events with registrations or results cannot be deleted; archive them instead.", confirmLabel: "Delete event" }} /> : null}
              </div>
            ),
          },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/events" params={{ q: sp.q, status: sp.status }} />
    </div>
  );
}
