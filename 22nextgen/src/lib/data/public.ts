import { createPublicClient } from "@/lib/supabase/public";
import { todayInNJ, athleteName } from "@/lib/format";
import { buildLeaderboard, availableProtocols, type Direction, type LeaderboardInput } from "@/lib/leaderboard";
import type { ArticleRow, AthleteRow, EventRow, EventStaffRow, RankingRow, SponsorRow, TestTypeRow } from "@/lib/types";

export const ATHLETE_PUBLIC_COLUMNS =
  "id, slug, first_name, last_name, display_name, profile_image_path, graduation_year, current_grade, primary_position, secondary_position, team, school_public, town, state, region, height_in, weight_lb, highlight_urls, awards, achievements, bio, featured, featured_rank, approved_at";

export const PAGE_SIZE = 12;

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[data:${label}]`, e instanceof Error ? e.message : "unknown error");
    return fallback;
  }
}

function db() {
  const client = createPublicClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

// ---------------------------------------------------------------- events
export async function getUpcomingEvents(limit = 6): Promise<EventRow[]> {
  return safe("upcoming-events", [], async () => {
    const { data, error } = await db()
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("event_date", todayInNJ())
      .order("event_date", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as EventRow[];
  });
}

export type EventListParams = { type?: string; region?: string; past?: boolean };

export async function listEvents(params: EventListParams = {}): Promise<EventRow[]> {
  return safe("list-events", [], async () => {
    let q = db().from("events").select("*").eq("status", "published");
    const today = todayInNJ();
    q = params.past ? q.lt("event_date", today).order("event_date", { ascending: false }) : q.gte("event_date", today).order("event_date", { ascending: true });
    if (params.type) q = q.eq("event_type", params.type);
    if (params.region) q = q.eq("region", params.region);
    const { data, error } = await q.limit(100);
    if (error) throw error;
    return (data ?? []) as EventRow[];
  });
}

export async function getEventBySlug(slug: string): Promise<{ event: EventRow; staff: EventStaffRow[]; sponsors: SponsorRow[] } | null> {
  return safe("event", null, async () => {
    const supabase = db();
    const { data: event, error } = await supabase.from("events").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw error;
    if (!event) return null;
    const [staff, links] = await Promise.all([
      supabase.from("event_staff").select("*").eq("event_id", event.id).order("sort_order"),
      supabase.from("event_sponsors").select("sponsor_id").eq("event_id", event.id),
    ]);
    let sponsors: SponsorRow[] = [];
    const ids = (links.data ?? []).map((l) => l.sponsor_id);
    if (ids.length) {
      const res = await supabase.from("sponsors").select("*").in("id", ids).eq("active", true).order("sort_order");
      sponsors = (res.data ?? []) as SponsorRow[];
    }
    return { event: event as EventRow, staff: (staff.data ?? []) as EventStaffRow[], sponsors };
  });
}

export async function getPublishedEventSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  return safe("event-slugs", [], async () => {
    const { data } = await db().from("events").select("slug, updated_at").eq("status", "published");
    return data ?? [];
  });
}

// -------------------------------------------------------------- athletes
export type AthleteSearchParams = {
  q?: string;
  year?: number;
  position?: string;
  region?: string;
  team?: string;
  sort?: "name" | "class" | "newest";
  page?: number;
};

function sanitizeSearch(q: string): string {
  return q.replace(/[%_,()*\\]/g, " ").trim().slice(0, 60);
}

export async function searchAthletes(params: AthleteSearchParams) {
  return safe("search-athletes", { athletes: [] as AthleteRow[], total: 0, page: 1, pageSize: PAGE_SIZE }, async () => {
    const page = Math.max(1, params.page ?? 1);
    let q = db().from("athletes").select(ATHLETE_PUBLIC_COLUMNS, { count: "exact" });
    const term = params.q ? sanitizeSearch(params.q) : "";
    if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,display_name.ilike.%${term}%`);
    if (params.year) q = q.eq("graduation_year", params.year);
    if (params.position) q = q.or(`primary_position.eq.${params.position},secondary_position.eq.${params.position}`);
    if (params.region) q = q.eq("region", params.region);
    if (params.team) q = q.eq("team", params.team);
    if (params.sort === "class") q = q.order("graduation_year", { ascending: true }).order("last_name");
    else if (params.sort === "newest") q = q.order("approved_at", { ascending: false, nullsFirst: false });
    else q = q.order("last_name").order("first_name");
    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    return { athletes: (data ?? []) as unknown as AthleteRow[], total: count ?? 0, page, pageSize: PAGE_SIZE };
  });
}

export async function getAthleteFilterOptions() {
  return safe("athlete-filters", { years: [] as number[], teams: [] as string[], regions: [] as string[] }, async () => {
    const { data } = await db().from("athletes").select("graduation_year, team, region").limit(1000);
    const rows = data ?? [];
    const uniq = <T,>(xs: (T | null)[]) => [...new Set(xs.filter((x): x is T => x !== null && x !== ""))];
    return {
      years: uniq(rows.map((r) => r.graduation_year as number | null)).sort(),
      teams: uniq(rows.map((r) => r.team as string | null)).sort(),
      regions: uniq(rows.map((r) => r.region as string | null)).sort(),
    };
  });
}

export type AthleteResultView = {
  id: string;
  value: number;
  unit: string;
  protocol: string;
  attempt_number: number;
  tested_on: string | null;
  test: Pick<TestTypeRow, "id" | "slug" | "name" | "unit" | "direction" | "decimals" | "sort_order">;
  event: { id: string; slug: string; title: string; event_date: string | null } | null;
};

const RESULT_SELECT =
  "id, value, unit, protocol, attempt_number, tested_on, test:combine_test_types!inner(id, slug, name, unit, direction, decimals, sort_order), event:events(id, slug, title, event_date)";

export async function getAthleteBySlug(slug: string) {
  return safe("athlete", null, async () => {
    const supabase = db();
    const { data: athlete, error } = await supabase.from("athletes").select(ATHLETE_PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!athlete) return null;
    const [results, participation] = await Promise.all([
      supabase.from("combine_results").select(RESULT_SELECT).eq("athlete_id", athlete.id).order("tested_on", { ascending: false }),
      supabase.from("event_participation").select("status, event:events(id, slug, title, event_date, status)").eq("athlete_id", athlete.id),
    ]);
    return {
      athlete: athlete as unknown as AthleteRow,
      results: (results.data ?? []) as unknown as AthleteResultView[],
      events: ((participation.data ?? []) as unknown as { status: string; event: { id: string; slug: string; title: string; event_date: string | null; status: string } | null }[])
        .map((p) => p.event)
        .filter((e): e is NonNullable<typeof e> => !!e),
    };
  });
}

/** Best verified result per test for a set of athletes (used for featured cards). */
export async function getBestMetrics(athleteIds: string[]) {
  const out = new Map<string, { slug: string; name: string; unit: string; decimals: number; value: number }[]>();
  if (!athleteIds.length) return out;
  return safe("best-metrics", out, async () => {
    const { data } = await db()
      .from("combine_results")
      .select("athlete_id, value, protocol, test:combine_test_types!inner(slug, name, unit, direction, decimals, sort_order)")
      .in("athlete_id", athleteIds)
      .eq("protocol", "standard");
    const rows = (data ?? []) as unknown as { athlete_id: string; value: number; test: { slug: string; name: string; unit: string; direction: Direction; decimals: number; sort_order: number } }[];
    const byAthlete = new Map<string, Map<string, (typeof rows)[number]>>();
    for (const r of rows) {
      const m = byAthlete.get(r.athlete_id) ?? new Map();
      const cur = m.get(r.test.slug);
      const better = !cur || (r.test.direction === "lower_is_better" ? Number(r.value) < Number(cur.value) : Number(r.value) > Number(cur.value));
      if (better) m.set(r.test.slug, r);
      byAthlete.set(r.athlete_id, m);
    }
    for (const [id, m] of byAthlete) {
      out.set(
        id,
        [...m.values()]
          .sort((a, b) => a.test.sort_order - b.test.sort_order)
          .map((r) => ({ slug: r.test.slug, name: r.test.name, unit: r.test.unit, decimals: r.test.decimals, value: Number(r.value) })),
      );
    }
    return out;
  });
}

export async function getFeaturedAthletes(limit = 4) {
  return safe("featured-athletes", { athletes: [] as AthleteRow[], metrics: new Map<string, { slug: string; name: string; unit: string; decimals: number; value: number }[]>() }, async () => {
    const { data, error } = await db()
      .from("athletes")
      .select(ATHLETE_PUBLIC_COLUMNS)
      .eq("featured", true)
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    const athletes = (data ?? []) as unknown as AthleteRow[];
    const metrics = await getBestMetrics(athletes.map((a) => a.id));
    return { athletes, metrics };
  });
}

// ---------------------------------------------------------- leaderboards
export async function getTestTypes(): Promise<TestTypeRow[]> {
  return safe("test-types", [], async () => {
    const { data, error } = await db().from("combine_test_types").select("*").eq("active", true).order("sort_order");
    if (error) throw error;
    return (data ?? []) as TestTypeRow[];
  });
}

export type LeaderboardFilters = { eventId?: string; year?: number; grade?: number; position?: string; region?: string; protocol?: string };

type LeaderRow = LeaderboardInput & {
  athleteSlug: string;
  athleteImage: string | null;
  position: string | null;
  gradYear: number | null;
  team: string | null;
  region: string | null;
};

export async function getLeaderboard(testSlug: string, filters: LeaderboardFilters = {}, limit = 25) {
  const empty = { test: null as TestTypeRow | null, entries: [] as ReturnType<typeof buildLeaderboard<LeaderRow>>, protocols: [] as string[], protocol: "standard" };
  return safe("leaderboard", empty, async () => {
    const supabase = db();
    const { data: test } = await supabase.from("combine_test_types").select("*").eq("slug", testSlug).eq("active", true).maybeSingle();
    if (!test) return empty;
    const rows: LeaderRow[] = [];
    for (let from = 0; from < 5000; from += 1000) {
      let q = supabase
        .from("combine_results")
        .select(
          "id, athlete_id, value, protocol, tested_on, event_id, athlete:athletes!inner(slug, first_name, last_name, display_name, profile_image_path, primary_position, graduation_year, current_grade, team, region), event:events(slug, title, event_date)",
        )
        .eq("test_type_id", test.id)
        .eq("verification_status", "verified")
        .eq("is_current", true);
      if (filters.eventId) q = q.eq("event_id", filters.eventId);
      if (filters.year) q = q.eq("athlete.graduation_year", filters.year);
      if (filters.grade) q = q.eq("athlete.current_grade", filters.grade);
      if (filters.position) q = q.eq("athlete.primary_position", filters.position);
      if (filters.region) q = q.eq("athlete.region", filters.region);
      const { data, error } = await q.range(from, from + 999);
      if (error) throw error;
      for (const r of (data ?? []) as unknown as {
        id: string; athlete_id: string; value: number; protocol: string; tested_on: string | null; event_id: string;
        athlete: { slug: string; first_name: string; last_name: string; display_name: string | null; profile_image_path: string | null; primary_position: string | null; graduation_year: number | null; team: string | null; region: string | null };
        event: { slug: string; title: string; event_date: string | null } | null;
      }[]) {
        rows.push({
          resultId: r.id,
          athleteId: r.athlete_id,
          value: Number(r.value),
          protocol: r.protocol,
          testedOn: r.tested_on,
          eventId: r.event_id,
          eventTitle: r.event?.title,
          eventSlug: r.event?.slug,
          eventDate: r.event?.event_date ?? null,
          athleteName: athleteName(r.athlete),
          athleteSlug: r.athlete.slug,
          athleteImage: r.athlete.profile_image_path,
          position: r.athlete.primary_position,
          gradYear: r.athlete.graduation_year,
          team: r.athlete.team,
          region: r.athlete.region,
        });
      }
      if (!data || data.length < 1000) break;
    }
    const protocols = availableProtocols(rows);
    const protocol = filters.protocol && protocols.includes(filters.protocol) ? filters.protocol : protocols[0] ?? "standard";
    const entries = buildLeaderboard(rows, test.direction as Direction, protocol).slice(0, limit);
    return { test: test as TestTypeRow, entries, protocols, protocol };
  });
}

export async function getEventOptions() {
  return safe("event-options", [] as { id: string; title: string; event_date: string | null }[], async () => {
    const { data } = await db().from("events").select("id, title, event_date").in("status", ["published", "archived"]).order("event_date", { ascending: false }).limit(100);
    return data ?? [];
  });
}

// ----------------------------------------------------------------- news
export async function getLatestArticles(limit = 3): Promise<ArticleRow[]> {
  return safe("latest-articles", [], async () => {
    const { data, error } = await db()
      .from("articles")
      .select("id, slug, title, summary, cover_image_path, author_name, category, featured, status, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as ArticleRow[];
  });
}

export async function listArticles(params: { category?: string; page?: number; pageSize?: number } = {}) {
  const pageSize = params.pageSize ?? 9;
  return safe("list-articles", { articles: [] as ArticleRow[], total: 0, page: 1, pageSize }, async () => {
    const page = Math.max(1, params.page ?? 1);
    let q = db()
      .from("articles")
      .select("id, slug, title, summary, cover_image_path, author_name, category, featured, status, published_at", { count: "exact" })
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });
    if (params.category) q = q.eq("category", params.category);
    const from = (page - 1) * pageSize;
    const { data, count, error } = await q.range(from, from + pageSize - 1);
    if (error) throw error;
    return { articles: (data ?? []) as unknown as ArticleRow[], total: count ?? 0, page, pageSize };
  });
}

export async function getArticleBySlug(slug: string) {
  return safe("article", null, async () => {
    const supabase = db();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: related } = await supabase
      .from("articles")
      .select("id, slug, title, summary, cover_image_path, author_name, category, published_at")
      .eq("status", "published")
      .neq("id", data.id)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(12);
    const rel = ((related ?? []) as unknown as ArticleRow[]).sort((a, b) => Number(b.category === data.category) - Number(a.category === data.category)).slice(0, 3);
    return { article: data as ArticleRow, related: rel };
  });
}

export async function getPublishedArticleSlugs() {
  return safe("article-slugs", [] as { slug: string; updated_at: string }[], async () => {
    const { data } = await db().from("articles").select("slug, updated_at").eq("status", "published");
    return data ?? [];
  });
}

// ------------------------------------------------------------- sponsors
export async function getSponsors(): Promise<SponsorRow[]> {
  return safe("sponsors", [], async () => {
    const { data, error } = await db().from("sponsors").select("*").eq("active", true).order("featured", { ascending: false }).order("sort_order").order("name");
    if (error) throw error;
    return (data ?? []) as SponsorRow[];
  });
}

// -------------------------------------------------------------- rankings
export async function listRankings(): Promise<RankingRow[]> {
  return safe("rankings", [], async () => {
    const { data, error } = await db().from("rankings").select("*").eq("status", "published").order("published_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as RankingRow[];
  });
}

export async function getRankingBySlug(slug: string) {
  return safe("ranking", null, async () => {
    const supabase = db();
    const { data: ranking, error } = await supabase.from("rankings").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw error;
    if (!ranking) return null;
    const { data: entries } = await supabase
      .from("ranking_entries")
      .select("id, rank, note, athlete:athletes!inner(slug, first_name, last_name, display_name, profile_image_path, primary_position, graduation_year, team, region)")
      .eq("ranking_id", ranking.id)
      .order("rank");
    return { ranking: ranking as RankingRow, entries: (entries ?? []) as unknown as { id: string; rank: number; note: string | null; athlete: Pick<AthleteRow, "slug" | "first_name" | "last_name" | "display_name" | "profile_image_path" | "primary_position" | "graduation_year" | "team" | "region"> }[] };
  });
}
