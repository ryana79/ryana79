import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Pagination, StatusBadge, adminBtn, parsePage } from "@/components/admin/ui";
import { CALENDAR_2027 } from "@/lib/events/calendar-2027";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const PERMISSIONS = ["unknown", "opted_in", "opted_out"] as const;

type Search = { page?: string; event?: string; source?: string; permission?: string; marketing?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireCapability("registrations.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const event = CALENDAR_2027.some((item) => item.slug === sp.event) ? sp.event : undefined;
  const permission = PERMISSIONS.includes(sp.permission as (typeof PERMISSIONS)[number]) ? sp.permission : undefined;
  const source = sp.source?.trim().slice(0, 80) || undefined;
  const supabase = await createClient();
  let query = supabase.from("event_leads").select("id, parent_name, email, town, grade_band, source, marketing_permission, news_opt_in, tags, first_submitted_at, last_submitted_at, event_lead_interests(event_slug)", { count: "exact" }).order("last_submitted_at", { ascending: false });
  if (event) query = supabase.from("event_leads").select("id, parent_name, email, town, grade_band, source, marketing_permission, news_opt_in, tags, first_submitted_at, last_submitted_at, event_lead_interests!inner(event_slug)", { count: "exact" }).eq("event_lead_interests.event_slug", event).order("last_submitted_at", { ascending: false });
  if (permission) query = query.eq("marketing_permission", permission);
  if (source) query = query.eq("source", source);
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const exportParams = new URLSearchParams();
  if (event) exportParams.set("event", event);
  if (permission) exportParams.set("permission", permission);
  if (source) exportParams.set("source", source);
  const filteredExport = `/api/admin/export/leads${exportParams.size ? `?${exportParams}` : ""}`;
  const marketingExport = `/api/admin/export/leads?marketing=1`;

  return (
    <div>
      <AdminPageHeader
        title="Event leads"
        description="Parent and guardian contacts. Unknown marketing permission stays out of the marketing send list."
        actions={
          <>
            <Link href="/admin/leads/import" className={adminBtn.primary}>Import Turkey Bowl 2026</Link>
            <a href={filteredExport} className={adminBtn.secondary}>Export filtered CSV</a>
            <a href={marketingExport} className={adminBtn.secondary}>Export marketing list</a>
          </>
        }
      />
      <form className="mb-4 grid gap-3 sm:grid-cols-3" action="/admin/leads">
        <label className="text-sm">Event interest
          <select name="event" defaultValue={event ?? ""} className="field mt-1">
            <option value="">All events</option>
            {CALENDAR_2027.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}
          </select>
        </label>
        <label className="text-sm">Source
          <input name="source" defaultValue={source ?? ""} placeholder="website or turkey_bowl_2026_import" className="field mt-1" />
        </label>
        <label className="text-sm">Marketing permission
          <select name="permission" defaultValue={permission ?? ""} className="field mt-1">
            <option value="">All</option>
            {PERMISSIONS.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
          </select>
        </label>
        <button type="submit" className={adminBtn.secondary}>Apply filters</button>
      </form>
      <DataTable
        caption="Event leads"
        rows={(data ?? []).map((row) => ({ ...row, id: row.id as string }))}
        empty="No leads yet. The Turkey Bowl 2026 importer has not added contacts."
        columns={[
          { header: "Parent", cell: (row) => <div><p className="font-medium">{row.parent_name}</p><p className="text-xs text-white/50">{row.email}</p></div> },
          { header: "Town / grade", cell: (row) => <span className="text-xs text-white/70">{[row.town, row.grade_band].filter(Boolean).join(" · ") || "—"}</span> },
          { header: "Events", cell: (row) => <span className="text-xs text-white/70">{(row.event_lead_interests ?? []).map((item: { event_slug: string }) => item.event_slug).join(", ") || "None yet"}</span> },
          { header: "Source", cell: (row) => <span className="text-xs">{row.source}</span> },
          { header: "Permission", cell: (row) => <StatusBadge status={row.marketing_permission} /> },
          { header: "Tags", cell: (row) => <span className="text-xs text-white/60">{(row.tags ?? []).join(", ") || "—"}</span> },
          { header: "Latest", cell: (row) => formatPublishedDate(row.last_submitted_at) },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/leads" params={{ event, source, permission }} />
    </div>
  );
}
