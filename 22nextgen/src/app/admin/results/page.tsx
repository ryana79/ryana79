import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Pagination, Panel, StatusBadge, adminBtn, parsePage } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { ResultForm } from "@/components/admin/result-form";
import { ResultCorrect } from "@/components/admin/result-correct";
import { setResultVerification, verifyEventResults } from "@/lib/actions/admin/results";
import { athleteName, formatMeasurement, formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

type ResultRow = { id: string; value: number; unit: string; attempt_number: number; protocol: string; verification_status: string; tested_on: string | null; created_at: string; athletes: { id: string; first_name: string; last_name: string; display_name: string | null } | null; events: { title: string } | null; combine_test_types: { name: string; decimals: number } | null };

export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<{ event?: string; test?: string; status?: string; athlete?: string; page?: string }> }) {
  const user = await requireCapability("results.enter");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  const canVerify = can(user.roles, "results.verify");
  const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

  let q = supabase.from("combine_results").select("id, value, unit, attempt_number, protocol, verification_status, tested_on, created_at, athletes(id, first_name, last_name, display_name), events(title), combine_test_types(name, decimals)", { count: "exact" }).eq("is_current", true).order("created_at", { ascending: false });
  if (uuid(sp.event)) q = q.eq("event_id", uuid(sp.event)!);
  if (uuid(sp.test)) q = q.eq("test_type_id", uuid(sp.test)!);
  if (uuid(sp.athlete)) q = q.eq("athlete_id", uuid(sp.athlete)!);
  if (sp.status && ["unverified", "verified", "rejected"].includes(sp.status)) q = q.eq("verification_status", sp.status);

  const [{ data, count }, events, tests, preAthlete] = await Promise.all([
    q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("events").select("id, title, event_date").order("event_date", { ascending: false, nullsFirst: true }).limit(200),
    supabase.from("combine_test_types").select("id, name, unit").eq("active", true).order("sort_order"),
    uuid(sp.athlete) ? supabase.from("athletes").select("id, first_name, last_name, display_name").eq("id", uuid(sp.athlete)!).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const eventOpts = (events.data ?? []).map((e) => ({ id: e.id, label: `${e.title}${e.event_date ? ` · ${e.event_date}` : ""}` }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Results" description="Enter, correct and verify combine results. Only verified, current results appear on public leaderboards." actions={<>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/admin/export/results" className={adminBtn.secondary}>Export CSV</a>
        {canVerify ? <Link href="/admin/results/tests" className={adminBtn.secondary}>Manage tests</Link> : null}
      </>} />
      <Panel title="Add result"><ResultForm events={eventOpts} tests={tests.data ?? []} canVerify={canVerify} defaultAthlete={preAthlete.data ? { id: preAthlete.data.id, label: athleteName(preAthlete.data) } : null} defaultEvent={uuid(sp.event)} /></Panel>
      <Panel title="Results" actions={canVerify && uuid(sp.event) ? <ActionButton label="Verify all unverified for this event" action={verifyEventResults.bind(null, uuid(sp.event)!)} confirm={{ title: "Verify all results for this event?", description: "Every current unverified result for this event becomes verified and appears on public leaderboards (for approved, public athletes).", confirmLabel: "Verify all" }} /> : null}>
        <form action="/admin/results" className="mb-4 flex flex-wrap gap-2">
          <select name="event" defaultValue={sp.event ?? ""} aria-label="Event" className="field h-10 w-auto max-w-64"><option value="">All events</option>{eventOpts.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
          <select name="test" defaultValue={sp.test ?? ""} aria-label="Test" className="field h-10 w-auto"><option value="">All tests</option>{(tests.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select name="status" defaultValue={sp.status ?? ""} aria-label="Verification" className="field h-10 w-auto"><option value="">Any status</option><option value="unverified">Unverified</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
          {uuid(sp.athlete) ? <input type="hidden" name="athlete" value={sp.athlete} /> : null}
          <button className={adminBtn.secondary}>Filter</button>
        </form>
        <DataTable
          caption="Combine results"
          rows={(data ?? []) as unknown as ResultRow[]}
          empty="No results match these filters."
          columns={[
            { header: "Athlete", cell: (r) => r.athletes ? <Link href={`/admin/athletes/${r.athletes.id}`} className="font-medium hover:text-brand">{athleteName(r.athletes)}</Link> : "—" },
            { header: "Test", cell: (r) => r.combine_test_types?.name },
            { header: "Result", cell: (r) => <span className="tabular-nums">{formatMeasurement(r.value, r.unit, r.combine_test_types?.decimals ?? 2)}</span> },
            { header: "Protocol", cell: (r) => <span className="text-xs">{r.protocol}{r.attempt_number > 1 ? ` · attempt ${r.attempt_number}` : ""}</span> },
            { header: "Event", cell: (r) => <span className="text-xs">{r.events?.title}</span> },
            { header: "Status", cell: (r) => <StatusBadge status={r.verification_status} /> },
            { header: "Entered", cell: (r) => formatPublishedDate(r.created_at) },
            { header: "Actions", className: "text-right", cell: (r) => (
              <div className="flex justify-end gap-2">
                {canVerify && r.verification_status !== "verified" ? <ActionButton label="Verify" variant="primary" action={setResultVerification.bind(null, r.id, "verified")} successMessage="Result verified" /> : null}
                {canVerify && r.verification_status === "verified" ? <ActionButton label="Unverify" action={setResultVerification.bind(null, r.id, "unverified")} /> : null}
                {canVerify && r.verification_status !== "rejected" ? <ActionButton label="Reject" action={setResultVerification.bind(null, r.id, "rejected")} confirm={{ title: "Reject this result?", description: "Rejected results never appear publicly." }} /> : null}
                <ResultCorrect id={r.id} current={String(r.value)} unit={r.unit} />
              </div>
            ) },
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/results" params={{ event: sp.event, test: sp.test, status: sp.status, athlete: sp.athlete }} />
      </Panel>
    </div>
  );
}
