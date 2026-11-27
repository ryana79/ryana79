export type Direction = "lower_is_better" | "higher_is_better";

export type LeaderboardInput = {
  resultId: string;
  athleteId: string;
  value: number;
  protocol: string;
  testedOn: string | null;
  eventId: string;
  eventTitle?: string;
  eventSlug?: string;
  eventDate?: string | null;
  athleteName: string;
};

export type LeaderboardEntry<T extends LeaderboardInput = LeaderboardInput> = T & { rank: number };

export function isBetter(a: number, b: number, direction: Direction): boolean {
  return direction === "lower_is_better" ? a < b : a > b;
}

/**
 * Builds a leaderboard from VERIFIED results only (callers must pre-filter; unverified inputs are never ranked).
 * - uses each athlete's single best result within the chosen protocol
 * - protocols are never mixed: pass `protocol` to select one
 * - ties share a rank (1,1,3); tie-break for ordering is earlier test date, then name
 */
export function buildLeaderboard<T extends LeaderboardInput>(
  rows: T[],
  direction: Direction,
  protocol: string,
): LeaderboardEntry<T>[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    if (row.protocol !== protocol) continue;
    if (!Number.isFinite(row.value) || row.value <= 0) continue;
    const current = best.get(row.athleteId);
    if (
      !current ||
      isBetter(row.value, current.value, direction) ||
      (row.value === current.value && (row.testedOn ?? "9999") < (current.testedOn ?? "9999"))
    ) {
      best.set(row.athleteId, row);
    }
  }
  const sorted = [...best.values()].sort((a, b) => {
    if (a.value !== b.value) return direction === "lower_is_better" ? a.value - b.value : b.value - a.value;
    const d = (a.testedOn ?? "9999").localeCompare(b.testedOn ?? "9999");
    return d !== 0 ? d : a.athleteName.localeCompare(b.athleteName);
  });
  let lastValue: number | null = null;
  let lastRank = 0;
  return sorted.map((row, i) => {
    if (lastValue === null || row.value !== lastValue) {
      lastRank = i + 1;
      lastValue = row.value;
    }
    return { ...row, rank: lastRank };
  });
}

export function availableProtocols(rows: { protocol: string }[]): string[] {
  const set = new Set(rows.map((r) => r.protocol));
  return [...set].sort((a, b) => (a === "standard" ? -1 : b === "standard" ? 1 : a.localeCompare(b)));
}

/** Validate a combine value against a test type's plausible range. */
export function validateCombineValue(
  value: unknown,
  range: { min: number; max: number; name: string; unit: string },
): { ok: true; value: number } | { ok: false; error: string } {
  const n = typeof value === "string" ? Number(value.trim()) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false, error: `${range.name} must be a number.` };
  if (n <= 0) return { ok: false, error: `${range.name} must be greater than zero.` };
  if (n < range.min || n > range.max) {
    return { ok: false, error: `${range.name} of ${n}${range.unit} is outside the plausible range ${range.min}–${range.max}${range.unit}.` };
  }
  return { ok: true, value: n };
}
