import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Notice, Pagination, Panel, StatCard, StatusBadge, adminBtn, parsePage } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { ImportMapping } from "@/components/admin/import-mapping";
import { ImportApply } from "@/components/admin/import-apply";
import { ImportRowDecision } from "@/components/admin/import-row-decision";
import { cancelImport, purgeImportRaw } from "@/lib/actions/admin/imports";
import { mappingFields, type ImportKind, type Mapping } from "@/lib/import/fields";
import { athleteName } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const FILTERS = ["all", "new", "matched", "ambiguous", "duplicate_in_file", "invalid", "failed"] as const;

type RowRecord = { id: string; row_number: number; raw: Record<string, string>; normalized: Record<string, unknown>; errors: string[]; warnings: string[]; match_status: string; matched_athlete_id: string | null; candidates: { athlete_id: string; score: number }[]; decision: string | null; decision_athlete_id: string | null; result_status: string; result_message: string | null };

export default async function ImportDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ filter?: string; page?: string }> }) {
  await requireCapability("imports.manage");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: batch } = await supabase.from("import_batches").select("*").eq("id", id).maybeSingle();
  if (!batch) notFound();
  const kind = batch.kind as ImportKind;
  const summary = batch.summary as { headers?: string[]; preview?: Record<string, number>; created?: number; updated?: number; skipped?: number; failed?: number };
  const headers = summary.headers ?? [];
  const applied = batch.status === "applied";
  const editable = !applied && batch.status !== "cancelled" && !batch.raw_purged_at;

  const filter = (FILTERS as readonly string[]).includes(sp.filter ?? "") ? (sp.filter as (typeof FILTERS)[number]) : "all";
  const page = parsePage(sp.page);
  let q = supabase.from("import_rows").select("id, row_number, raw, normalized, errors, warnings, match_status, matched_athlete_id, candidates, decision, decision_athlete_id, result_status, result_message", { count: "exact" }).eq("batch_id", id).order("row_number");
  if (filter === "failed") q = q.eq("result_status", "failed");
  else if (filter !== "all") q = q.eq("match_status", filter);
  const [{ data: rows, count }, { data: presets }, { data: tests }] = await Promise.all([
    q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("field_mapping_presets").select("id, name, mapping").eq("kind", kind).order("name"),
    supabase.from("combine_test_types").select("slug, name").eq("active", true).order("sort_order"),
  ]);
  const records = (rows ?? []) as unknown as RowRecord[];

  const athleteIds = [...new Set(records.flatMap((r) => [r.matched_athlete_id, ...(r.candidates ?? []).map((c) => c.athlete_id)]).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (athleteIds.length) {
    const { data } = await supabase.from("athletes").select("id, first_name, last_name, graduation_year, team").in("id", athleteIds);
    for (const a of data ?? []) names.set(a.id, `${athleteName(a)}${a.graduation_year ? ` '${String(a.graduation_year).slice(2)}` : ""}${a.team ? ` · ${a.team}` : ""}`);
  }
  const { count: unresolved } = await supabase.from("import_rows").select("id", { count: "exact", head: true }).eq("batch_id", id).eq("match_status", "ambiguous").is("decision", null);

  const pv = summary.preview;
  const previewed = Boolean(pv);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={batch.filename ?? "Import"}
        backHref="/admin/imports"
        description={`${kind === "athletes" ? "Athletes" : "Combine results"} · sheet “${batch.sheet_name}” · ${batch.row_count} rows`}
        actions={<><StatusBadge status={batch.status} />{editable ? <ActionButton label="Cancel import" action={cancelImport.bind(null, id)} confirm={{ title: "Cancel this import?", description: "Staged rows and their personal data will be purged." }} redirectTo="/admin/imports" /> : null}</>}
      />

      {batch.raw_purged_at ? <Notice tone="gray">Raw spreadsheet data and private fields for this import were purged on {new Date(batch.raw_purged_at).toLocaleDateString("en-US")}.</Notice> : null}

      {editable ? (
        <Panel title="1. Map columns" description="Columns were auto-detected from the headers. Correct anything that looks wrong, then validate.">
          <ImportMapping batchId={id} kind={kind} headers={headers} fields={mappingFields(kind, tests ?? [])} initial={batch.mapping as Mapping} sourceSystem={batch.source_system} presets={(presets ?? []) as { id: string; name: string; mapping: Mapping }[]} />
        </Panel>
      ) : null}

      {(previewed || applied) && pv ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Rows" value={pv.total} />
          <StatCard label="New" value={pv.new} />
          <StatCard label="Matched" value={pv.matched} />
          <StatCard label="Possible dupes" value={pv.ambiguous} />
          <StatCard label="Dupes in file" value={pv.duplicate_in_file} />
          <StatCard label="Invalid" value={pv.invalid} />
        </div>
      ) : null}

      {applied ? (
        <Panel title="Result">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Added" value={summary.created ?? 0} /><StatCard label="Updated" value={summary.updated ?? 0} /><StatCard label="Skipped" value={summary.skipped ?? 0} /><StatCard label="Failed" value={summary.failed ?? 0} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className={adminBtn.secondary} href={`/api/admin/imports/${id}/errors`}><Download className="size-4" />Download error &amp; skipped report</a>
            {!batch.raw_purged_at ? <ActionButton label="Purge raw data" action={purgeImportRaw.bind(null, id)} confirm={{ title: "Purge raw data?", description: "Deletes the original spreadsheet cells and private fields staged for this import. The summary and audit history remain.", confirmLabel: "Purge" }} /> : null}
            <Link href={kind === "athletes" ? "/admin/athletes?status=draft" : "/admin/results"} className={adminBtn.secondary}>{kind === "athletes" ? "Review imported athletes" : "Review & verify results"}</Link>
          </div>
        </Panel>
      ) : null}

      {previewed && !batch.raw_purged_at ? (
        <Panel title={applied ? "Rows" : "2. Review rows"} description={applied ? undefined : "Resolve possible duplicates. Rows with validation errors are skipped; fix the source file and re-upload."}>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter rows">
            {FILTERS.map((f) => <Link key={f} role="tab" aria-selected={filter === f} href={`/admin/imports/${id}?filter=${f}`} className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-brand bg-brand/15" : "border-white/15 text-white/60 hover:text-white"}`}>{f.replace(/_/g, " ")}</Link>)}
          </div>
          <DataTable
            caption="Import rows"
            rows={records}
            empty="No rows in this view."
            columns={[
              { header: "Row", cell: (r) => r.row_number },
              { header: "Data", cell: (r) => <RowSummary r={r} kind={kind} /> },
              { header: "Status", cell: (r) => <StatusBadge status={r.match_status} /> },
              { header: "Notes", cell: (r) => <div className="max-w-sm space-y-1 text-xs">{r.errors.map((e) => <p key={e} className="text-red-300">{e}</p>)}{r.warnings.map((w) => <p key={w} className="text-amber-200/80">{w}</p>)}{r.result_message ? <p className="text-white/50">{r.result_message}</p> : null}</div> },
              { header: applied ? "Outcome" : "Action", cell: (r) => applied ? <StatusBadge status={r.result_status === "created" ? "applied" : r.result_status} /> : r.match_status === "invalid" ? <span className="text-xs text-white/40">Skipped</span> : r.match_status === "duplicate_in_file" ? <span className="text-xs text-white/40">Skipped</span> : <ImportRowDecision rowId={r.id} current={r.decision} currentTarget={r.decision_athlete_id ?? r.matched_athlete_id} canCreate={kind === "athletes"} candidates={(r.candidates ?? []).map((c) => ({ athlete_id: c.athlete_id, label: names.get(c.athlete_id) ?? "Unknown athlete", score: Math.min(100, c.score) }))} /> },
            ]}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath={`/admin/imports/${id}`} params={{ filter: filter === "all" ? undefined : filter }} />
        </Panel>
      ) : null}

      {editable && previewed ? (
        <Panel title="3. Apply">
          <ImportApply batchId={id} kind={kind} unresolved={unresolved ?? 0} />
        </Panel>
      ) : null}
    </div>
  );
}

function RowSummary({ r, kind }: { r: RowRecord; kind: ImportKind }) {
  const n = r.normalized as Record<string, unknown>;
  const name = [n.first_name, n.last_name].filter(Boolean).join(" ") || Object.values(r.raw ?? {}).slice(0, 2).join(" ");
  if (kind === "combine_results") {
    const results = (n.results as { test_slug: string; value: number }[] | undefined) ?? [];
    return <div><p className="font-medium">{name || "—"}</p><p className="text-xs text-white/50">{results.map((x) => `${x.test_slug.replace(/_/g, " ")}: ${x.value}`).join(" · ") || "No values"}</p></div>;
  }
  return <div><p className="font-medium">{name || "—"}</p><p className="text-xs text-white/50">{[n.graduation_year ? `Class ${n.graduation_year}` : null, n.primary_position, n.team].filter(Boolean).join(" · ")}</p></div>;
}
