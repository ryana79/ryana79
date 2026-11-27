import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Notice, StatusBadge } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { setDataRequestStatus } from "@/lib/actions/admin/misc";
import { formatPublishedDate } from "@/lib/format";

const currentTime = () => Date.now();

export const dynamic = "force-dynamic";

export default async function PrivacyRequestsPage() {
  await requireCapability("privacy.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("data_requests").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Privacy requests" description="Correction, consent-withdrawal, access and deletion requests from families." />
      <Notice tone="amber" title="Verify before acting">Confirm the requester is the athlete&apos;s parent or guardian before changing or deleting data. To withdraw consent, record “withdrawn” on the athlete (this unpublishes immediately). To delete, use “Erase athlete permanently” on the athlete record. Response timelines and retention rules should be confirmed with legal counsel.</Notice>
      <DataTable
        caption="Privacy requests"
        rows={data ?? []}
        empty="No privacy requests."
        columns={[
          { header: "Requester", cell: (r) => <div><p className="font-medium">{r.requester_name}</p><a className="text-xs text-brand" href={`mailto:${r.requester_email}`}>{r.requester_email}</a></div> },
          { header: "Type", cell: (r) => r.request_type.replace(/_/g, " ") },
          { header: "Athlete / details", cell: (r) => <div className="max-w-sm text-xs"><p>{r.athlete_reference}</p><p className="whitespace-pre-wrap text-white/60">{r.details}</p>{r.athlete_id ? <Link className="text-brand" href={`/admin/athletes/${r.athlete_id}`}>Open athlete</Link> : null}</div> },
          { header: "Due", cell: (r) => { const overdue = !["completed", "rejected"].includes(r.status) && new Date(r.due_at).getTime() < currentTime(); return <span className={overdue ? "text-red-300" : ""}>{formatPublishedDate(r.due_at)}{overdue ? " (overdue)" : ""}</span>; } },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "Actions", className: "text-right", cell: (r) => <div className="flex justify-end gap-2">{r.status === "received" ? <ActionButton label="Start verifying" action={setDataRequestStatus.bind(null, r.id, "verifying")} /> : null}{!["completed", "rejected"].includes(r.status) ? <><ActionButton label="Complete" variant="primary" action={setDataRequestStatus.bind(null, r.id, "completed")} /><ActionButton label="Reject" action={setDataRequestStatus.bind(null, r.id, "rejected")} confirm={{ title: "Reject this request?", description: "Mark as rejected only if the requester could not be verified or the request is invalid." }} /></> : null}</div> },
        ]}
      />
    </div>
  );
}
