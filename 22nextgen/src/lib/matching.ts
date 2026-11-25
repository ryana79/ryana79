/** Athlete duplicate / match detection used by spreadsheet import and Jotform registrations. */

export type MatchableAthlete = {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  team: string | null;
  parent_email?: string | null;
  external_ids?: { source_system: string; external_id: string }[];
};

export type MatchProbe = {
  internal_id?: string | null;
  external_id?: string | null;
  source_system?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  graduation_year?: number | null;
  team?: string | null;
  parent_email?: string | null;
};

export type MatchCandidate = { athlete_id: string; score: number; reasons: string[] };

export type MatchOutcome =
  | { status: "matched"; athlete_id: string; reasons: string[]; candidates: MatchCandidate[] }
  | { status: "ambiguous"; candidates: MatchCandidate[] }
  | { status: "new"; candidates: [] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Strongest keys first:
 *  1. internal athlete ID (exact) → matched
 *  2. validated external ID for the same source system → matched
 *  3. exact name + class + (team or parent email) → matched
 * Anything weaker (name only, name + class only, nickname-ish) → ambiguous, requires admin review.
 * Never auto-merges uncertain matches.
 */
export function matchAthlete(probe: MatchProbe, athletes: MatchableAthlete[]): MatchOutcome {
  if (probe.internal_id && isUuid(probe.internal_id)) {
    const hit = athletes.find((a) => a.id === probe.internal_id!.toLowerCase());
    if (hit) return { status: "matched", athlete_id: hit.id, reasons: ["internal ID"], candidates: [{ athlete_id: hit.id, score: 100, reasons: ["internal ID"] }] };
  }
  if (probe.external_id && probe.source_system) {
    const ext = probe.external_id.trim();
    const hits = athletes.filter((a) => a.external_ids?.some((e) => e.source_system === probe.source_system && e.external_id === ext));
    if (hits.length === 1) {
      return { status: "matched", athlete_id: hits[0].id, reasons: ["external ID"], candidates: [{ athlete_id: hits[0].id, score: 95, reasons: ["external ID"] }] };
    }
    if (hits.length > 1) {
      return { status: "ambiguous", candidates: hits.map((h) => ({ athlete_id: h.id, score: 90, reasons: ["external ID (conflict)"] })) };
    }
  }

  const first = normalizeName(probe.first_name);
  const last = normalizeName(probe.last_name);
  if (!last) return { status: "new", candidates: [] };

  const candidates: MatchCandidate[] = [];
  for (const a of athletes) {
    if (normalizeName(a.last_name) !== last) continue;
    const reasons: string[] = ["last name"];
    let score = 30;
    const aFirst = normalizeName(a.first_name);
    if (first && aFirst === first) {
      reasons.push("first name");
      score += 30;
    } else if (first && aFirst && (aFirst.startsWith(first) || first.startsWith(aFirst)) && Math.min(aFirst.length, first.length) >= 3) {
      reasons.push("similar first name");
      score += 12;
    } else if (first) {
      continue;
    }
    if (probe.graduation_year && a.graduation_year === probe.graduation_year) {
      reasons.push("graduation class");
      score += 20;
    } else if (probe.graduation_year && a.graduation_year && a.graduation_year !== probe.graduation_year) {
      score -= 15;
      reasons.push("different class");
    }
    if (probe.team && a.team && normalizeName(probe.team) === normalizeName(a.team)) {
      reasons.push("team");
      score += 10;
    }
    if (probe.parent_email && a.parent_email && normalizeEmail(probe.parent_email) === normalizeEmail(a.parent_email)) {
      reasons.push("parent email");
      score += 15;
    }
    candidates.push({ athlete_id: a.id, score, reasons });
  }
  candidates.sort((x, y) => y.score - x.score);

  if (candidates.length === 0) return { status: "new", candidates: [] };

  const top = candidates[0];
  const exactName = top.reasons.includes("first name");
  const sameClass = top.reasons.includes("graduation class");
  const corroborated = top.reasons.includes("team") || top.reasons.includes("parent email");
  const unique = candidates.length === 1 || candidates[1].score < top.score - 20;
  if (exactName && sameClass && corroborated && unique) {
    return { status: "matched", athlete_id: top.athlete_id, reasons: top.reasons, candidates };
  }
  return { status: "ambiguous", candidates };
}

/** Within-file duplicate key: same normalized name + class (+ external id when present). */
export function withinFileKey(p: MatchProbe): string | null {
  if (p.external_id) return `ext:${p.source_system ?? ""}:${p.external_id.trim().toLowerCase()}`;
  const l = normalizeName(p.last_name);
  const f = normalizeName(p.first_name);
  if (!l || !f) return null;
  return `name:${f}:${l}:${p.graduation_year ?? ""}`;
}
