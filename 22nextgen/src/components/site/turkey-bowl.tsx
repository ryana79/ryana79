import Link from "next/link";
import { Calendar, ChevronRight, ExternalLink, MapPin, Users } from "lucide-react";
import { Badge } from "./cards";
import { ButtonLink } from "./btn";
import { Section } from "./section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { TrackView } from "./track";
import { TurkeyBowlArt } from "./turkey-bowl-art";
import { TurkeyBowlMobileBar } from "./turkey-bowl-bar";
import { eventJsonLd, jsonLdString } from "@/lib/seo";
import { LOMBARDI_DIRECTIONS_URL, TURKEY_BOWL_COPY, TURKEY_BOWL_DIVISIONS, TURKEY_BOWL_SPONSORS } from "@/lib/events/turkey-bowl";
import type { EventRow } from "@/lib/types";

const EXPECT = [
  { title: "Testing", body: TURKEY_BOWL_COPY.expect[0] },
  { title: "All-star 7-on-7", body: TURKEY_BOWL_COPY.expect[1] },
  { title: "Awards", body: TURKEY_BOWL_COPY.expect[2] },
  { title: "Every athlete", body: TURKEY_BOWL_COPY.expect[3] },
] as const;

export function TurkeyBowlPage({ event }: { event: EventRow }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(eventJsonLd(event)) }} />
      <TrackView name="event_page_view" params={{ event_slug: event.slug, event_type: event.event_type }} />

      <header className="hero-glow relative isolate overflow-hidden pt-20 sm:pt-28">
        <div className="yard-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#080808]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-8 sm:px-8 sm:pb-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-12 lg:pb-16">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-white/50">
              <Link href="/events" className="hover:text-white">Events</Link>
              <ChevronRight className="size-3.5" />
              <span className="text-white/80">Turkey Bowl</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Combine</Badge>
              <Badge tone="warn">Registration Closed</Badge>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand sm:text-sm sm:tracking-[0.18em]">{TURKEY_BOWL_COPY.presentedBy}</p>
            <h1 className="mt-2 max-w-4xl font-display text-[2.45rem] font-extrabold uppercase leading-[0.9] tracking-wide text-balance sm:text-6xl lg:text-7xl">{TURKEY_BOWL_COPY.title}</h1>
            <ul className="mt-5 space-y-2 text-sm text-white/80 sm:text-base">
              <li className="flex items-start gap-2"><Calendar className="mt-0.5 size-4 shrink-0 text-brand" />{TURKEY_BOWL_COPY.dateLabel}</li>
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" />{TURKEY_BOWL_COPY.locationLabel}</li>
              <li className="flex items-start gap-2"><Users className="mt-0.5 size-4 shrink-0 text-brand" />{TURKEY_BOWL_COPY.gradesLabel}</li>
            </ul>
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
              <ButtonLink href="#check-in" size="md" className="h-12 w-full sm:h-14 sm:w-auto sm:px-8 sm:text-lg">View Check-In Schedule</ButtonLink>
              <ButtonLink href={LOMBARDI_DIRECTIONS_URL} external variant="outline" size="md" className="h-12 w-full sm:h-14 sm:w-auto sm:px-8 sm:text-lg">
                Get Directions <ExternalLink className="size-4" />
              </ButtonLink>
            </div>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">{TURKEY_BOWL_COPY.intro}</p>
          </div>
          <TurkeyBowlArt className="hidden min-h-[26rem] rounded-2xl border border-white/10 shadow-[0_30px_80px_-40px_rgba(20,125,255,0.8)] lg:flex" />
        </div>
      </header>

      <Section className="!pb-28 !pt-8 sm:!pb-20 sm:!pt-14 md:!pb-24">
        <section id="check-in" aria-labelledby="check-in-heading" className="scroll-mt-24">
          <h2 id="check-in-heading" className="display-xl text-4xl sm:text-5xl">Check-in schedule</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">{TURKEY_BOWL_COPY.scheduleNote}</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {TURKEY_BOWL_DIVISIONS.map((division) => (
              <article key={division.name} className="overflow-hidden rounded-xl border border-white/10 bg-[#121212]">
                <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{division.grades}</p>
                  <h3 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">{division.name}</h3>
                </div>
                <ol>
                  {division.steps.map((step) => (
                    <li key={step.time} className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3.5 last:border-b-0 sm:px-5">
                      <span className="text-sm text-white/85 sm:text-base">{step.title}</span>
                      <time className="shrink-0 font-display text-xl font-extrabold text-brand">{step.time}</time>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <div className="mt-4">
            <ButtonLink href="#future-events" variant="outline" size="md" className="h-12 w-full sm:w-auto">Get Notified About Future Events</ButtonLink>
          </div>
        </section>

        <section aria-labelledby="expect-heading" className="mt-14 sm:mt-16">
          <h2 id="expect-heading" className="display-xl text-4xl sm:text-5xl">What to expect</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {EXPECT.map((item, index) => (
              <li key={item.title} className="rounded-xl border border-white/10 bg-[#121212] p-4 sm:p-5">
                <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-brand">0{index + 1}</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="families-heading" className="mt-14 sm:mt-16">
          <div className="rounded-xl border border-brand/30 bg-brand/10 p-5 sm:p-6">
            <h2 id="families-heading" className="display-xl text-3xl sm:text-4xl">For families</h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">{TURKEY_BOWL_COPY.families}</p>
          </div>
        </section>

        <section aria-labelledby="sponsors-heading" className="mt-14 sm:mt-16">
          <h2 id="sponsors-heading" className="display-xl text-4xl sm:text-5xl">Sponsors</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {TURKEY_BOWL_SPONSORS.map((sponsor) => (
              <li key={sponsor.name} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#121212] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-display text-2xl font-extrabold uppercase leading-none">{sponsor.name}</p>
                <p className="w-fit rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9cc6ff]">{sponsor.belt}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="future-events" aria-labelledby="future-heading" className="scroll-mt-24 mt-14 max-w-2xl sm:mt-16">
          <h2 id="future-heading" className="display-xl text-4xl sm:text-5xl">Future events</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">Get an email when the next 22 NEXT GEN combine, camp, or clinic is announced. This list is for future events, not Turkey Bowl registration.</p>
          <div className="mt-5 rounded-xl border border-white/10 bg-[#121212] p-4 sm:p-6">
            <InquiryForm
              kind="contact"
              interest="future-events"
              cta="Get notified about future events"
              messageLabel="Which combines, camps, or clinics should we tell you about?"
              doneMessage="You're on the list. We'll email you about future 22 NEXT GEN combines, camps, and clinics."
            />
          </div>
        </section>
      </Section>

      <TurkeyBowlMobileBar />
    </>
  );
}
