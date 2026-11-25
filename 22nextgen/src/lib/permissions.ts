/**
 * Role model. Owner > Admin > Editor > Coach. Parent is reserved for future guardian dashboards.
 * These checks mirror the Postgres RLS helper functions (is_admin / is_editor / is_staff);
 * RLS remains the final authority.
 */
export const ROLES = ["owner", "admin", "editor", "coach", "parent"] as const;
export type AppRole = (typeof ROLES)[number];

export const ROLE_GROUPS = {
  owner: ["owner"],
  admin: ["owner", "admin"],
  editor: ["owner", "admin", "editor"],
  staff: ["owner", "admin", "editor", "coach"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Capability =
  | "dashboard.view"
  | "events.manage"
  | "athletes.view"
  | "athletes.manage"
  | "imports.manage"
  | "results.enter"
  | "results.verify"
  | "rankings.manage"
  | "news.manage"
  | "sponsors.manage"
  | "content.manage"
  | "registrations.view"
  | "memberships.view"
  | "analytics.view"
  | "settings.manage"
  | "roles.manage"
  | "privacy.manage";

export const CAPABILITIES: Record<Capability, readonly AppRole[]> = {
  "dashboard.view": ROLE_GROUPS.staff,
  "events.manage": ROLE_GROUPS.editor,
  "athletes.view": ROLE_GROUPS.staff,
  "athletes.manage": ROLE_GROUPS.admin,
  "imports.manage": ROLE_GROUPS.admin,
  "results.enter": ROLE_GROUPS.staff,
  "results.verify": ROLE_GROUPS.admin,
  "rankings.manage": ROLE_GROUPS.admin,
  "news.manage": ROLE_GROUPS.editor,
  "sponsors.manage": ROLE_GROUPS.editor,
  "content.manage": ROLE_GROUPS.editor,
  "registrations.view": ROLE_GROUPS.admin,
  "memberships.view": ROLE_GROUPS.admin,
  "analytics.view": ROLE_GROUPS.admin,
  "settings.manage": ROLE_GROUPS.admin,
  "roles.manage": ROLE_GROUPS.owner,
  "privacy.manage": ROLE_GROUPS.admin,
};

export function can(roles: readonly string[] | null | undefined, capability: Capability): boolean {
  if (!roles || roles.length === 0) return false;
  const allowed = CAPABILITIES[capability] as readonly string[];
  return roles.some((r) => allowed.includes(r));
}

export function hasAnyRole(roles: readonly string[] | null | undefined, allowed: readonly AppRole[]): boolean {
  if (!roles) return false;
  return roles.some((r) => (allowed as readonly string[]).includes(r));
}
