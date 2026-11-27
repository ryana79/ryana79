export const TURKEY_BOWL_2026_TAG = "Turkey Bowl 2026";
export const TURKEY_BOWL_2026_SOURCE = "turkey_bowl_2026_import";
export const WEBSITE_LEAD_SOURCE = "website";

export type MarketingPermission = "unknown" | "opted_in" | "opted_out";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL.test(email)) return null;
  return email;
}

/** Explicit permission only. Blank, unclear, or mixed answers stay unknown. */
export function parseMarketingPermission(value: string | null | undefined): MarketingPermission {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return "unknown";
  const negative = /\b(no|false|declined|denied|unsubscribe|opt[\s-]?out|do not|don't)\b/.test(text);
  const positive = /\b(yes|true|agree|agreed|granted|accepted|opt[\s-]?in)\b/.test(text);
  if (positive && !negative) return "opted_in";
  if (negative && !positive) return "opted_out";
  return "unknown";
}

export type MappedLeadRow = {
  line: number;
  name: string;
  email: string;
  town: string;
  grade: string;
  permission: string;
};

export type PlannedLeadRow = {
  line: number;
  email: string | null;
  name: string | null;
  town: string | null;
  grade: string | null;
  permission: MarketingPermission;
  status: "valid" | "duplicate" | "skipped";
  reason: string;
};

export function planLeadImport(rows: MappedLeadRow[], existingEmails: ReadonlySet<string>): PlannedLeadRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const email = normalizeEmail(row.email);
    const name = row.name.trim();
    const town = row.town.trim() || null;
    const grade = row.grade.trim() || null;
    const permission = parseMarketingPermission(row.permission);
    if (!email) return { line: row.line, email: null, name: name || null, town, grade, permission, status: "skipped", reason: "Missing or invalid parent email." };
    if (!name) return { line: row.line, email, name: null, town, grade, permission, status: "skipped", reason: "Missing parent or guardian name." };
    if (seen.has(email)) return { line: row.line, email, name, town, grade, permission, status: "duplicate", reason: "Repeated in this file. The existing contact will be updated." };
    seen.add(email);
    if (existingEmails.has(email)) return { line: row.line, email, name, town, grade, permission, status: "duplicate", reason: "Already in the database. Interests and newer preferences stay as they are." };
    return { line: row.line, email, name, town, grade, permission, status: "valid", reason: "New contact." };
  });
}

export type StoredLead = {
  parent_name: string;
  town: string | null;
  grade_band: string | null;
  marketing_permission: MarketingPermission;
  news_opt_in: boolean;
  tags: string[];
  source: string;
};

export type LeadPatch = {
  town?: string;
  grade_band?: string;
  tags: string[];
  marketing_permission?: MarketingPermission;
  recordPermission: boolean;
};

/** Rerun-safe match. Fills blanks, adds the tag, and never downgrades a known permission or removes interests. */
export function planLeadMatch(existing: StoredLead, incoming: { town: string | null; grade: string | null; permission: MarketingPermission }): LeadPatch {
  const tags = existing.tags.includes(TURKEY_BOWL_2026_TAG) ? existing.tags : [...existing.tags, TURKEY_BOWL_2026_TAG];
  const patch: LeadPatch = { tags, recordPermission: false };
  if (!existing.town && incoming.town) patch.town = incoming.town;
  if (!existing.grade_band && incoming.grade) patch.grade_band = incoming.grade;
  if (existing.marketing_permission === "unknown" && incoming.permission !== "unknown") {
    patch.marketing_permission = incoming.permission;
    patch.recordPermission = true;
  }
  return patch;
}
