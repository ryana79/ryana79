import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserRoundCheck } from "lucide-react";
import { AthleteCard } from "@/components/site/cards";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { Btn, ButtonLink } from "@/components/site/btn";
import { getAthleteFilterOptions, getBestMetrics, searchAthletes } from "@/lib/data/public";
import { POSITIONS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Athlete Directory",
  description: "Search approved public 22 NEXT GEN athlete profiles by class, position, team and region. Profiles are published only with parental consent.",
  alternates: { canonical: "/athletes" },
};

type SP = Promise<{ q?: string; year?: string; position?: string; region?: string; team?: string; sort?: string; page?: string }>;

export default async function AthletesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined;
  const position = POSITIONS.includes(sp.position as (typeof POSITIONS)[number]) ? sp.position : undefined;
  const sort = sp.sort === "class" || sp.sort === "newest" ? sp.sort : "name";
  const page = sp.page && /^\d+$/.test(sp.page) ? Math.min(Number(sp.page), 500) : 1;
  const [result, options] = await Promise.all([
    searchAthletes({ q: sp.q?.slice(0, 60), year, position, region: sp.region?.slice(0, 40), team: sp.team?.slice(0, 80), sort, page }),
    getAthleteFilterOptions(),
  ]);
  const metrics = await getBestMetrics(result.athletes.map((a) => a.id));
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const filtered = !!(sp.q || year || position || sp.region || sp.team);

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.q) q.set("q", sp.q);
    if (year) q.set("year", String(year));
    if (position) q.set("position", position);
    if (sp.region) q.set("region", sp.region);
    if (sp.team) q.set("team", sp.team);
    if (sort !== "name") q.set("sort", sort);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/athletes?${s}` : "/athletes";
  };

  return (
    <>
      <PageHero eyebrow="Get Discovered" title="Athlete Directory" description="Approved public profiles only. Every profile is published with recorded parental or guardian consent and admin review." />
      <Section className="!pt-10">
        <form method="get" action="/athletes" className="mb-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)_auto]" role="search" aria-label="Search athletes">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Search by name</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name" className="field pl-9" maxLength={60} />
          </label>
          <label><span className="sr-only">Class</span>
            <select name="year" defaultValue={year ? String(year) : ""} className="field"><option value="">All classes</option>{options.years.map((y) => <option key={y} value={y}>Class of {y}</option>)}</select></label>
          <label><span className="sr-only">Position</span>
            <select name="position" defaultValue={position ?? ""} className="field"><option value="">All positions</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label><span className="sr-only">Region</span>
            <select name="region" defaultValue={sp.region ?? ""} className="field"><option value="">All regions</option>{options.regions.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label><span className="sr-only">Team</span>
            <select name="team" defaultValue={sp.team ?? ""} className="field"><option value="">All teams</option>{options.teams.map((t) => <option key={t}>{t}</option>)}</select></label>
          <div className="flex gap-2">
            <label className="flex-1"><span className="sr-only">Sort</span>
              <select name="sort" defaultValue={sort} className="field"><option value="name">Name A–Z</option><option value="class">Class</option><option value="newest">Newest</option></select></label>
            <Btn type="submit" size="sm" className="h-10">Search</Btn>
          </div>
        </form>

        <p className="mb-5 text-sm text-white/50" aria-live="polite">{result.total} {result.total === 1 ? "athlete" : "athletes"}{filtered ? " match your search" : ""}</p>

        {result.athletes.length ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{result.athletes.map((a) => <AthleteCard key={a.id} athlete={a} metrics={metrics.get(a.id)} />)}</div>
            {pages > 1 ? (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
                {page > 1 ? <ButtonLink href={pageHref(page - 1)} variant="outline" size="sm" rel="prev">Previous</ButtonLink> : null}
                <span className="px-3 text-sm text-white/60">Page {page} of {pages}</span>
                {page < pages ? <ButtonLink href={pageHref(page + 1)} variant="outline" size="sm" rel="next">Next</ButtonLink> : null}
              </nav>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={<UserRoundCheck className="size-6" />}
            title={filtered ? "No athletes match those filters" : "No public athlete profiles yet"}
            description={filtered ? "Try clearing a filter or searching a different name." : "Profiles appear here after parental consent is recorded and the profile is approved. Create a profile to get started."}
            action={filtered ? <Link href="/athletes" className="text-sm font-semibold text-brand underline underline-offset-4">Clear filters</Link> : <ButtonLink href="/register" size="sm">Create Athlete Profile</ButtonLink>}
          />
        )}
      </Section>
    </>
  );
}
