import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, Notice, Panel, StatusBadge, adminBtn } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { createAthleteFromRegistration, ignoreRegistration, linkRegistration, setRegistrationPayment, setRegistrationStatus } from "@/lib/actions/admin/registrations";
import { athleteName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RegistrationDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("registrations.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase.from("event_registrations").select("*, events(title, slug)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const ids = [...(r.candidate_athlete_ids ?? []), ...(r.athlete_id ? [r.athlete_id] : [])];
  const { data: athletes } = ids.length ? await supabase.from("athletes").select("id, first_name, last_name, display_name, graduation_year, team").in("id", ids) : { data: [] };
  const linked = (athletes ?? []).find((a) => a.id === r.athlete_id);
  const candidates = (athletes ?? []).filter((a) => a.id !== r.athlete_id);
  const event = r.events as unknown as { title: string; slug: string } | null;
  const answers = Object.entries((r.answers ?? {}) as Record<string, string>);
  const row = (label: string, value: string | number | null) => (<div className="flex gap-3 py-1.5 text-sm"><dt className="w-40 shrink-0 text-white/50">{label}</dt><dd>{value ?? "—"}</dd></div>);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={[r.participant_first_name, r.participant_last_name].filter(Boolean).join(" ") || "Registration"} backHref="/admin/registrations" description={event?.title} actions={<><StatusBadge status={r.review_status} /><StatusBadge status={r.payment_status} /></>} />
      <Panel title="Participant & contact (private)">
        <dl className="grid gap-x-8 md:grid-cols-2">
          {row("Class", r.graduation_year)}{row("Grade", r.grade)}{row("Position", r.position)}{row("Team", r.team)}
          {row("Parent/guardian", r.parent_name)}{row("Parent email", r.parent_email)}{row("Parent phone", r.parent_phone)}{row("Jotform submission", r.jotform_submission_id)}
        </dl>
        {answers.length ? <details className="mt-4 text-sm"><summary className="cursor-pointer text-white/60">Other answers ({answers.length})</summary><dl className="mt-2">{answers.map(([k, v]) => row(k, v))}</dl></details> : null}
      </Panel>
      <Panel title="Athlete link">
        {linked ? (
          <p className="text-sm">Linked to <Link className="text-brand underline" href={`/admin/athletes/${linked.id}`}>{athleteName(linked)}</Link>.</p>
        ) : (
          <div className="space-y-4">
            <Notice tone="blue">Nothing is linked automatically. Review possible matches or create a draft athlete (private, no consent).</Notice>
            {candidates.length ? (
              <ul className="space-y-2">{candidates.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 p-3 text-sm"><span className="flex-1">{athleteName(a)}{a.graduation_year ? ` · ${a.graduation_year}` : ""}{a.team ? ` · ${a.team}` : ""}</span><Link href={`/admin/athletes/${a.id}`} className={adminBtn.secondary}>View</Link><ActionButton label="Link to this athlete" variant="primary" action={linkRegistration.bind(null, id, a.id)} confirm={{ title: "Link registration to this athlete?", description: "Confirm that these are the same person. The athlete is added to the event's participants." }} /></li>
              ))}</ul>
            ) : <p className="text-sm text-white/50">No likely matches found.</p>}
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Create draft athlete" action={createAthleteFromRegistration.bind(null, id)} confirm={{ title: "Create a draft athlete?", description: "Creates a private draft from this registration (name, class, position, team, parent contact). No consent is recorded and nothing is published." }} />
              <ActionButton label="Ignore" action={ignoreRegistration.bind(null, id)} />
            </div>
          </div>
        )}
      </Panel>
      <Panel title="Payment & status">
        <Notice tone="amber" title="Payment is not verified automatically">Payment is collected inside Jotform. This system has no authorized payment source connected, so payments stay “unverified” until an admin confirms them against Jotform or the payment processor.</Notice>
        <div className="mt-4 flex flex-wrap gap-2">
          {r.payment_status !== "verified" ? <ActionButton label="Mark payment verified (manual)" variant="primary" action={setRegistrationPayment.bind(null, id, "verified")} confirm={{ title: "Confirm payment manually?", description: "Only do this after checking the payment in Jotform or your processor. This is recorded in the audit log." }} /> : null}
          {r.payment_status !== "unpaid" ? <ActionButton label="Mark unpaid" action={setRegistrationPayment.bind(null, id, "unpaid")} /> : null}
          {r.payment_status !== "refunded" ? <ActionButton label="Mark refunded" action={setRegistrationPayment.bind(null, id, "refunded")} /> : null}
          {r.payment_status !== "unverified" ? <ActionButton label="Reset to unverified" action={setRegistrationPayment.bind(null, id, "unverified")} /> : null}
          {r.status !== "confirmed" ? <ActionButton label="Confirm registration" action={setRegistrationStatus.bind(null, id, "confirmed")} /> : null}
          {r.status !== "cancelled" ? <ActionButton label="Cancel registration" variant="danger" action={setRegistrationStatus.bind(null, id, "cancelled")} confirm={{ title: "Cancel this registration?", description: "The registration is marked cancelled. It is not deleted." }} /> : null}
        </div>
      </Panel>
    </div>
  );
}
