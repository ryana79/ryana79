import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronRight, Clock, ExternalLink, MapPin, ShieldCheck, Ticket, Users } from "lucide-react";
import { getEventBySlug, getPublishedEventSlugs } from "@/lib/data/public";
import { MediaImage } from "@/components/site/media";
import { Badge, SponsorLogo } from "@/components/site/cards";
import { ButtonLink } from "@/components/site/btn";
import { Section, SectionHeader } from "@/components/site/section";
import { JotformEmbed } from "@/components/site/jotform-embed";
import { TrackClick, TrackView } from "@/components/site/track";
import { canRegister, eligibilityLabel, eventAddress, priceLabel, registrationLabel, typeLabel } from "@/lib/event-utils";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import { embedUrlForEvent } from "@/lib/jotform";
import { eventJsonLd, jsonLdString } from "@/lib/seo";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { mediaUrl } from "@/lib/media";
import { MediaGallery } from "@/components/site/media-gallery";
import { TurkeyBowlPage } from "@/components/site/turkey-bowl";
import { CalendarEventPage } from "@/components/site/event-calendar";
import { TURKEY_BOWL_COPY, TURKEY_BOWL_SLUG, asPublicTurkeyBowl } from "@/lib/events/turkey-bowl";
import { calendarEvent } from "@/lib/events/calendar-2027";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await getPublishedEventSlugs();
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const calendar = calendarEvent(slug);
  if (calendar) {
    return {
      title: calendar.title,
      description: calendar.teaser,
      alternates: { canonical: `/events/${calendar.slug}` },
    };
  }
  if (slug === TURKEY_BOWL_SLUG) {
    return {
      title: TURKEY_BOWL_COPY.title,
      description: "Registration is closed for the November 28, 2026 Turkey Bowl Youth Combine + Clinic at Lombardi Field in Old Bridge, NJ. Check-in times for grades 3–9.",
      alternates: { canonical: `/events/${TURKEY_BOWL_SLUG}` },
    };
  }
  const data = await getEventBySlug(slug);
  if (!data) return { title: "Event not found", robots: { index: false } };
  const { event: e } = data;
  const description = e.seo_description || e.summary || stripHtml(e.description).slice(0, 155) || `${e.title} by 22 NEXT GEN.`;
  const image = mediaUrl(e.hero_image_path ?? e.card_image_path);
  return {
    title: e.seo_title || e.title,
    description,
    alternates: { canonical: `/events/${e.slug}` },
    openGraph: { title: e.seo_title || e.title, description, type: "website", url: `/events/${e.slug}`, images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title: e.title, description, images: image ? [image] : undefined },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const calendarPage = calendarEvent(slug);
  if (calendarPage) return <CalendarEventPage event={calendarPage} />;
  if (slug === TURKEY_BOWL_SLUG) {
    const data = await getEventBySlug(slug);
    return <TurkeyBowlPage event={asPublicTurkeyBowl(data?.event)} />;
  }
  const data = await getEventBySlug(slug);
  if (!data) notFound();
  const { event: e, staff, sponsors } = data;
  const embed = embedUrlForEvent(e);
  const open = canRegister(e);
  const time = formatTimeRange(e.start_time, e.end_time, e.time_zone, e.event_date);
  const address = eventAddress(e);
  const mapsHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const facts = [
    { icon: Calendar, label: "Date", value: formatEventDate(e.event_date) },
    time ? { icon: Clock, label: "Time", value: time } : null,
    { icon: MapPin, label: "Location", value: address ?? "To be announced" },
    { icon: Users, label: "Eligibility", value: eligibilityLabel(e) },
    { icon: Ticket, label: "Price", value: priceLabel(e) + (e.price_note ? ` · ${e.price_note}` : "") },
  ].filter(Boolean) as { icon: typeof Calendar; label: string; value: string }[];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(eventJsonLd(e)) }} />
      <TrackView name="event_page_view" params={{ event_slug: e.slug, event_type: e.event_type }} />

      <header className="hero-glow relative isolate overflow-hidden pt-28 sm:pt-36">
        <div className="absolute inset-0 -z-10">
          {e.hero_image_path ? <MediaImage path={e.hero_image_path} alt="" sizes="100vw" priority className="opacity-40" /> : <div className="yard-lines absolute inset-0" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#080808]" />
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 sm:pb-20">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-white/50">
            <Link href="/events" className="hover:text-white">Events</Link><ChevronRight className="size-3.5" /><span className="text-white/80">{e.title}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2"><Badge>{typeLabel(e.event_type)}</Badge><Badge tone={open ? "success" : "neutral"}>{registrationLabel(e.registration_status)}</Badge></div>
          <h1 className="display-xl mt-4 max-w-5xl text-5xl sm:text-7xl lg:text-[7.5rem]">{e.title}</h1>
          {e.summary ? <p className="mt-5 max-w-2xl text-lg text-white/70">{e.summary}</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {open ? (
              <TrackClick name="registration_click" params={{ event_slug: e.slug, event_type: e.event_type, location: "hero" }}>
                <ButtonLink href="#register" size="lg">Register Now</ButtonLink>
              </TrackClick>
            ) : (
              <span className="inline-flex h-14 items-center rounded-md border border-white/15 px-6 font-display text-lg font-bold uppercase tracking-[0.12em] text-white/70">{registrationLabel(e.registration_status)}</span>
            )}
            {mapsHref ? <ButtonLink href={mapsHref} external variant="outline" size="lg">Get Directions <ExternalLink className="size-4" /></ButtonLink> : null}
          </div>
        </div>
      </header>

      <Section className="!pt-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-14">
            <dl className="grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="flex gap-3 bg-[#151515] p-5">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div><dt className="text-xs uppercase tracking-wider text-white/45">{f.label}</dt><dd className="mt-0.5 font-medium">{f.value}</dd></div>
                </div>
              ))}
            </dl>

            {e.description ? (
              <section aria-labelledby="about-event">
                <h2 id="about-event" className="display-xl mb-4 text-4xl">About this event</h2>
                <div className="prose-ng" dangerouslySetInnerHTML={{ __html: sanitizeRichText(e.description) }} />
                {e.eligibility_notes ? <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">{e.eligibility_notes}</p> : null}
              </section>
            ) : null}

            {e.itinerary.length ? (
              <section aria-labelledby="itinerary">
                <h2 id="itinerary" className="display-xl mb-6 text-4xl">Itinerary</h2>
                <ol className="relative space-y-6 border-l border-white/10 pl-6">
                  {e.itinerary.map((step, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[1.95rem] top-1.5 size-3 rounded-full border-2 border-brand bg-[#080808]" />
                      {step.time ? <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand">{step.time}</p> : null}
                      <h3 className="font-display text-2xl font-bold uppercase">{step.title}</h3>
                      {step.description ? <p className="mt-1 text-white/60">{step.description}</p> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {staff.length ? (
              <section aria-labelledby="staff">
                <h2 id="staff" className="display-xl mb-6 text-4xl">Coaching staff</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {staff.map((s) => (
                    <li key={s.id} className="card-surface flex gap-4 p-4">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-full"><MediaImage path={s.image_path} alt={s.name} sizes="64px" /></div>
                      <div><p className="font-display text-xl font-bold uppercase">{s.name}</p>{s.role_title ? <p className="text-sm text-brand">{s.role_title}</p> : null}{s.bio ? <p className="mt-1 text-sm text-white/60">{s.bio}</p> : null}</div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {e.gallery.length ? <MediaGallery items={e.gallery} /> : null}

            {e.faqs.length ? (
              <section aria-labelledby="faqs">
                <h2 id="faqs" className="display-xl mb-6 text-4xl">FAQs</h2>
                <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                  {e.faqs.map((f, i) => (
                    <details key={i} className="group p-5 open:bg-white/[0.03]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.question}<ChevronRight className="size-4 shrink-0 transition group-open:rotate-90" /></summary>
                      <p className="mt-3 text-white/65">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card-surface p-6">
              <p className="text-xs uppercase tracking-widest text-white/45">Registration</p>
              <p className="mt-1 font-display text-5xl font-extrabold">{priceLabel(e)}</p>
              {e.price_note ? <p className="text-sm text-white/50">{e.price_note}</p> : null}
              <p className="mt-3 text-sm text-white/65">{registrationLabel(e.registration_status)}{e.capacity ? ` · limited to ${e.capacity} athletes` : ""}</p>
              {open ? (
                <TrackClick name="registration_click" params={{ event_slug: e.slug, event_type: e.event_type, location: "sidebar" }} className="mt-5 block">
                  <ButtonLink href="#register" size="lg" className="w-full">Register Now</ButtonLink>
                </TrackClick>
              ) : null}
              <p className="mt-4 flex items-start gap-2 text-xs text-white/45"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />Registration, waivers and payment are handled securely in the registration form.</p>
            </div>
          </aside>
        </div>
      </Section>

      <Section id="register" tone="surface" className="scroll-mt-16">
        <SectionHeader eyebrow="Register" title={open ? "Secure your spot" : "Registration"} description={open ? "Complete the form below. Payment and waiver are handled inside the form." : "Registration is not open for this event right now."} />
        {embed && open ? (
          <JotformEmbed src={embed} title={`${e.title} registration form`} eventSlug={e.slug} eventType={e.event_type} />
        ) : (
          <div className="card-surface p-8 text-center">
            <p className="text-white/70">{embed ? `Registration status: ${registrationLabel(e.registration_status)}. Check back for updates.` : "A registration form has not been connected yet. Check back soon."}</p>
            <ButtonLink href="/contact" variant="outline" size="sm" className="mt-5">Questions? Contact us</ButtonLink>
          </div>
        )}
      </Section>

      {sponsors.length ? (
        <Section>
          <SectionHeader eyebrow="Partners" title="Event sponsors" />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{sponsors.map((s) => <li key={s.id}><SponsorLogo sponsor={s} /></li>)}</ul>
        </Section>
      ) : null}
    </>
  );
}
