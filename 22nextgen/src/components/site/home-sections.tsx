import Link from "next/link";
import { ArrowRight, Calendar, CalendarX2, Check, Clock, MapPin, Medal, Newspaper, Sparkles, Target, Timer, Trophy, UserRoundCheck, Users } from "lucide-react";
import { ButtonLink } from "./btn";
import { Section, SectionHeader, EmptyState } from "./section";
import { HeroItem, HeroStagger, Reveal } from "./reveal";
import { MediaImage } from "./media";
import { AthleteCard, ArticleCard, Badge, EventCard, SponsorLogo } from "./cards";
import { dateParts, formatCents, formatEventDate, formatMeasurement, formatTimeRange } from "@/lib/format";
import { canRegister, eligibilityLabel, locationLabel, priceLabel, registrationLabel, typeLabel } from "@/lib/event-utils";
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

const EVENT_PITCHES = [
  {
    icon: Timer,
    title: "Combines",
    body: "Timed tests and jumps. Staff-verified numbers go on your profile and the public leaderboard.",
    href: "/events?type=combine",
  },
  {
    icon: Users,
    title: "Showcases",
    body: "Play and test where coaches can watch, with film and measurables tied to an approved profile.",
    href: "/events?type=showcase",
  },
  {
    icon: Target,
    title: "Development camps",
    body: "Position work and coaching reps for athletes who want more than a one-day test.",
    href: "/events?type=camp",
  },
] as const;

export function EventPromoSection({ cfg, featured }: { cfg: HomepageSettings["event_promo"]; featured: EventRow | null }) {
  const dp = featured ? dateParts(featured.event_date) : null;
  const open = featured ? canRegister(featured) : false;
  const when = featured
    ? [formatEventDate(featured.event_date), formatTimeRange(featured.start_time, featured.end_time, featured.time_zone, featured.event_date)].filter(Boolean).join(" · ")
    : null;

  return (
    <Section id="promote-events" className="!pb-8 sm:!pb-10">
      <SectionHeader eyebrow="Compete" title={cfg.title} description={cfg.description} href="/events" hrefLabel="All events" />
      {featured ? (
        <article className="card-surface relative mb-5 grid overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="relative min-h-56 sm:min-h-72">
            <MediaImage path={featured.hero_image_path ?? featured.card_image_path} alt="" sizes="(min-width: 1024px) 50vw, 100vw" priority className="size-full" placeholderLabel={`${featured.title} artwork`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-black/20 lg:bg-gradient-to-r" aria-hidden />
            {dp ? (
              <div className="absolute left-4 top-4 rounded-lg bg-black/70 px-3 py-2 text-center backdrop-blur">
                <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand">{dp.month}</div>
                <div className="font-display text-3xl font-extrabold leading-none">{dp.day}</div>
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Next event</Badge>
              <Badge tone="neutral">{typeLabel(featured.event_type)}</Badge>
              <Badge tone={open ? "success" : "warn"}>{registrationLabel(featured.registration_status)}</Badge>
            </div>
            <h3 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">{featured.title}</h3>
            <ul className="space-y-1.5 text-sm text-white/70">
              {when ? <li className="flex items-start gap-2"><Calendar className="mt-0.5 size-4 shrink-0 text-brand" />{when}</li> : null}
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" />{locationLabel(featured)}</li>
              <li className="flex items-start gap-2"><Users className="mt-0.5 size-4 shrink-0 text-brand" />{eligibilityLabel(featured)}</li>
            </ul>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <p className="font-display text-3xl font-extrabold">{priceLabel(featured)}</p>
              <ButtonLink href={`/events/${featured.slug}${open ? "#register" : ""}`} size="md">
                {open ? "Register now" : "View event"} <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </article>
      ) : (
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-white/70">The next date is not posted yet. New combines, showcases and camps are announced here first.</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/events" size="sm">Explore events</ButtonLink>
            <ButtonLink href="/contact" size="sm" variant="outline">Ask about dates</ButtonLink>
          </div>
        </div>
      )}
      <ul className="grid gap-4 md:grid-cols-3">
        {EVENT_PITCHES.map((pitch) => (
          <li key={pitch.title}>
            <Link href={pitch.href} className="card-surface card-hover flex h-full min-w-0 flex-col gap-3 p-5">
              <pitch.icon className="size-5 text-brand" aria-hidden />
              <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide">{pitch.title}</h3>
              <p className="text-sm text-white/65">{pitch.body}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand">See dates <ArrowRight className="size-4" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {withData.map((b) => (
            <div key={b.test!.id} className="card-surface min-w-0 p-5">
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
