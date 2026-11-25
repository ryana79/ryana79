import Link from "next/link";
import { Calendar, ChevronRight, Clock, ExternalLink, MapPin, Users } from "lucide-react";
import { Badge } from "./cards";
import { ButtonLink } from "./btn";
import { Section } from "./section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { TrackView } from "./track";
import { eventJsonLd, jsonLdString } from "@/lib/seo";
import { LOMBARDI_DIRECTIONS_URL, TURKEY_BOWL_COPY, TURKEY_BOWL_DIVISIONS, TURKEY_BOWL_SPONSORS } from "@/lib/events/turkey-bowl";
import type { EventRow } from "@/lib/types";

function ScheduleList({ steps }: { steps: readonly { time: string; title: string }[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step) => (
        <li key={step.time} className="flex items-baseline gap-3">
          <time className="w-20 shrink-0 font-display text-lg font-bold text-brand">{step.time}</time>
          <span className="text-white/85">{step.title}</span>
        </li>
      ))}
    </ol>
  );
}

export function TurkeyBowlPage({ event }: { event: EventRow }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(eventJsonLd(event)) }} />
      <TrackView name="event_page_view" params={{ event_slug: event.slug, event_type: event.event_type }} />

      <header className="relative isolate overflow-hidden pt-24 sm:pt-32">
        <div className="yard-lines absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-[#080808]/80 to-[#080808]" aria-hidden />
        <div className="mx-auto max-w-7xl px-5 pb-10 sm:px-8 sm:pb-16">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-white/50">
            <Link href="/events" className="hover:text-white">Events</Link>
            <ChevronRight className="size-3.5" />
            <span className="text-white/80">Turkey Bowl</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>Combine</Badge>
            <Badge tone="warn">Registration Closed</Badge>
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-brand">{TURKEY_BOWL_COPY.presentedBy}</p>
          <h1 className="mt-2 max-w-5xl font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-wide sm:text-6xl lg:text-7xl">{TURKEY_BOWL_COPY.title}</h1>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45"><Calendar className="size-3.5 text-brand" />Date</dt>
              <dd className="mt-1 font-medium">{TURKEY_BOWL_COPY.dateLabel}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45"><MapPin className="size-3.5 text-brand" />Location</dt>
              <dd className="mt-1 font-medium">{TURKEY_BOWL_COPY.locationLabel}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45"><Users className="size-3.5 text-brand" />Who</dt>
              <dd className="mt-1 font-medium">{TURKEY_BOWL_COPY.gradesLabel}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#check-in" size="lg">View Check-In Schedule</ButtonLink>
            <ButtonLink href={LOMBARDI_DIRECTIONS_URL} external variant="outline" size="lg">
              Get Directions <ExternalLink className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </header>

      <Section className="!pt-4">
        <div className="max-w-3xl space-y-4 text-lg text-white/75">
          <p>{TURKEY_BOWL_COPY.intro}</p>
        </div>

        <section id="check-in" aria-labelledby="check-in-heading" className="scroll-mt-24 mt-12">
          <h2 id="check-in-heading" className="display-xl text-4xl sm:text-5xl">Check-in schedule</h2>
          <p className="mt-3 max-w-2xl text-white/60">{TURKEY_BOWL_COPY.scheduleNote}</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {TURKEY_BOWL_DIVISIONS.map((division) => (
              <article key={division.name} className="card-surface p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{division.grades}</p>
                <h3 className="mt-1 font-display text-3xl font-extrabold uppercase">{division.name}</h3>
                <ScheduleList steps={division.steps} />
              </article>
            ))}
          </div>
          <div className="mt-6">
            <ButtonLink href="#future-events" variant="outline" size="md">Get Notified About Future Events</ButtonLink>
          </div>
        </section>

        <section aria-labelledby="expect-heading" className="mt-16">
          <h2 id="expect-heading" className="display-xl text-4xl sm:text-5xl">What to expect</h2>
          <ul className="mt-6 max-w-3xl space-y-4 text-white/75">
            {TURKEY_BOWL_COPY.expect.map((line) => (
              <li key={line} className="flex gap-3"><Clock className="mt-1 size-4 shrink-0 text-brand" />{line}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="families-heading" className="mt-16">
          <h2 id="families-heading" className="display-xl text-4xl sm:text-5xl">For families</h2>
          <p className="mt-4 max-w-3xl text-lg text-white/75">{TURKEY_BOWL_COPY.families}</p>
        </section>

        <section aria-labelledby="sponsors-heading" className="mt-16">
          <h2 id="sponsors-heading" className="display-xl text-4xl sm:text-5xl">Sponsors</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TURKEY_BOWL_SPONSORS.map((sponsor) => (
              <li key={sponsor.name} className="card-surface p-5">
                <p className="font-display text-2xl font-extrabold uppercase leading-tight">{sponsor.name}</p>
                <p className="mt-2 text-sm text-brand">{sponsor.belt}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="future-events" aria-labelledby="future-heading" className="scroll-mt-24 mt-16 max-w-2xl">
          <h2 id="future-heading" className="display-xl text-4xl sm:text-5xl">Future events</h2>
          <p className="mt-3 text-white/65">Get an email when the next 22 NEXT GEN combine, camp, or clinic is announced. This list is for future events, not Turkey Bowl registration.</p>
          <div className="mt-6">
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
    </>
  );
}
