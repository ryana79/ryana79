import Link from "next/link";
import { Calendar } from "lucide-react";
import { CALENDAR_2027, FEATURED_2027, type CalendarEvent } from "@/lib/events/calendar-2027";
import { Section, SectionHeader } from "./section";
import { Badge } from "./cards";
import { EventUpdatesButton } from "./event-updates";

function DateMark({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-36 items-end bg-[#0c121c] p-5 sm:min-h-48 sm:p-6">
      <p className="font-display text-3xl font-extrabold uppercase leading-none text-white sm:text-4xl">{label}</p>
    </div>
  );
}

export function CalendarSpotlight({ event = FEATURED_2027 }: { event?: CalendarEvent }) {
  return (
    <article className="card-surface relative mb-5 grid overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <DateMark label={event.dateLabel} />
      <div className="flex min-w-0 flex-col justify-center gap-4 p-4 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Next event</Badge>
          <Badge tone="warn">Registration coming soon</Badge>
        </div>
        <h3 className="font-display text-[2.1rem] font-extrabold uppercase leading-[0.92] tracking-wide text-balance sm:text-5xl">
          <Link href={`/events/${event.slug}`} className="hover:text-brand">{event.title}</Link>
        </h3>
        <p className="flex items-start gap-2 text-sm text-white/70"><Calendar className="mt-0.5 size-4 shrink-0 text-brand" />{event.dateLabel}</p>
        <p className="max-w-xl text-base text-white/75">{event.teaser}</p>
        <EventUpdatesButton slug={event.slug} className="w-full sm:w-auto" />
      </div>
    </article>
  );
}

export function Calendar2027Section({ embedded = false }: { embedded?: boolean } = {}) {
  const body = (
    <>
      <SectionHeader eyebrow="2027" title="2027 Event Calendar" description="Names and dates for the year ahead. Registration is not open yet." />
      <ul className="grid gap-4 md:grid-cols-2">
        {CALENDAR_2027.map((event) => (
          <li key={event.slug} className="card-surface flex h-full flex-col gap-3 p-5">
            <p className="text-sm font-medium text-brand">{event.dateLabel}</p>
            <h3 className="font-display text-3xl font-extrabold uppercase leading-none">
              <Link href={`/events/${event.slug}`} className="hover:text-brand">{event.title}</Link>
            </h3>
            <p className="text-sm leading-relaxed text-white/70">{event.teaser}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Registration coming soon</p>
            <div className="mt-auto pt-2">
              <EventUpdatesButton slug={event.slug} size="sm" className="w-full sm:w-auto" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
  if (embedded) return <div id="calendar-2027" className="mb-12 mt-2">{body}</div>;
  return <Section id="calendar-2027">{body}</Section>;
}

export function CalendarEventCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="card-surface flex h-full flex-col gap-3 p-5">
      <p className="text-sm font-medium text-brand">{event.dateLabel}</p>
      <h3 className="font-display text-[1.65rem] font-extrabold uppercase leading-[0.95]">
        <Link href={`/events/${event.slug}`} className="hover:text-brand">{event.title}</Link>
      </h3>
      <p className="text-sm text-white/70">{event.teaser}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Registration coming soon</p>
      <div className="mt-auto pt-2">
        <EventUpdatesButton slug={event.slug} size="sm" className="relative z-20 w-full" />
      </div>
    </article>
  );
}

export function CalendarEventPage({ event }: { event: CalendarEvent }) {
  return (
    <header className="hero-glow relative pt-24 sm:pt-32">
      <Section className="!pt-0">
        <p className="text-sm text-white/50"><Link href="/events" className="hover:text-white">Events</Link> / {event.title}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="warn">Registration coming soon</Badge>
        </div>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.92] sm:text-6xl">{event.title}</h1>
        <p className="mt-4 text-lg text-white/80">{event.dateLabel}</p>
        <p className="mt-3 max-w-2xl text-base text-white/70">{event.teaser}</p>
        {event.details.length ? (
          <ul className="mt-4 max-w-2xl space-y-1 text-white/75">
            {event.details.map((line) => <li key={line}>{line}</li>)}
          </ul>
        ) : null}
        <div className="mt-6">
          <EventUpdatesButton slug={event.slug} className="w-full sm:w-auto" />
        </div>
      </Section>
    </header>
  );
}
