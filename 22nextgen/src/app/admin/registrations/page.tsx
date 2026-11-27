import Link from "next/link";
import { Download } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Notice, Pagination, StatusBadge, adminBtn, parsePage } from "@/components/admin/ui";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<{ event?: string; review?: string; payment?: string; page?: string }> }) {
  await requireCapability("registrations.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  let q = supabase.from("event_registrations").select("id, participant_first_name, participant_last_name, graduation_year, parent_email, payment_status, status, review_status, candidate_athlete_ids, created_at, events(title)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.event && /^[0-9a-f-]{36}$/i.test(sp.event)) q = q.eq("event_id", sp.event);
  if (sp.review && ["needs_review", "linked", "new_athlete", "ignored"].includes(sp.review)) q = q.eq("review_status", sp.review);
  if (sp.payment && ["unverified", "verified", "unpaid", "refunded", "not_applicable"].includes(sp.payment)) q = q.eq("payment_status", sp.payment);
  const [{ data, count }, events, { count: pending }] = await Promise.all([
    q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("events").select("id, title").order("event_date", { ascending: false, nullsFirst: true }).limit(200),
    supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("review_status", "needs_review"),
  ]);
  const exportHref = `/api/admin/export/registrations${sp.event ? `?event=${encodeURIComponent(sp.event)}` : ""}`;
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Registrations" description="Registrations arrive from Jotform webhooks. Contact details are private to admins." actions={<a href={exportHref} className={adminBtn.secondary}><Download className="size-4" />Export CSV</a>} />
      {pending ? <Notice tone="amber" title={`${pending} registration(s) need review`}>Link each to an existing athlete or create a draft athlete. Nothing is matched automatically.</Notice> : null}
      <form action="/admin/registrations" className="flex flex-wrap gap-2">
        <select name="event" defaultValue={sp.event ?? ""} aria-label="Event" className="field h-10 w-auto max-w-64"><option value="">All events</option>{(events.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
        <select name="review" defaultValue={sp.review ?? ""} aria-label="Review status" className="field h-10 w-auto"><option value="">Any review status</option><option value="needs_review">Needs review</option><option value="linked">Linked</option><option value="new_athlete">New athlete</option><option value="ignored">Ignored</option></select>
        <select name="payment" defaultValue={sp.payment ?? ""} aria-label="Payment" className="field h-10 w-auto"><option value="">Any payment</option><option value="unverified">Unverified</option><option value="verified">Verified</option><option value="unpaid">Unpaid</option><option value="refunded">Refunded</option><option value="not_applicable">N/A</option></select>
        <button className={adminBtn.secondary}>Filter</button>
      </form>
      <DataTable
        caption="Registrations"
        rows={data ?? []}
        empty="No registrations yet. They appear here when a Jotform linked to an event receives a submission and the webhook is configured."
        columns={[
          { header: "Participant", cell: (r) => <Link href={`/admin/registrations/${r.id}`} className="font-medium hover:text-brand">{[r.participant_first_name, r.participant_last_name].filter(Boolean).join(" ") || "(no name)"}</Link> },
          { header: "Class", cell: (r) => r.graduation_year ?? "—" },
          { header: "Event", cell: (r) => <span className="text-xs">{(r.events as unknown as { title: string } | null)?.title}</span> },
          { header: "Payment", cell: (r) => <StatusBadge status={r.payment_status} /> },
          { header: "Review", cell: (r) => <StatusBadge status={r.review_status} /> },
          { header: "Received", cell: (r) => formatPublishedDate(r.created_at) },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/registrations" params={{ event: sp.event, review: sp.review, payment: sp.payment }} />
    </div>
  );
}
