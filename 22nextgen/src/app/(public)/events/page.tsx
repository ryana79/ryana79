import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { EventCard } from "@/components/site/cards";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { ButtonLink } from "@/components/site/btn";
import { listEvents } from "@/lib/data/public";
import { mergeTurkeyBowl } from "@/lib/events/turkey-bowl";
import { EVENT_TYPES, REGIONS } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Youth Football Combines, Showcases & Camps in New Jersey",
  description: "Browse upcoming 22 NEXT GEN youth football combines, showcases and development camps. Find dates, locations, eligible grades and registration.",
  alternates: { canonical: "/events" },
};

type SP = Promise<{ type?: string; region?: string; when?: string }>;

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const type = EVENT_TYPES.some((t) => t.value === sp.type) ? sp.type : undefined;
  const region = REGIONS.includes(sp.region as (typeof REGIONS)[number]) ? sp.region : undefined;
  const past = sp.when === "past";
  const events = mergeTurkeyBowl(await listEvents({ type, region, past }), { type, region, past });

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { type, region, when: past ? "past" : undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `/events?${s}` : "/events";
  };
  const chip = (active: boolean) =>
    cn("rounded-full border px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em] transition", active ? "border-brand bg-brand text-white" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white");

  return (
    <>
      <PageHero eyebrow="Compete" title={past ? "Past Events" : "Upcoming Events"} description="Combines, showcases and development camps built to test, teach and showcase the next generation of football talent." />
      <Section className="!pt-10">
        <div className="mb-8 flex flex-col gap-4">
          <nav aria-label="Event timing" className="flex gap-2">
            <Link href={href({ when: undefined })} className={chip(!past)} aria-current={!past ? "page" : undefined}>Upcoming</Link>
            <Link href={href({ when: "past" })} className={chip(past)} aria-current={past ? "page" : undefined}>Past</Link>
          </nav>
          <nav aria-label="Event type" className="flex flex-wrap gap-2">
            <Link href={href({ type: undefined })} className={chip(!type)}>All types</Link>
            {EVENT_TYPES.map((t) => <Link key={t.value} href={href({ type: t.value })} className={chip(type === t.value)}>{t.label}</Link>)}
          </nav>
          <nav aria-label="Region" className="flex flex-wrap gap-2">
            <Link href={href({ region: undefined })} className={chip(!region)}>All regions</Link>
            {REGIONS.slice(0, 5).map((r) => <Link key={r} href={href({ region: r })} className={chip(region === r)}>{r}</Link>)}
          </nav>
        </div>
        {events.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <EmptyState
            icon={<CalendarX2 className="size-6" />}
            title={past ? "No past events to show" : "No events match right now"}
            description={past ? "Completed events will be listed here." : "No upcoming events are scheduled with these filters. Check back soon, new dates are announced here first."}
            action={<ButtonLink href="/contact" size="sm" variant="outline">Ask about upcoming dates</ButtonLink>}
          />
        )}
      </Section>
    </>
  );
}
