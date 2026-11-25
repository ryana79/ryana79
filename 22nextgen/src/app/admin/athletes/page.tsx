import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Pagination, SearchBar, StatusBadge, adminBtn, parsePage, safeTerm } from "@/components/admin/ui";
import { athleteName } from "@/lib/format";

const PAGE_SIZE = 20;
type SP = { q?: string; status?: string; consent?: string; year?: string; page?: string };

export default async function AdminAthletesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireCapability("athletes.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  let q = supabase
    .from("athletes")
    .select("id, first_name, last_name, display_name, graduation_year, primary_position, team, profile_status, consent_status, public_visibility, featured", { count: "exact" })
    .order("last_name")
    .order("first_name");
  const term = safeTerm(sp.q);
  if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,team.ilike.%${term}%`);
  if (sp.status && ["draft", "pending_review", "approved", "rejected", "archived"].includes(sp.status)) q = q.eq("profile_status", sp.status);
  if (sp.consent && ["none", "pending", "granted", "withdrawn", "declined"].includes(sp.consent)) q = q.eq("consent_status", sp.consent);
  if (sp.year && /^\d{4}$/.test(sp.year)) q = q.eq("graduation_year", Number(sp.year));
  const { data, count } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const manage = can(user.roles, "athletes.manage");
  const exportQs = new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, consent: sp.consent, year: sp.year }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div>
      <AdminPageHeader
        title="Athletes"
        description="Manage athlete records, consent and public visibility."
        actions={manage ? (<>
          <a href={`/api/admin/export/athletes${exportQs ? `?${exportQs}` : ""}`} className={adminBtn.secondary}><Download className="size-4" />Export CSV</a>
          <Link href="/admin/athletes/new" className={adminBtn.primary}><Plus className="size-4" />Add athlete</Link>
        </>) : null}
      />
      <SearchBar action="/admin/athletes" q={sp.q} placeholder="Search name or team">
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Profile status" className="field h-10 w-auto"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select>
        <select name="consent" defaultValue={sp.consent ?? ""} aria-label="Consent" className="field h-10 w-auto"><option value="">Any consent</option><option value="none">None</option><option value="pending">Pending</option><option value="granted">Granted</option><option value="withdrawn">Withdrawn</option><option value="declined">Declined</option></select>
        <input name="year" defaultValue={sp.year ?? ""} aria-label="Class year" placeholder="Class" inputMode="numeric" className="field h-10 w-24" />
      </SearchBar>
      <DataTable
        caption="Athletes"
        rows={data ?? []}
        empty={<>No athletes match. {manage ? <>Add one or <Link href="/admin/imports" className="text-brand underline">import a spreadsheet</Link>.</> : null}</>}
        columns={[
          { header: "Athlete", cell: (a) => <Link href={`/admin/athletes/${a.id}`} className="font-medium hover:text-brand">{athleteName(a)}</Link> },
          { header: "Class", cell: (a) => a.graduation_year ?? "—" },
          { header: "Pos.", cell: (a) => a.primary_position ?? "—" },
          { header: "Team", cell: (a) => a.team ?? "—" },
          { header: "Profile", cell: (a) => <StatusBadge status={a.profile_status} /> },
          { header: "Consent", cell: (a) => <StatusBadge status={a.consent_status} /> },
          { header: "Public", cell: (a) => (a.public_visibility ? <span className="text-emerald-300">{a.featured ? "Public · Featured" : "Public"}</span> : <span className="text-white/40">Hidden</span>) },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/athletes" params={{ q: sp.q, status: sp.status, consent: sp.consent, year: sp.year }} />
    </div>
  );
}
