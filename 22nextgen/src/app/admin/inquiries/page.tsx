import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Pagination, StatusBadge, parsePage } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { setInquiryStatus } from "@/lib/actions/admin/misc";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCapability("registrations.view");
  const page = parsePage((await searchParams).page);
  const supabase = await createClient();
  const { data, count } = await supabase.from("inquiries").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return (
    <div>
      <AdminPageHeader title="Inquiries" description="Messages from the Contact and Partners forms." />
      <DataTable
        caption="Inquiries"
        rows={data ?? []}
        empty="No inquiries yet."
        columns={[
          { header: "From", cell: (i) => <div><p className="font-medium">{i.name}</p><a className="text-xs text-brand" href={`mailto:${i.email}`}>{i.email}</a>{i.organization ? <p className="text-xs text-white/40">{i.organization}</p> : null}</div> },
          { header: "Type", cell: (i) => i.kind.replace(/_/g, " ") },
          { header: "Message", cell: (i) => <p className="max-w-md whitespace-pre-wrap text-xs text-white/70">{i.message}</p> },
          { header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
          { header: "Received", cell: (i) => formatPublishedDate(i.created_at) },
          { header: "Actions", className: "text-right", cell: (i) => <div className="flex justify-end gap-2">{i.status !== "in_progress" ? <ActionButton label="In progress" action={setInquiryStatus.bind(null, i.id, "in_progress")} /> : null}{i.status !== "closed" ? <ActionButton label="Close" action={setInquiryStatus.bind(null, i.id, "closed")} /> : null}</div> },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/inquiries" />
    </div>
  );
}
