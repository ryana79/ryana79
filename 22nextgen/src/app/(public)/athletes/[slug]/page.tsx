import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, ChevronRight, MapPin, PlayCircle, ShieldCheck, Trophy } from "lucide-react";
import { getAthleteBySlug, type AthleteResultView } from "@/lib/data/public";
import { Section } from "@/components/site/section";
import { Badge } from "@/components/site/cards";
import { PlayerCard } from "@/components/site/player-card";
import { ButtonLink } from "@/components/site/btn";
import { athleteName, formatEventDate, formatHeight, formatMeasurement, formatWeight } from "@/lib/format";
import { parseVideoUrl } from "@/lib/video";
import { isAthleteIndexable } from "@/lib/privacy";
import { mediaUrl } from "@/lib/media";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAthleteBySlug(slug);
  if (!data) return { title: "Athlete not found", robots: { index: false } };
  const a = data.athlete;
  const name = athleteName(a);
  const desc = [a.primary_position, a.graduation_year ? `Class of ${a.graduation_year}` : null, a.team].filter(Boolean).join(" · ");
  const image = mediaUrl(a.profile_image_path);
  return {
    title: `${name} | Athlete Profile`,
    description: `${name}${desc ? `: ${desc}.` : "."} Verified combine results and profile on 22 NEXT GEN.`,
    alternates: { canonical: `/athletes/${a.slug}` },
    robots: isAthleteIndexable() ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: `${name} | 22 NEXT GEN`, description: desc, images: image ? [{ url: image }] : undefined },
  };
}

function groupResults(results: AthleteResultView[]) {
  const groups = new Map<string, AthleteResultView[]>();
  for (const r of results) groups.set(r.test.slug, [...(groups.get(r.test.slug) ?? []), r]);
  return [...groups.values()].sort((a, b) => a[0].test.sort_order - b[0].test.sort_order);
}

export default async function AthletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getAthleteBySlug(slug);
  if (!data) notFound();
  const { athlete: a, results, events } = data;
  const name = athleteName(a);
  const groups = groupResults(results);
  const best = groups
    .map((g) => {
      const std = g.filter((r) => r.protocol === "standard");
      const pool = std.length ? std : g;
      const t = pool[0].test;
      const top = [...pool].sort((x, y) => (t.direction === "lower_is_better" ? Number(x.value) - Number(y.value) : Number(y.value) - Number(x.value)))[0];
      return { slug: t.slug, name: t.name, unit: t.unit, decimals: t.decimals, value: Number(top.value) };
    });
  const videos = a.highlight_urls.map(parseVideoUrl).filter((v): v is NonNullable<typeof v> => !!v);
  const facts = [
    { label: "Position", value: [a.primary_position, a.secondary_position].filter(Boolean).join(" / ") },
    { label: "Class", value: a.graduation_year ? `Class of ${a.graduation_year}` : "" },
    { label: "Grade", value: a.current_grade ? `${a.current_grade}th` : "" },
    { label: "Height", value: formatHeight(a.height_in) ?? "" },
    { label: "Weight", value: formatWeight(a.weight_lb) ?? "" },
    { label: "Team", value: a.team ?? "" },
    { label: "School", value: a.school_public ?? "" },
    { label: "Hometown", value: [a.town, a.state].filter(Boolean).join(", ") },
    { label: "Region", value: a.region ?? "" },
  ].filter((f) => f.value);

  return (
    <>
      <header className="hero-glow relative overflow-hidden pt-28 sm:pt-36">
        <div className="yard-lines absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 pb-12 sm:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-white/50">
            <Link href="/athletes" className="hover:text-white">Athletes</Link><ChevronRight className="size-3.5" /><span className="text-white/80">{name}</span>
          </nav>
          <div className="flex flex-wrap gap-2">
            {a.primary_position ? <Badge>{a.primary_position}</Badge> : null}
            {a.graduation_year ? <Badge tone="neutral">Class of {a.graduation_year}</Badge> : null}
            {best.length ? <Badge tone="success">Verified combine results</Badge> : null}
          </div>
          <h1 className="display-xl mt-4 text-6xl sm:text-8xl lg:text-9xl">{name}</h1>
          <p className="mt-3 flex items-center gap-2 text-lg text-white/65"><MapPin className="size-5 text-brand" />{[a.team, a.town && a.state ? `${a.town}, ${a.state}` : a.region].filter(Boolean).join(" · ") || "22 NEXT GEN athlete"}</p>
        </div>
      </header>

      <Section className="!pt-10">
        <div className="grid gap-12 lg:grid-cols-[22rem_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PlayerCard athlete={a} metrics={best} />
            <p className="mt-4 text-center text-xs text-white/40">Downloadable player cards are planned for NEXT GEN+.</p>
          </div>

          <div className="min-w-0 space-y-12">
            <section aria-labelledby="measurables">
              <h2 id="measurables" className="display-xl mb-5 text-4xl">Profile</h2>
              <dl className="grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
                {facts.map((f) => (<div key={f.label} className="bg-[#151515] p-4"><dt className="text-xs uppercase tracking-wider text-white/45">{f.label}</dt><dd className="mt-1 font-display text-2xl font-bold">{f.value}</dd></div>))}
              </dl>
              <p className="mt-3 flex items-start gap-2 text-xs text-white/45"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />Self-reported measurements are not verified results. Only combine results verified by 22 NEXT GEN staff are labelled verified.</p>
              {a.bio ? <p className="prose-ng mt-6 whitespace-pre-line">{a.bio}</p> : null}
            </section>

            <section aria-labelledby="combine">
              <h2 id="combine" className="display-xl mb-5 flex items-center gap-3 text-4xl"><Trophy className="size-7 text-brand" /> Verified combine results</h2>
              {groups.length ? (
                <div className="space-y-5">
                  {groups.map((g) => {
                    const t = g[0].test;
                    return (
                      <div key={t.slug} className="card-surface overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                          <h3 className="font-display text-2xl font-bold uppercase">{t.name}</h3>
                          <span className="text-xs uppercase tracking-wider text-white/40">{t.direction === "lower_is_better" ? "Lower is better" : "Higher is better"}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <caption className="sr-only">{t.name} results history</caption>
                            <thead className="text-left text-xs uppercase tracking-wider text-white/40"><tr><th scope="col" className="px-5 py-2">Event</th><th scope="col" className="px-5 py-2">Date</th><th scope="col" className="px-5 py-2">Protocol</th><th scope="col" className="px-5 py-2 text-right">Result</th></tr></thead>
                            <tbody>
                              {g.map((r) => (
                                <tr key={r.id} className="border-t border-white/[0.05]">
                                  <td className="px-5 py-3">{r.event ? <Link className="hover:text-brand" href={`/events/${r.event.slug}`}>{r.event.title}</Link> : "—"}</td>
                                  <td className="px-5 py-3 text-white/60">{r.tested_on ? formatEventDate(r.tested_on, "short") : r.event?.event_date ? formatEventDate(r.event.event_date, "short") : "—"}</td>
                                  <td className="px-5 py-3 capitalize text-white/60">{r.protocol.replace(/_/g, " ")}</td>
                                  <td className="px-5 py-3 text-right font-display text-xl font-bold">{formatMeasurement(Number(r.value), r.unit, t.decimals)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">No verified combine results yet.</p>
              )}
            </section>

            {videos.length ? (
              <section aria-labelledby="highlights">
                <h2 id="highlights" className="display-xl mb-5 flex items-center gap-3 text-4xl"><PlayCircle className="size-7 text-brand" /> Highlights</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  {videos.map((v) => v.embed ? (
                    <div key={v.url} className="aspect-video overflow-hidden rounded-xl border border-white/10">
                      <iframe src={v.embed} title={`${name} highlight video`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="size-full" />
                    </div>
                  ) : (
                    <ButtonLink key={v.url} href={v.url} external variant="dark" className="h-24">Watch highlights on {v.host}</ButtonLink>
                  ))}
                </div>
              </section>
            ) : null}

            {a.awards.length || a.achievements.length ? (
              <section aria-labelledby="awards">
                <h2 id="awards" className="display-xl mb-5 flex items-center gap-3 text-4xl"><Award className="size-7 text-brand" /> Awards &amp; achievements</h2>
                <ul className="space-y-2">{[...a.awards, ...a.achievements].map((x, i) => <li key={i} className="flex gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />{x}</li>)}</ul>
              </section>
            ) : null}

            {events.length ? (
              <section aria-labelledby="participation">
                <h2 id="participation" className="display-xl mb-5 text-4xl">Event participation</h2>
                <ul className="grid gap-3 sm:grid-cols-2">{events.map((e) => <li key={e.id}><Link href={`/events/${e.slug}`} className="card-surface card-hover block p-4"><p className="font-display text-xl font-bold uppercase">{e.title}</p><p className="text-sm text-white/50">{formatEventDate(e.event_date)}</p></Link></li>)}</ul>
              </section>
            ) : null}

            <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs text-white/50">
              This profile is public with the consent of the athlete&apos;s parent or guardian. To request a correction, withdraw consent or ask for deletion, use the <Link href="/privacy#requests" className="text-brand underline underline-offset-4">privacy request form</Link>.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
