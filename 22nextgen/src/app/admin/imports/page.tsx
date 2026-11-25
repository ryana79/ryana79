import Link from "next/link";
import { Download } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Notice, Panel, StatusBadge, adminBtn } from "@/components/admin/ui";
import { ImportUpload } from "@/components/admin/import-upload";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  await requireCapability("imports.manage");
  const supabase = await createClient();
  const [events, batches] = await Promise.all([
    supabase.from("events").select("id, title, event_date").order("event_date", { ascending: false, nullsFirst: true }).limit(200),
    supabase.from("import_batches").select("id, kind, filename, status, mode, row_count, summary, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Imports" description="Bring in athletes and combine results from spreadsheets. Nothing is published automatically." />
      <Panel title="Upload a spreadsheet" actions={
        <div className="flex gap-2">
          <a className={adminBtn.secondary} href="/api/admin/imports/template?kind=athletes&format=xlsx"><Download className="size-4" />Athlete template</a>
          <a className={adminBtn.secondary} href="/api/admin/imports/template?kind=combine_results&format=xlsx"><Download className="size-4" />Results template</a>
        </div>
      }>
        <div className="mb-4"><Notice tone="blue" title="How imports stay safe">You will map columns, preview validation and possible duplicates, then choose an import mode. New athletes become private drafts without consent. Approved profile data is never overwritten unless you explicitly allow it. Uncertain matches are never merged automatically.</Notice></div>
        <ImportUpload events={events.data ?? []} />
      </Panel>
      <Panel title="History">
        <DataTable
          caption="Import history"
          rows={batches.data ?? []}
          empty="No imports yet."
          columns={[
            { header: "File", cell: (b) => <Link href={`/admin/imports/${b.id}`} className="font-medium hover:text-brand">{b.filename ?? "Untitled"}</Link> },
            { header: "Type", cell: (b) => (b.kind === "athletes" ? "Athletes" : "Combine results") },
            { header: "Rows", cell: (b) => b.row_count },
            { header: "Mode", cell: (b) => b.mode?.replace(/_/g, " ") ?? "—" },
            { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
            { header: "Result", cell: (b) => { const s = b.summary as { created?: number; updated?: number; skipped?: number; failed?: number } | null; return s && s.created !== undefined ? `${s.created} added · ${s.updated} updated · ${s.skipped} skipped · ${s.failed} failed` : "—"; } },
            { header: "Date", cell: (b) => formatPublishedDate(b.created_at) },
          ]}
        />
      </Panel>
    </div>
  );
}
