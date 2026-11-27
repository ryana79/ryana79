export function formatCents(cents: number | null | undefined, opts: { monthly?: boolean } = {}): string | null {
  if (cents === null || cents === undefined) return null;
  const dollars = cents / 100;
  const text = Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return opts.monthly ? `${text}/month` : text;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parses 'YYYY-MM-DD' as a calendar date with no timezone shift. */
export function parseDateOnly(value: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

export function formatEventDate(value: string | null | undefined, style: "short" | "long" = "long"): string {
  if (!value) return "Date to be announced";
  const p = parseDateOnly(value);
  if (!p) return "Date to be announced";
  const dow = DAYS_SHORT[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  if (style === "short") return `${MONTHS_SHORT[p.m - 1]} ${p.d}`;
  return `${dow}, ${MONTHS_SHORT[p.m - 1]} ${p.d}, ${p.y}`;
}

export function dateParts(value: string | null | undefined): { month: string; day: string } | null {
  if (!value) return null;
  const p = parseDateOnly(value);
  return p ? { month: MONTHS_SHORT[p.m - 1].toUpperCase(), day: String(p.d) } : null;
}

export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  let h = +m[1];
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

export function timeZoneAbbr(tz: string | null | undefined, date?: string | null): string {
  const zone = tz || "America/New_York";
  try {
    const p = date ? parseDateOnly(date) : null;
    const when = p ? new Date(Date.UTC(p.y, p.m - 1, p.d, 12)) : new Date();
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
      .formatToParts(when)
      .find((x) => x.type === "timeZoneName");
    return part?.value ?? zone;
  } catch {
    return zone;
  }
}

export function formatTimeRange(start?: string | null, end?: string | null, tz?: string | null, date?: string | null): string | null {
  const s = formatTime(start);
  const e = formatTime(end);
  if (!s) return null;
  return `${s}${e ? ` – ${e}` : ""} ${timeZoneAbbr(tz, date)}`;
}

export function formatHeight(inches: number | string | null | undefined): string | null {
  if (inches === null || inches === undefined || inches === "") return null;
  const n = Number(inches);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ft = Math.floor(n / 12);
  const rest = Math.round((n - ft * 12) * 10) / 10;
  return `${ft}'${Number.isInteger(rest) ? rest : rest.toFixed(1)}"`;
}

export function formatWeight(lb: number | string | null | undefined): string | null {
  if (lb === null || lb === undefined || lb === "") return null;
  const n = Number(lb);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)} lb` : null;
}

export function formatMeasurement(value: number | string, unit: string, decimals = 2): string {
  const n = Number(value);
  if (unit === "s") return `${n.toFixed(decimals)}s`;
  if (unit === "in") return decimals > 0 ? `${n.toFixed(decimals)}"` : `${Math.round(n)}"`;
  return `${n.toFixed(decimals)} ${unit}`;
}

export function formatPublishedDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function athleteName(a: { first_name: string; last_name: string; display_name?: string | null }): string {
  return a.display_name?.trim() || `${a.first_name} ${a.last_name}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function todayInNJ(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
