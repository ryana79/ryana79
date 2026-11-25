import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gaMeasurementId } from "@/lib/env";
import { AdminPageHeader, DataTable, Notice, Panel, StatCard } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireCapability("analytics.view");
  const supabase = await createClient();
  const [events, regs, athletes, results, inquiries] = await Promise.all([
    supabase.from("events").select("id, title, event_date, status").order("event_date", { ascending: false, nullsFirst: true }).limit(50),
    supabase.from("event_registrations").select("event_id, payment_status"),
    supabase.from("athletes").select("profile_status, consent_status, public_visibility"),
    supabase.from("combine_results").select("verification_status").eq("is_current", true),
    supabase.from("inquiries").select("kind"),
  ]);
  const regCounts = new Map<string, { total: number; verified: number }>();
  for (const r of regs.data ?? []) {
    const c = regCounts.get(r.event_id) ?? { total: 0, verified: 0 };
    c.total++;
    if (r.payment_status === "verified") c.verified++;
    regCounts.set(r.event_id, c);
  }
  const a = athletes.data ?? [];
  const ga = gaMeasurementId();
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Analytics" description="Operational counts from your own database. These are real records, not estimates." />
      <Notice tone={ga ? "green" : "amber"} title={ga ? "Google Analytics 4 is configured" : "Google Analytics 4 is not configured"}>{ga ? "Traffic reports (page views, sources, devices) live in your GA4 property. Visitors are measured only after they accept analytics cookies." : "Set NEXT_PUBLIC_GA_MEASUREMENT_ID to enable traffic analytics. No traffic numbers are shown here until then."}</Notice>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Athletes" value={a.length} />
        <StatCard label="Public profiles" value={a.filter((x) => x.public_visibility).length} />
        <StatCard label="Consent granted" value={a.filter((x) => x.consent_status === "granted").length} />
        <StatCard label="Verified results" value={(results.data ?? []).filter((r) => r.verification_status === "verified").length} />
        <StatCard label="Registrations" value={(regs.data ?? []).length} />
        <StatCard label="Payments verified" value={(regs.data ?? []).filter((r) => r.payment_status === "verified").length} />
        <StatCard label="Inquiries" value={(inquiries.data ?? []).length} />
        <StatCard label="Pending profiles" value={a.filter((x) => x.profile_status === "pending_review").length} />
      </div>
      <Panel title="Registrations by event">
        <DataTable caption="Registrations by event" rows={events.data ?? []} empty="No events." columns={[
          { header: "Event", cell: (e) => e.title },
          { header: "Status", cell: (e) => e.status },
          { header: "Registrations", cell: (e) => regCounts.get(e.id)?.total ?? 0 },
          { header: "Payments verified", cell: (e) => regCounts.get(e.id)?.verified ?? 0 },
        ]} />
      </Panel>
    </div>
  );
}
