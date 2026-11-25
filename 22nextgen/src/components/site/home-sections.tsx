import Link from "next/link";
import { ArrowRight, CalendarX2, Check, Clock, Medal, Newspaper, Sparkles, Trophy, UserRoundCheck } from "lucide-react";
import { ButtonLink } from "./btn";
import { Section, SectionHeader, EmptyState } from "./section";
import { HeroItem, HeroStagger, Reveal } from "./reveal";
import { MediaImage } from "./media";
import { AthleteCard, ArticleCard, EventCard, SponsorLogo } from "./cards";
import { formatCents, formatMeasurement } from "@/lib/format";
import type { ArticleRow, AthleteRow, EventRow, HomepageSettings, MembershipSettings, SponsorRow, TestTypeRow } from "@/lib/types";
import type { getLeaderboard } from "@/lib/data/public";
import { BRAND } from "@/lib/site";

export function Hero({ hero }: { hero: HomepageSettings["hero"] }) {
  return (
    <section className="hero-glow grain relative isolate flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-24">
      {hero.background_image_path ? (
        <div className="absolute inset-0 -z-10">
          <MediaImage path={hero.background_image_path} alt="" sizes="100vw" priority className="opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#080808]" />
        </div>
      ) : null}
      <div className="yard-lines absolute inset-0 -z-10" aria-hidden />
      <div className="absolute -right-24 top-24 -z-10 hidden h-[34rem] w-[34rem] rounded-full border border-brand/20 lg:block" aria-hidden />
      <div className="absolute -right-8 top-40 -z-10 hidden h-[26rem] w-[26rem] rounded-full border border-brand/15 lg:block" aria-hidden />
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <HeroStagger>
          <HeroItem>
            <p className="eyebrow mb-5 flex items-center gap-3"><span className="h-px w-10 bg-brand" /> {BRAND.company}</p>
          </HeroItem>
          <HeroItem>
            <h1 className="display-xl text-[5.2rem] sm:text-[9rem] lg:text-[12.5rem]">{hero.headline}</h1>
          </HeroItem>
          <HeroItem>
            <p className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.18em] text-brand sm:text-4xl">{hero.subhead}</p>
          </HeroItem>
          <HeroItem>
            <p className="mt-5 max-w-xl text-lg text-white/70 sm:text-xl">{hero.tagline}</p>
          </HeroItem>
          <HeroItem>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={hero.primary_cta_href} size="lg">{hero.primary_cta_label} <ArrowRight className="size-5" /></ButtonLink>
              <ButtonLink href={hero.secondary_cta_href} size="lg" variant="outline">{hero.secondary_cta_label}</ButtonLink>
            </div>
          </HeroItem>
        </HeroStagger>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#080808] to-transparent" aria-hidden />
    </section>
  );
}

export function UpcomingEventsSection({ cfg, events }: { cfg: HomepageSettings["events"]; events: EventRow[] }) {
  return (
    <Section id="events">
      <SectionHeader eyebrow="Compete" title={cfg.title} description={cfg.description} href="/events" hrefLabel="All events" />
      {events.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => (
            <Reveal key={e.id} delay={i * 0.06}><EventCard event={e} /></Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarX2 className="size-6" />}
          title="New dates are on the way"
          description="No events are scheduled right now. Dates are announced here first. Create an athlete profile or contact us to be told when registration opens."
          action={<div className="flex flex-wrap justify-center gap-3"><ButtonLink href="/register" size="sm">Create Athlete Profile</ButtonLink><ButtonLink href="/contact" size="sm" variant="outline">Contact Us</ButtonLink></div>}
        />
      )}
    </Section>
  );
}

export function FeaturedAthletesSection({ cfg, athletes, metrics }: { cfg: HomepageSettings["athletes"]; athletes: AthleteRow[]; metrics: Map<string, { slug: string; name: string; unit: string; decimals: number; value: number }[]> }) {
  return (
    <Section tone="surface2">
      <SectionHeader eyebrow="Get Discovered" title={cfg.title} description={cfg.description} href="/athletes" hrefLabel="Athlete directory" />
      {athletes.length ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {athletes.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.06}><AthleteCard athlete={a} metrics={metrics.get(a.id)} /></Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UserRoundCheck className="size-6" />}
          title="Featured athletes coming soon"
          description="Profiles are published only after parental consent is recorded and the profile is reviewed. Approved athletes will be featured here."
          action={<ButtonLink href="/register" size="sm">Create Athlete Profile</ButtonLink>}
        />
      )}
    </Section>
  );
}

type Board = Awaited<ReturnType<typeof getLeaderboard>>;

export function LeaderboardsSection({ cfg, boards }: { cfg: HomepageSettings["leaderboards"]; boards: Board[] }) {
  const withData = boards.filter((b) => b.test);
  const any = withData.some((b) => b.entries.length > 0);
  return (
    <Section>
      <SectionHeader eyebrow="Develop" title={cfg.title} description={cfg.description} href="/combine-results" hrefLabel="Full leaderboards" />
      {any ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {withData.map((b) => (
            <div key={b.test!.id} className="card-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide">{b.test!.name}</h3>
                <Trophy className="size-5 text-brand" />
              </div>
              {b.entries.length ? (
                <ol className="space-y-1">
                  {b.entries.slice(0, 5).map((e) => (
                    <li key={e.resultId}>
                      <Link href={`/athletes/${e.athleteSlug}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/[0.05]">
                        <span className="w-6 text-center font-display text-xl font-bold text-brand">{e.rank}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{e.athleteName}</span>
                          <span className="block truncate text-xs text-white/45">{[e.position, e.gradYear ? `Class of ${e.gradYear}` : null, e.eventTitle].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="font-display text-xl font-bold">{formatMeasurement(e.value, b.test!.unit, b.test!.decimals)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-6 text-center text-sm text-white/45">No verified results yet.</p>
              )}
              <p className="mt-3 text-[11px] uppercase tracking-wider text-white/35">{b.test!.direction === "lower_is_better" ? "Lower is better" : "Higher is better"} · verified only</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Medal className="size-6" />}
          title="Leaderboards launch with verified results"
          description="Only results verified by 22 NEXT GEN staff appear here. Nothing unverified is ever shown as official."
          action={<ButtonLink href="/combine-results" size="sm" variant="outline">How results work</ButtonLink>}
        />
      )}
    </Section>
  );
}

export function NewsSection({ cfg, articles }: { cfg: HomepageSettings["news"]; articles: ArticleRow[] }) {
  return (
    <Section tone="surface2">
      <SectionHeader eyebrow="The Latest" title={cfg.title} description={cfg.description} href="/news" hrefLabel="All stories" />
      {articles.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {articles.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.06}><ArticleCard article={a} /></Reveal>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Newspaper className="size-6" />} title="Stories are coming" description="Athlete spotlights, combine recaps, announcements and development content will be published here." />
      )}
    </Section>
  );
}

export function MembershipPromo({ cfg, membership }: { cfg: HomepageSettings["membership"]; membership: MembershipSettings }) {
  return (
    <Section>
      <div className="hero-glow relative overflow-hidden rounded-2xl border border-brand/30 p-8 sm:p-12 lg:p-16">
        <div className="yard-lines absolute inset-0" aria-hidden />
        <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow mb-3 flex items-center gap-2"><Sparkles className="size-4" /> {membership.name}</p>
            <h2 className="display-xl text-5xl sm:text-7xl">{cfg.title}</h2>
            <p className="mt-4 max-w-xl text-lg text-white/70">{cfg.description}</p>
            <ul className="mt-6 grid gap-2 text-white/80 sm:grid-cols-2">
              {membership.planned_benefits.slice(0, 6).map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm"><Clock className="mt-0.5 size-4 shrink-0 text-brand" /> {b}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs uppercase tracking-wider text-white/45">Planned benefits — {membership.billing_enabled ? "billing active" : "membership billing is not active yet"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-widest text-white/50">Planned price</p>
            <p className="font-display text-6xl font-extrabold">{formatCents(membership.price_cents)}<span className="text-xl font-semibold text-white/50">/{membership.interval}</span></p>
            <div className="mt-6 grid gap-3">
              <ButtonLink href="/membership" size="md">Learn about {membership.name}</ButtonLink>
            </div>
            {!membership.billing_enabled ? <p className="mt-3 flex items-start gap-2 text-xs text-white/50"><Check className="mt-0.5 size-3.5 shrink-0" />No payment is taken yet. Register interest to be notified at launch.</p> : null}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function SponsorsSection({ cfg, sponsors }: { cfg: HomepageSettings["sponsors"]; sponsors: SponsorRow[] }) {
  return (
    <Section tone="surface">
      <SectionHeader eyebrow="Partners" title={cfg.title} description={cfg.description} href="/partners" hrefLabel="Become a partner" />
      {sponsors.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {sponsors.slice(0, 10).map((s) => (
            <li key={s.id}><SponsorLogo sponsor={s} /></li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Partner with the next generation" description="Event sponsorships and annual partnerships are available. Reach families, athletes and coaches across New Jersey and the Northeast." action={<ButtonLink href="/partners#inquiry" size="sm">Partnership inquiry</ButtonLink>} />
      )}
    </Section>
  );
}

export type { TestTypeRow };
