import { requireCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { gaMeasurementId, serverSecrets, siteUrl, supabasePublicConfig } from "@/lib/env";
import { AdminPageHeader, DataTable, Notice, Panel, StatusBadge } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { TeamForm } from "@/components/admin/team-form";
import { revokeRole, setCoppaWorkflow } from "@/lib/actions/admin/misc";
import { formatPublishedDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_HELP: Record<string, string> = {
  owner: "Everything, including roles and the COPPA switch",
  admin: "Athletes, consent, imports, results verification, rankings, registrations",
  editor: "Events, news, sponsors and site content",
  coach: "View athletes; enter unverified results",
};

export default async function SettingsPage() {
  const user = await requireCapability("settings.manage");
  const isOwner = can(user.roles, "roles.manage");
  const supabase = await createClient();
  const secrets = serverSecrets();
  const [audit, coppa, roles] = await Promise.all([
    supabase.from("audit_logs").select("id, actor_email, action, entity_type, entity_id, summary, changed_fields, created_at").order("id", { ascending: false }).limit(100),
    supabase.from("site_settings").select("value").eq("key", "coppa").maybeSingle(),
    isOwner ? supabase.from("user_roles").select("user_id, role, granted_at").order("granted_at") : Promise.resolve({ data: [] }),
  ]);
  const coppaOn = Boolean((coppa.data?.value as { workflow_approved?: boolean } | null)?.workflow_approved);
  const emails = new Map<string, string>();
  if (isOwner && secrets.serviceRoleKey) {
    try {
      const { data } = await createServiceClient().auth.admin.listUsers({ page: 1, perPage: 200 });
      for (const u of data?.users ?? []) emails.set(u.id, u.email ?? "");
    } catch { /* email lookup is best-effort */ }
  }
  const integrations = [
    ["Supabase (database, auth, storage)", Boolean(supabasePublicConfig())],
    ["Supabase service role key (webhook, owner tools)", Boolean(secrets.serviceRoleKey)],
    ["Jotform API key", Boolean(secrets.jotformApiKey)],
    ["Jotform webhook secret", Boolean(secrets.jotformWebhookSecret)],
    ["Google Analytics 4", Boolean(gaMeasurementId())],
    ["Stripe billing", false],
  ] as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" description="Integrations, team access, safety switches and the audit log." />
      <Panel title="Integration status" description="Secrets are never displayed; this shows only whether each is configured.">
        <ul className="grid gap-2 sm:grid-cols-2">{integrations.map(([name, ok]) => <li key={name} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5 text-sm"><span>{name}</span><StatusBadge status={ok ? "active" : "pending"} /></li>)}</ul>
        <p className="mt-3 text-xs text-white/45">Site URL: {siteUrl} · Jotform webhook URL: <code className="rounded bg-white/10 px-1">{siteUrl}/api/webhooks/jotform?token=&lt;JOTFORM_WEBHOOK_SECRET&gt;</code></p>
      </Panel>

      <Panel title="Under-13 (COPPA) publishing">
        <Notice tone="red" title="Leave this OFF until legal counsel approves a verifiable parental consent workflow">While off, the database refuses to publish any profile for an athlete under 13 or of unknown age. Enabling it also requires each consent record to be flagged as verifiable parental consent. This is a legal and compliance decision, not a technical one.</Notice>
        <div className="mt-4 flex items-center gap-3">
          <StatusBadge status={coppaOn ? "active" : "inactive"} /><span className="text-sm">{coppaOn ? "Under-13 publishing allowed (with verifiable consent)" : "Under-13 publishing blocked"}</span>
          {isOwner ? <ActionButton label={coppaOn ? "Turn off" : "Turn on"} variant={coppaOn ? "secondary" : "danger"} action={setCoppaWorkflow.bind(null, !coppaOn)} confirm={{ title: coppaOn ? "Block under-13 publishing?" : "Allow under-13 publishing?", description: coppaOn ? "Existing under-13 public profiles stay as-is until next edited; new publishing is blocked." : "Only enable this after counsel has approved your verifiable parental consent process. This change is audited.", confirmLabel: coppaOn ? "Turn off" : "I understand, turn on" }} /> : <span className="text-xs text-white/40">Owner only</span>}
        </div>
      </Panel>

      {isOwner ? (
        <Panel title="Team & roles" description="Owner only. People must register an account first.">
          <ul className="mb-4 grid gap-1 text-xs text-white/50 sm:grid-cols-2">{Object.entries(ROLE_HELP).map(([r, h]) => <li key={r}><strong className="text-white/80">{r}</strong>: {h}</li>)}</ul>
          <DataTable
            caption="Team roles"
            rows={((roles.data ?? []) as { user_id: string; role: string; granted_at: string }[]).map((r) => ({ ...r, id: `${r.user_id}:${r.role}` }))}
            empty="No roles."
            columns={[
              { header: "Account", cell: (r) => emails.get(r.user_id) || r.user_id.slice(0, 8) },
              { header: "Role", cell: (r) => <StatusBadge status={r.role} /> },
              { header: "Granted", cell: (r) => formatPublishedDate(r.granted_at) },
              { header: "Actions", className: "text-right", cell: (r) => (r.role === "parent" ? null : <ActionButton label="Revoke" variant="danger" action={revokeRole.bind(null, r.user_id, r.role)} confirm={{ title: "Revoke this role?", description: "They lose this access immediately. The last Owner cannot be removed." }} />) },
            ]}
          />
          <div className="mt-5"><TeamForm /></div>
        </Panel>
      ) : null}

      <Panel title="Audit log" description="Most recent 100 changes. Records which fields changed, never the values.">
        <DataTable
          caption="Audit log"
          rows={(audit.data ?? []).map((a) => ({ ...a, id: a.id }))}
          empty="No audit entries."
          columns={[
            { header: "When", cell: (a) => new Date(a.created_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" }) },
            { header: "Who", cell: (a) => a.actor_email ?? "system" },
            { header: "Action", cell: (a) => `${a.action} ${a.entity_type}` },
            { header: "Detail", cell: (a) => <span className="text-xs text-white/50">{a.summary ?? (a.changed_fields ?? []).join(", ")}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
