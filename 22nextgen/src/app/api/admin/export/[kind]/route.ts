import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can, type Capability } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 20000;
const PAGE = 1000;

const ATHLETE_PUBLIC = ["id", "first_name", "last_name", "display_name", "graduation_year", "current_grade", "primary_position", "secondary_position", "team", "school_public", "town", "state", "region", "height_in", "weight_lb", "profile_status", "consent_status", "public_visibility", "featured", "created_at"];
const ATHLETE_PRIVATE = ["birth_date", "school", "parent_name", "parent_email", "parent_phone"];
const REGISTRATION_COLS = ["id", "event_title", "participant_first_name", "participant_last_name", "graduation_year", "grade", "position", "team", "parent_name", "parent_email", "parent_phone", "payment_status", "status", "review_status", "athlete_id", "submitted_at", "created_at"];
const RESULT_COLS = ["athlete", "graduation_year", "event", "test", "value", "unit", "attempt_number", "protocol", "verification_status", "tested_on", "source"];

const CAPS: Record<string, Capability> = { athletes: "athletes.manage", registrations: "registrations.view", results: "results.enter" };

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const capability = CAPS[kind];
  if (!capability) return NextResponse.json({ error: "Unknown export." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!can(user.roles, capability)) return NextResponse.json({ error: "Not permitted." }, { status: 403 });

  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;
  try {
    let headers: string[];
    let rows: Record<string, unknown>[];
    if (kind === "athletes") {
      const includePrivate = sp.get("private") === "1";
      const term = (sp.get("q") ?? "").replace(/[^\p{L}\p{N} '\-]/gu, "").slice(0, 60);
      const data = await fetchAll<Record<string, unknown>>((from, to) => {
        let q = supabase.from("athletes").select(`${ATHLETE_PUBLIC.join(",")}${includePrivate ? ",athlete_private(" + ATHLETE_PRIVATE.join(",") + ")" : ""}`).order("last_name").order("id");
        if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,team.ilike.%${term}%`);
        const status = sp.get("status");
        if (status && ["draft", "pending_review", "approved", "rejected", "archived"].includes(status)) q = q.eq("profile_status", status);
        const consent = sp.get("consent");
        if (consent && ["none", "pending", "granted", "withdrawn", "declined"].includes(consent)) q = q.eq("consent_status", consent);
        const year = sp.get("year");
        if (year && /^\d{4}$/.test(year)) q = q.eq("graduation_year", Number(year));
        return q.range(from, to) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
      });
      headers = includePrivate ? [...ATHLETE_PUBLIC, ...ATHLETE_PRIVATE] : ATHLETE_PUBLIC;
      rows = data.map((r) => {
        const { athlete_private, ...rest } = r as Record<string, unknown> & { athlete_private?: Record<string, unknown> | Record<string, unknown>[] | null };
        const priv = Array.isArray(athlete_private) ? athlete_private[0] : athlete_private;
        return { ...rest, ...(priv ?? {}) };
      });
    } else if (kind === "registrations") {
      const eventId = sp.get("event");
      const data = await fetchAll<Record<string, unknown>>((from, to) => {
        let q = supabase.from("event_registrations").select("id, participant_first_name, participant_last_name, graduation_year, grade, position, team, parent_name, parent_email, parent_phone, payment_status, status, review_status, athlete_id, submitted_at, created_at, events(title)").order("created_at", { ascending: false }).order("id");
        if (eventId && /^[0-9a-f-]{36}$/i.test(eventId)) q = q.eq("event_id", eventId);
        return q.range(from, to) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
      });
      headers = REGISTRATION_COLS;
      rows = data.map((r) => ({ ...r, event_title: (r.events as { title?: string } | null)?.title ?? "" }));
    } else {
      const data = await fetchAll<Record<string, unknown>>((from, to) =>
        supabase.from("combine_results").select("value, unit, attempt_number, protocol, verification_status, tested_on, source, athletes(first_name, last_name, graduation_year), events(title), combine_test_types(name)").eq("is_current", true).order("created_at", { ascending: false }).order("id").range(from, to) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>,
      );
      headers = RESULT_COLS;
      rows = data.map((r) => {
        const a = r.athletes as { first_name: string; last_name: string; graduation_year: number | null } | null;
        return { ...r, athlete: a ? `${a.first_name} ${a.last_name}` : "", graduation_year: a?.graduation_year ?? "", event: (r.events as { title?: string } | null)?.title ?? "", test: (r.combine_test_types as { name?: string } | null)?.name ?? "" };
      });
    }
    await supabase.rpc("write_audit", { p_action: "export", p_entity_type: kind, p_entity_id: "csv", p_summary: `Exported ${rows.length} ${kind} rows`, p_metadata: { rows: rows.length, private: sp.get("private") === "1" } });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(toCsv(headers, rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="22nextgen-${kind}-${stamp}.csv"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[export]", kind, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
