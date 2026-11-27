import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, Notice, Panel, StatusBadge, adminBtn } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { AthleteForm } from "@/components/admin/athlete-form";
import { ConsentForm } from "@/components/admin/consent-form";
import { deleteAthlete, setAthleteFeatured, transitionAthlete } from "@/lib/actions/admin/athletes";
import { athleteName, formatMeasurement, formatPublishedDate } from "@/lib/format";
import type { AthleteRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAthleteDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCapability("athletes.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle();
  if (!athlete) notFound();
  const a = athlete as AthleteRow;
  const manage = can(user.roles, "athletes.manage");

  const [priv, consents, results, registrations, mappings] = await Promise.all([
    supabase.from("athlete_private").select("*").eq("athlete_id", id).maybeSingle(),
    manage ? supabase.from("athlete_consents").select("*").eq("athlete_id", id).order("recorded_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    supabase.from("combine_results").select("id, value, unit, verification_status, is_current, tested_on, attempt_number, protocol, combine_test_types(name, decimals), events(title)").eq("athlete_id", id).eq("is_current", true).order("created_at", { ascending: false }).limit(50),
    manage ? supabase.from("event_registrations").select("id, payment_status, review_status, created_at, events(title)").eq("athlete_id", id).limit(20) : Promise.resolve({ data: [] }),
    manage ? supabase.from("external_record_mappings").select("source_system, external_id").eq("entity_id", id) : Promise.resolve({ data: [] }),
  ]);
  const p = (priv.data ?? {}) as Record<string, string | null>;
  const hasLatestConsent = (consents.data ?? [])[0];
  const lines = (arr: string[]) => (arr ?? []).join("\n");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={athleteName(a)}
        backHref="/admin/athletes"
        description={[a.graduation_year ? `Class of ${a.graduation_year}` : null, a.primary_position, a.team].filter(Boolean).join(" · ")}
        actions={a.public_visibility ? <Link href={`/athletes/${a.slug}`} target="_blank" className={adminBtn.secondary}><ExternalLink className="size-4" />View public profile</Link> : null}
      />

      <Panel title="Publication & consent status">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span>Profile <StatusBadge status={a.profile_status} /></span>
          <span>Consent <StatusBadge status={a.consent_status} /></span>
          <span>{a.public_visibility ? <span className="text-emerald-300">Visible publicly</span> : <span className="text-white/50">Not public</span>}</span>
          {a.featured ? <StatusBadge status="featured" /> : null}
        </div>
        {manage ? (
          <>
            <div className="flex flex-wrap gap-2">
              {a.profile_status !== "approved" && a.profile_status !== "archived" ? <ActionButton label="Approve & publish" variant="primary" action={transitionAthlete.bind(null, id, "approve")} successMessage="Profile approved and published" confirm={{ title: "Approve and publish this profile?", description: "The profile becomes publicly visible. This requires recorded guardian consent, and under-13 athletes cannot be published until the COPPA workflow is enabled.", confirmLabel: "Approve & publish" }} /> : null}
              {a.profile_status === "draft" || a.profile_status === "rejected" ? <ActionButton label="Mark pending review" action={transitionAthlete.bind(null, id, "submit_review")} /> : null}
              {a.public_visibility ? <ActionButton label="Unpublish" action={transitionAthlete.bind(null, id, "unpublish")} confirm={{ title: "Unpublish this profile?", description: "It will be removed from the public site immediately." }} /> : null}
              {a.profile_status === "pending_review" ? <ActionButton label="Reject" action={transitionAthlete.bind(null, id, "reject")} /> : null}
              {a.public_visibility && !a.featured ? <ActionButton label="Feature on homepage" action={setAthleteFeatured.bind(null, id, true, a.featured_rank)} /> : null}
              {a.featured ? <ActionButton label="Remove from featured" action={setAthleteFeatured.bind(null, id, false)} /> : null}
              {a.profile_status !== "archived" ? <ActionButton label="Archive" action={transitionAthlete.bind(null, id, "archive")} confirm={{ title: "Archive athlete?", description: "The profile is hidden from the public site. Records and results are preserved." }} /> : <ActionButton label="Restore as draft" action={transitionAthlete.bind(null, id, "restore")} />}
            </div>
            {!hasLatestConsent || hasLatestConsent.status !== "granted" ? <div className="mt-4"><Notice tone="amber" title="Cannot be published yet">Record granted guardian consent below before approving this profile.</Notice></div> : null}
          </>
        ) : <p className="text-sm text-white/50">You have read-only access to athletes.</p>}
      </Panel>

      {manage ? (
        <Panel title="Consent record" description="Append-only evidence trail. Recording “withdrawn” unpublishes the profile immediately.">
          <div className="mb-5">
            {(consents.data ?? []).length ? (
              <ul className="divide-y divide-white/[0.06] text-sm">
                {(consents.data ?? []).map((c: { id: string; status: string; guardian_name: string | null; method: string | null; recorded_at: string; verifiable_parental_consent: boolean }) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-2"><StatusBadge status={c.status} /><span>{c.guardian_name ?? "—"}</span><span className="text-white/45">{c.method?.replace(/_/g, " ") ?? ""}</span>{c.verifiable_parental_consent ? <span className="text-xs text-emerald-300">verifiable</span> : null}<span className="ml-auto text-xs text-white/40">{formatPublishedDate(c.recorded_at)}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-white/50">No consent recorded yet.</p>}
          </div>
          <ConsentForm athleteId={id} defaultGuardian={p.parent_name ?? ""} />
        </Panel>
      ) : null}

      {manage ? (
        <AthleteForm
          athleteId={id}
          initial={{
            first_name: a.first_name, last_name: a.last_name, display_name: a.display_name ?? "", profile_image_path: a.profile_image_path ?? "",
            graduation_year: a.graduation_year?.toString() ?? "", current_grade: a.current_grade?.toString() ?? "", primary_position: a.primary_position ?? "", secondary_position: a.secondary_position ?? "",
            team: a.team ?? "", school_public: a.school_public ?? "", school: p.school ?? "", town: a.town ?? "", state: a.state ?? "", region: a.region ?? "",
            height_in: a.height_in?.toString() ?? "", weight_lb: a.weight_lb?.toString() ?? "", highlight_urls: lines(a.highlight_urls), awards: lines(a.awards), achievements: lines(a.achievements), bio: a.bio ?? "",
            featured_rank: a.featured_rank?.toString() ?? "", birth_date: p.birth_date ?? "", parent_name: p.parent_name ?? "", parent_email: p.parent_email ?? "", parent_phone: p.parent_phone ?? "", internal_notes: p.internal_notes ?? "",
          }}
        />
      ) : null}

      <Panel title="Combine results" actions={<Link href={`/admin/results?athlete=${id}`} className={adminBtn.secondary}>Manage results</Link>}>
        {(results.data ?? []).length ? (
          <ul className="divide-y divide-white/[0.06] text-sm">
            {(results.data as unknown as { id: string; value: number; unit: string; verification_status: string; tested_on: string | null; combine_test_types: { name: string; decimals: number } | null; events: { title: string } | null }[]).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2"><span className="w-40 font-medium">{r.combine_test_types?.name}</span><span className="tabular-nums">{formatMeasurement(r.value, r.unit, r.combine_test_types?.decimals ?? 2)}</span><StatusBadge status={r.verification_status} /><span className="text-white/45">{r.events?.title}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-white/50">No results recorded.</p>}
      </Panel>

      {manage ? (
        <Panel title="Linked records">
          <div className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Registrations</h3>
              {(registrations.data ?? []).length ? <ul className="space-y-1">{(registrations.data as unknown as { id: string; events: { title: string } | null; payment_status: string }[]).map((r) => <li key={r.id} className="flex items-center gap-2">{r.events?.title}<StatusBadge status={r.payment_status} /></li>)}</ul> : <p className="text-white/50">None linked.</p>}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">External IDs (import sources)</h3>
              {(mappings.data ?? []).length ? <ul className="space-y-1">{(mappings.data as { source_system: string; external_id: string }[]).map((m) => <li key={m.source_system + m.external_id}><span className="text-white/50">{m.source_system}:</span> {m.external_id}</li>)}</ul> : <p className="text-white/50">None.</p>}
            </div>
          </div>
        </Panel>
      ) : null}

      {manage ? (
        <Panel title="Danger zone">
          <p className="mb-3 text-sm text-white/55">Permanently erase this athlete and all linked private data, consents, registrations, results and ranking entries. Use for verified deletion requests. This cannot be undone.</p>
          <ActionButton label="Erase athlete permanently" variant="danger" redirectTo="/admin/athletes" action={deleteAthlete.bind(null, id)} confirm={{ title: `Erase ${athleteName(a)}?`, description: "All records for this athlete will be permanently deleted. An audit entry records that an erasure happened, without personal data.", confirmLabel: "Erase permanently" }} />
        </Panel>
      ) : null}
    </div>
  );
}
