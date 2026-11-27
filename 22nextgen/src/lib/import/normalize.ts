import { POSITIONS, US_STATES } from "@/lib/site";
import { isUuid } from "@/lib/matching";
import { validateCombineValue } from "@/lib/leaderboard";
import type { ImportKind, Mapping } from "./fields";

export type NormalizedRow = {
  normalized: Record<string, unknown>;
  errors: string[];
  warnings: string[];
};

export type TestTypeRange = { slug: string; name: string; unit: string; min_value: number; max_value: number };

const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const POSITION_ALIASES: Record<string, string> = {
  quarterback: "QB", "running back": "RB", halfback: "RB", fullback: "RB", "wide receiver": "WR", receiver: "WR", "tight end": "TE", "offensive line": "OL", "offensive lineman": "OL", ot: "OL", og: "OL", c: "OL", center: "OL", "defensive line": "DL", "defensive lineman": "DL", de: "DL", dt: "DL", linebacker: "LB", olb: "LB", ilb: "LB", mlb: "LB", "defensive back": "DB", cornerback: "CB", corner: "CB", safety: "S", fs: "S", ss: "S", kicker: "K/P", punter: "K/P", k: "K/P", p: "K/P", kp: "K/P", athlete: "ATH",
};

export function parsePosition(raw: string): string | null {
  const v = raw.trim().toUpperCase().replace(/\./g, "");
  if (!v) return null;
  if ((POSITIONS as readonly string[]).includes(v)) return v;
  return POSITION_ALIASES[v.toLowerCase()] ?? null;
}

export function parseState(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const up = v.toUpperCase();
  if ((US_STATES as readonly string[]).includes(up)) return up;
  return STATE_NAMES[v.toLowerCase()] ?? null;
}

export function parseGraduationYear(raw: string): number | null {
  const m = raw.match(/(?:^|\D)(20\d{2}|\d{2})(?:\D|$)/);
  if (!m) return null;
  let y = Number(m[1]);
  if (y < 100) y += 2000;
  return y >= 2025 && y <= 2045 ? y : null;
}

export function parseGrade(raw: string): number | null {
  const m = raw.match(/\d{1,2}/);
  if (!m) return null;
  const g = Number(m[0]);
  return g >= 1 && g <= 12 ? g : null;
}

/** Heights: 5'10", 5-10, 5 ft 10 in, 70, 70in. Bare decimals like 5.10 are ambiguous and rejected. */
export function parseHeightInches(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[”″“]/g, '"').replace(/[’′‘]/g, "'");
  if (!s) return null;
  let m = s.match(/^(\d)\s*(?:'|ft|feet|-|\s)\s*(\d{1,2}(?:\.\d)?)\s*(?:"|in|inches)?$/);
  if (m) {
    const inches = Number(m[1]) * 12 + Number(m[2]);
    return inches >= 30 && inches <= 96 ? inches : null;
  }
  m = s.match(/^(\d)\s*(?:'|ft|feet)$/);
  if (m) return Number(m[1]) * 12;
  m = s.match(/^(\d{2,3}(?:\.\d)?)\s*(?:"|in|inches)?$/);
  if (m) {
    const n = Number(m[1]);
    return n >= 30 && n <= 96 ? n : null;
  }
  return null;
}

export function parseWeightLb(raw: string): number | null {
  const m = raw.trim().toLowerCase().match(/^(\d{2,3}(?:\.\d)?)\s*(?:lbs?|pounds?)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 30 && n <= 450 ? n : null;
}

/** Accepts ISO, M/D/YYYY and M-D-YYYY. Returns YYYY-MM-DD or null. */
export function parseDate(raw: string, now = new Date()): string | null {
  const s = raw.trim();
  if (!s) return null;
  let y: number, mo: number, d: number;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else {
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
    if (!m) return null;
    [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 100) y += y > (now.getUTCFullYear() % 100) ? 1900 : 2000;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 254 ? v : null;
}

export function splitList(raw: string): string[] {
  return raw.split(/[\n;|]+/).map((s) => s.trim()).filter(Boolean);
}

export function parseHttpsUrls(raw: string): { urls: string[]; rejected: string[] } {
  const urls: string[] = [];
  const rejected: string[] = [];
  for (const item of raw.split(/[\s,;|]+/).map((s) => s.trim()).filter(Boolean)) {
    try {
      const u = new URL(item);
      if (u.protocol === "https:") urls.push(u.toString());
      else rejected.push(item);
    } catch {
      rejected.push(item);
    }
  }
  return { urls, rejected };
}

export function splitFullName(raw: string): { first: string; last: string } | null {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return null;
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((p) => p.trim());
    return first && last ? { first, last } : null;
  }
  const parts = s.split(" ");
  if (parts.length < 2) return null;
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/** Broad jump / vertical may be written as 9'6" (feet-inches); other tests are plain decimals. */
export function parseMeasurement(raw: string, unit: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[”″“]/g, '"').replace(/[’′‘]/g, "'");
  if (!s) return null;
  if (unit === "in") {
    const ft = s.match(/^(\d{1,2})\s*'\s*(\d{1,2}(?:\.\d+)?)\s*"?$/);
    if (ft) return Number(ft[1]) * 12 + Number(ft[2]);
  }
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds|"|in|inches)?$/);
  return m ? Number(m[1]) : null;
}

type Row = Record<string, string>;
const get = (row: Row, mapping: Mapping, key: string): string => {
  const col = mapping[key];
  return col ? (row[col] ?? "").trim() : "";
};

export function normalizeAthleteRow(row: Row, mapping: Mapping): NormalizedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const n: Record<string, unknown> = {};

  let first = get(row, mapping, "first_name");
  let last = get(row, mapping, "last_name");
  const full = get(row, mapping, "full_name");
  if ((!first || !last) && full) {
    const split = splitFullName(full);
    if (split) {
      first = first || split.first;
      last = last || split.last;
    }
  }
  if (!first) errors.push("First name is missing.");
  if (!last) errors.push("Last name is missing.");
  if (first.length > 80 || last.length > 80) errors.push("Name is too long.");
  n.first_name = first;
  n.last_name = last;

  const setText = (key: string, max = 160) => {
    const v = get(row, mapping, key);
    if (!v) return;
    if (v.length > max) {
      warnings.push(`${key.replace(/_/g, " ")} is longer than ${max} characters and was skipped.`);
      return;
    }
    n[key] = v;
  };
  setText("display_name", 120);
  setText("team", 120);
  setText("school_public", 160);
  setText("school", 160);
  setText("town", 100);
  setText("region", 60);
  setText("parent_name", 160);
  setText("parent_phone", 40);

  const bio = get(row, mapping, "bio");
  if (bio) {
    if (bio.length > 4000) warnings.push("Bio is longer than 4000 characters and was skipped.");
    else n.bio = bio;
  }

  const gy = get(row, mapping, "graduation_year");
  if (gy) {
    const v = parseGraduationYear(gy);
    if (v) n.graduation_year = v;
    else warnings.push(`Graduation class "${gy}" was not understood (use a year like 2031).`);
  }
  const gr = get(row, mapping, "current_grade");
  if (gr) {
    const v = parseGrade(gr);
    if (v) n.current_grade = v;
    else warnings.push(`Grade "${gr}" was not understood.`);
  }
  for (const key of ["primary_position", "secondary_position"] as const) {
    const raw = get(row, mapping, key);
    if (!raw) continue;
    const pos = parsePosition(raw);
    if (pos) n[key] = pos;
    else warnings.push(`Position "${raw}" is not recognized and was skipped.`);
  }
  const st = get(row, mapping, "state");
  if (st) {
    const v = parseState(st);
    if (v) n.state = v;
    else warnings.push(`State "${st}" was not recognized.`);
  }
  const h = get(row, mapping, "height");
  if (h) {
    const v = parseHeightInches(h);
    if (v) n.height_in = v;
    else warnings.push(`Height "${h}" was not understood (use 5'10" or inches).`);
  }
  const w = get(row, mapping, "weight");
  if (w) {
    const v = parseWeightLb(w);
    if (v) n.weight_lb = v;
    else warnings.push(`Weight "${w}" was not understood.`);
  }
  const bd = get(row, mapping, "birth_date");
  if (bd) {
    const v = parseDate(bd);
    const year = v ? Number(v.slice(0, 4)) : 0;
    if (v && year >= 2000 && v <= new Date().toISOString().slice(0, 10)) n.birth_date = v;
    else warnings.push("Birth date was not understood or is out of range and was skipped.");
  }
  const em = get(row, mapping, "parent_email");
  if (em) {
    const v = parseEmail(em);
    if (v) n.parent_email = v;
    else warnings.push("Parent email is not a valid address and was skipped.");
  }
  const hl = get(row, mapping, "highlight_urls");
  if (hl) {
    const { urls, rejected } = parseHttpsUrls(hl);
    if (urls.length) n.highlight_urls = urls.slice(0, 6);
    if (rejected.length) warnings.push("Highlight links must be https:// and valid; some were skipped.");
  }
  for (const key of ["awards", "achievements"] as const) {
    const raw = get(row, mapping, key);
    if (raw) n[key] = splitList(raw).slice(0, 20);
  }
  const ext = get(row, mapping, "external_id");
  if (ext) n.external_id = ext.slice(0, 120);
  const aid = get(row, mapping, "athlete_id");
  if (aid) {
    if (isUuid(aid)) n.athlete_id = aid.toLowerCase();
    else warnings.push("22 NEXT GEN athlete ID is not a valid ID and was ignored.");
  }
  return { normalized: n, errors, warnings };
}

export type ResultEntry = { test_slug: string; value: number; attempt: number; protocol: string; tested_on: string | null };

export function normalizeResultRow(row: Row, mapping: Mapping, tests: TestTypeRange[]): NormalizedRow {
  const base = normalizeAthleteRow(row, mapping);
  const hasKey = Boolean(base.normalized.external_id || base.normalized.athlete_id);
  const errors = hasKey ? base.errors.filter((e) => !/name is missing/i.test(e)) : [...base.errors];
  const warnings = [...base.warnings];
  const identity: Record<string, unknown> = {};
  for (const k of ["first_name", "last_name", "graduation_year", "team", "parent_email", "external_id", "athlete_id"]) if (base.normalized[k] !== undefined) identity[k] = base.normalized[k];

  const protocolRaw = get(row, mapping, "protocol");
  const protocol = protocolRaw ? protocolRaw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "standard" : "standard";
  const dateRaw = get(row, mapping, "tested_on");
  let tested_on: string | null = null;
  if (dateRaw) {
    tested_on = parseDate(dateRaw);
    if (!tested_on) warnings.push(`Test date "${dateRaw}" was not understood and was skipped.`);
  }

  const results: ResultEntry[] = [];
  for (const t of tests) {
    const raw = get(row, mapping, `test:${t.slug}`);
    if (!raw) continue;
    const parsed = parseMeasurement(raw, t.unit);
    if (parsed === null) {
      errors.push(`${t.name}: "${raw}" is not a number.`);
      continue;
    }
    const check = validateCombineValue(parsed, { min: t.min_value, max: t.max_value, name: t.name, unit: t.unit });
    if (!check.ok) {
      errors.push(check.error);
      continue;
    }
    results.push({ test_slug: t.slug, value: check.value, attempt: 1, protocol, tested_on });
  }
  if (results.length === 0 && errors.length === 0) warnings.push("No result values found in this row.");
  return { normalized: { ...identity, results }, errors, warnings };
}

export function normalizeRow(kind: ImportKind, row: Row, mapping: Mapping, tests: TestTypeRange[]): NormalizedRow {
  return kind === "athletes" ? normalizeAthleteRow(row, mapping) : normalizeResultRow(row, mapping, tests);
}

