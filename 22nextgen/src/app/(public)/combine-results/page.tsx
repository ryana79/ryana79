import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Medal } from "lucide-react";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { Btn } from "@/components/site/btn";
import { getEventOptions, getLeaderboard, getTestTypes } from "@/lib/data/public";
import { formatEventDate, formatMeasurement } from "@/lib/format";
import { POSITIONS, REGIONS } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Football Combine Results & Leaderboards",
  description: "Verified youth football combine results: 40-yard dash, 10-yard split, 5-10-5 shuttle, vertical jump and broad jump leaderboards from 22 NEXT GEN events.",
  alternates: { canonical: "/combine-results" },
};

type SP = Promise<{ test?: string; event?: string; year?: string; grade?: string; position?: string; region?: string; protocol?: string }>;
const UUID = /^[0-9a-f-]{36}$/i;

export default async function CombineResultsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [tests, events] = await Promise.all([getTestTypes(), getEventOptions()]);
  const active = tests.find((t) => t.slug === sp.test) ?? tests[0];
  const filters = {
    eventId: sp.event && UUID.test(sp.event) ? sp.event : undefined,
    year: sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined,
    grade: sp.grade && /^\d{1,2}$/.test(sp.grade) ? Number(sp.grade) : undefined,
    position: POSITIONS.includes(sp.position as (typeof POSITIONS)[number]) ? sp.position : undefined,
    region: REGIONS.includes(sp.region as (typeof REGIONS)[number]) ? sp.region : undefined,
    protocol: sp.protocol,
  };
  const board = active ? await getLeaderboard(active.slug, filters, 100) : null;
  const tabHref = (slug: string) => {
    const q = new URLSearchParams({ test: slug });
    Object.entries({ event: sp.event, year: sp.year, grade: sp.grade, position: filters.position, region: filters.region }).forEach(([k, v]) => v && q.set(k, v));
    return `/combine-results?${q.toString()}`;
  };
  const years = [...new Set(Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i))];

  return (
    <>
      <PageHero eyebrow="Develop" title="Combine Results" description="Official leaderboards built only from results verified by 22 NEXT GEN staff. Each athlete appears once with their best eligible result and the event it came from." />
      <Section className="!pt-10">
        {!active ? (
          <EmptyState icon={<Medal className="size-6" />} title="Leaderboards are not available right now" description="Test categories could not be loaded. Please try again shortly." />
        ) : (
          <>
            <nav aria-label="Test category" className="mb-6 flex flex-wrap gap-2">
              {tests.map((t) => (
                <Link key={t.id} href={tabHref(t.slug)} aria-current={t.id === active.id ? "page" : undefined} className={cn("rounded-full border px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em] transition", t.id === active.id ? "border-brand bg-brand text-white" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white")}>{t.name}</Link>
              ))}
            </nav>

            <form method="get" className="mb-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto]" aria-label="Filter leaderboard">
              <input type="hidden" name="test" value={active.slug} />
              <label><span className="sr-only">Event</span><select name="event" defaultValue={filters.eventId ?? ""} className="field"><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.event_date ? ` (${formatEventDate(e.event_date, "short")})` : ""}</option>)}</select></label>
              <label><span className="sr-only">Graduation year</span><select name="year" defaultValue={filters.year ?? ""} className="field"><option value="">All classes</option>{years.map((y) => <option key={y} value={y}>Class of {y}</option>)}</select></label>
              <label><span className="sr-only">Grade</span><select name="grade" defaultValue={filters.grade ?? ""} className="field"><option value="">All grades</option>{Array.from({ length: 10 }, (_, i) => i + 3).map((g) => <option key={g} value={g}>Grade {g}</option>)}</select></label>
              <label><span className="sr-only">Position</span><select name="position" defaultValue={filters.position ?? ""} className="field"><option value="">All positions</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label><span className="sr-only">Region</span><select name="region" defaultValue={filters.region ?? ""} className="field"><option value="">All regions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></label>
              <Btn type="submit" size="sm" className="h-10">Apply</Btn>
            </form>

            {board && board.protocols.length > 1 ? (
              <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-white/50">Protocol (results are never mixed):</span>
                {board.protocols.map((p) => (
                  <Link key={p} href={`${tabHref(active.slug)}&protocol=${encodeURIComponent(p)}`} className={cn("rounded-full border px-3 py-1 capitalize", p === board.protocol ? "border-brand bg-brand/20 text-white" : "border-white/15 text-white/60")}>{p.replace(/_/g, " ")}</Link>
                ))}
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-3xl font-extrabold uppercase">{active.name}</h2>
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-300/80"><BadgeCheck className="size-4" /> Verified only · {active.direction === "lower_is_better" ? "lower is better" : "higher is better"}</p>
            </div>
            {active.protocol_note ? <p className="mb-4 text-sm text-white/50">{active.protocol_note}</p> : null}

            {board && board.entries.length ? (
              <div className="card-surface overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">{active.name} leaderboard</caption>
                  <thead className="border-b border-white/[0.08] text-left text-xs uppercase tracking-wider text-white/40">
                    <tr><th scope="col" className="w-16 px-4 py-3">Rank</th><th scope="col" className="px-4 py-3">Athlete</th><th scope="col" className="px-4 py-3">Class</th><th scope="col" className="px-4 py-3">Pos</th><th scope="col" className="px-4 py-3">Team</th><th scope="col" className="px-4 py-3">Event</th><th scope="col" className="px-4 py-3 text-right">Result</th></tr>
                  </thead>
                  <tbody>
                    {board.entries.map((e) => (
                      <tr key={e.resultId} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                        <td className="px-4 py-3 font-display text-2xl font-bold text-brand">{e.rank}</td>
                        <td className="px-4 py-3 font-medium"><Link href={`/athletes/${e.athleteSlug}`} className="hover:text-brand">{e.athleteName}</Link></td>
                        <td className="px-4 py-3 text-white/60">{e.gradYear ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60">{e.position ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60">{e.team ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60">{e.eventSlug ? <Link href={`/events/${e.eventSlug}`} className="hover:text-brand">{e.eventTitle}</Link> : e.eventTitle}</td>
                        <td className="px-4 py-3 text-right font-display text-2xl font-bold">{formatMeasurement(e.value, active.unit, active.decimals)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={<Medal className="size-6" />} title="No verified results match" description="Results appear here only after staff verify them. Try removing a filter, or check back after the next event." />
            )}
            <p className="mt-6 max-w-3xl text-xs text-white/40">Combine results are measured performance data from specific events and conditions. They are not scouting evaluations or predictions of future performance. Leaderboards show only athletes with approved public profiles.</p>
          </>
        )}
      </Section>
    </>
  );
}
