import { matchAthlete, withinFileKey, type MatchableAthlete, type MatchCandidate } from "@/lib/matching";
import { normalizeRow, type NormalizedRow, type TestTypeRange } from "./normalize";
import type { ImportKind, Mapping } from "./fields";

export type MatchStatus = "new" | "matched" | "ambiguous" | "duplicate_in_file" | "invalid";
export type Decision = "create" | "link" | "skip" | null;

export type PreviewRow = {
  row_number: number;
  normalized: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  match_status: MatchStatus;
  matched_athlete_id: string | null;
  candidates: MatchCandidate[];
  decision: Decision;
};

export type PreviewSummary = { total: number; new: number; matched: number; ambiguous: number; duplicate_in_file: number; invalid: number; warnings: number };

export type PreviewInput = {
  kind: ImportKind;
  rows: { row_number: number; raw: Record<string, string> }[];
  mapping: Mapping;
  tests: TestTypeRange[];
  athletes: MatchableAthlete[];
  sourceSystem: string;
};

/** Pure preview pipeline: normalize, validate, detect duplicates (in file and against the database), propose decisions. */
export function buildPreview(input: PreviewInput): { rows: PreviewRow[]; summary: PreviewSummary } {
  const seen = new Map<string, number>();
  const rows: PreviewRow[] = [];

  for (const r of input.rows) {
    const norm: NormalizedRow = normalizeRow(input.kind, r.raw, input.mapping, input.tests);
    const n = norm.normalized;
    const base = { row_number: r.row_number, normalized: n, errors: norm.errors, warnings: [...norm.warnings], matched_athlete_id: null as string | null, candidates: [] as MatchCandidate[] };

    if (norm.errors.length > 0) {
      rows.push({ ...base, match_status: "invalid", decision: null });
      continue;
    }

    const probe = {
      internal_id: (n.athlete_id as string | undefined) ?? null,
      external_id: (n.external_id as string | undefined) ?? null,
      source_system: input.sourceSystem,
      first_name: (n.first_name as string | undefined) ?? null,
      last_name: (n.last_name as string | undefined) ?? null,
      graduation_year: (n.graduation_year as number | undefined) ?? null,
      team: (n.team as string | undefined) ?? null,
      parent_email: (n.parent_email as string | undefined) ?? null,
    };

    // Result imports legitimately repeat an athlete only if they differ in protocol; athlete imports must not repeat.
    const key = withinFileKey(probe);
    if (input.kind === "athletes" && key) {
      const first = seen.get(key);
      if (first !== undefined) {
        rows.push({ ...base, warnings: [...base.warnings, `Duplicate of row ${first} in this file.`], match_status: "duplicate_in_file", decision: "skip" });
        continue;
      }
      seen.set(key, r.row_number);
    }

    const outcome = matchAthlete(probe, input.athletes);
    if (outcome.status === "matched") {
      rows.push({ ...base, match_status: "matched", matched_athlete_id: outcome.athlete_id, candidates: outcome.candidates, decision: "link", warnings: [...base.warnings, `Matched existing athlete by ${outcome.reasons.join(" + ")}.`] });
    } else if (outcome.status === "ambiguous") {
      rows.push({ ...base, match_status: "ambiguous", candidates: outcome.candidates.slice(0, 5), decision: null, warnings: [...base.warnings, "Possible duplicate. An admin must choose how to resolve it."] });
    } else {
      // Combine results never create athletes; unmatched rows are skipped until the athlete exists.
      rows.push({ ...base, match_status: "new", decision: input.kind === "athletes" ? "create" : "skip", warnings: input.kind === "athletes" ? base.warnings : [...base.warnings, "No matching athlete found. Import athletes first."] });
    }
  }

  const summary: PreviewSummary = { total: rows.length, new: 0, matched: 0, ambiguous: 0, duplicate_in_file: 0, invalid: 0, warnings: 0 };
  for (const r of rows) {
    summary[r.match_status] += 1;
    if (r.warnings.length) summary.warnings += 1;
  }
  return { rows, summary };
}
