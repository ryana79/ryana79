import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, Notice, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { formatPublishedDate, todayInNJ } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const user = await requireCapability("dashboard.view");
  const supabase = await createClient();
  const today = todayInNJ();
  const head = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });
  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const admin = can(user.roles, "athletes.manage");
  const zero = Promise.resolve(0);
  const [athletes, publicAthletes, pendingReview, upcoming, drafts, registrations, needsReview, unverified, articles, sponsors, newInquiries, openRequests] = await Promise.all([
    n(head("athletes")),
    n(head("athletes").eq("public_visibility", true)),
    n(head("athletes").eq("profile_status", "pending_review")),
    n(head("events").eq("status", "published").gte("event_date", today)),
    n(head("events").eq("status", "draft")),
    admin ? n(head("event_registrations")) : zero,
    admin ? n(head("event_registrations").eq("review_status", "needs_review")) : zero,
    n(head("combine_results").eq("verification_status", "unverified").eq("is_current", true)),
    n(head("articles").eq("status", "published")),
    n(head("sponsors").eq("active", true)),
    admin ? n(head("inquiries").eq("status", "new")) : zero,
    admin ? n(head("data_requests").in("status", ["received", "verifying", "in_progress"])) : zero,
  ]);
  const [recentImports, recentEvents] = await Promise.all([
    admin ? supabase.from("import_batches").select("id, filename, status, row_count, created_at").order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    supabase.from("events").select("id, title, status, event_date").order("updated_at", { ascending: false }).limit(5),
  ]);

  const todo: { label: string; href: string; n: number }[] = [
    { label: "Athlete profiles awaiting review", href: "/admin/athletes?status=pending_review", n: pendingReview },
    { label: "Registrations to match", href: "/admin/registrations?review=needs_review", n: needsReview },
    { label: "Unverified results", href: "/admin/results?status=unverified", n: unverified },
    { label: "New inquiries", href: "/admin/inquiries", n: newInquiries },
    { label: "Open privacy requests", href: "/admin/privacy", n: openRequests },
  ].filter((t) => t.n > 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Overview" description={`Signed in as ${user.email}`} />
      {todo.length ? (
        <Panel title="Needs attention">
          <ul className="grid gap-2 sm:grid-cols-2">{todo.map((t) => <li key={t.label}><Link href={t.href} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-sm transition hover:border-brand/50"><span>{t.label}</span><span className="font-display text-2xl font-bold text-brand">{t.n}</span></Link></li>)}</ul>
        </Panel>
      ) : <Notice tone="green">Nothing needs attention right now.</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Athletes" value={athletes} hint={`${publicAthletes} public`} href="/admin/athletes" />
        <StatCard label="Upcoming events" value={upcoming} hint={`${drafts} draft`} href="/admin/events" />
        {admin ? <StatCard label="Registrations" value={registrations} href="/admin/registrations" /> : null}
        <StatCard label="Published articles" value={articles} href="/admin/news" />
        <StatCard label="Active sponsors" value={sponsors} href="/admin/sponsors" />
        <StatCard label="Unverified results" value={unverified} href="/admin/results?status=unverified" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent events" actions={<Link href="/admin/events/new" className="text-xs text-brand">New event</Link>}>
          {(recentEvents.data ?? []).length ? <ul className="divide-y divide-white/[0.06] text-sm">{(recentEvents.data ?? []).map((e) => <li key={e.id} className="flex items-center justify-between py-2"><Link href={`/admin/events/${e.id}`} className="hover:text-brand">{e.title}</Link><StatusBadge status={e.status} /></li>)}</ul> : <p className="text-sm text-white/50">No events yet.</p>}
        </Panel>
        {admin ? (
          <Panel title="Recent imports" actions={<Link href="/admin/imports" className="text-xs text-brand">Import</Link>}>
            {(recentImports.data ?? []).length ? <ul className="divide-y divide-white/[0.06] text-sm">{(recentImports.data ?? []).map((b) => <li key={b.id} className="flex items-center justify-between py-2"><Link href={`/admin/imports/${b.id}`} className="hover:text-brand">{b.filename} <span className="text-white/40">· {b.row_count} rows · {formatPublishedDate(b.created_at)}</span></Link><StatusBadge status={b.status} /></li>)}</ul> : <p className="text-sm text-white/50">No imports yet.</p>}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
