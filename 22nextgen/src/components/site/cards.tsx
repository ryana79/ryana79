import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin, Users } from "lucide-react";
import type { ArticleRow, AthleteRow, EventRow, SponsorRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MediaImage } from "./media";
import { ButtonLink } from "./btn";
import { athleteName, dateParts, formatEventDate, formatMeasurement, formatPublishedDate, formatTimeRange } from "@/lib/format";
import { canRegister, eligibilityLabel, locationLabel, priceLabel, registrationLabel, typeLabel } from "@/lib/event-utils";
import { checkInHref, directionsFor } from "@/lib/events/turkey-bowl";
import { ARTICLE_CATEGORIES, labelFor } from "@/lib/site";

export function Badge({ children, tone = "brand", className }: { children: React.ReactNode; tone?: "brand" | "neutral" | "success" | "warn"; className?: string }) {
  const tones = {
    brand: "bg-brand/15 text-[#7fb8ff] border-brand/30",
    neutral: "bg-white/[0.06] text-white/70 border-white/10",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    warn: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-display text-xs font-semibold uppercase tracking-[0.14em]", tones[tone], className)}>{children}</span>;
}

export function EventCard({ event }: { event: EventRow }) {
  const dp = dateParts(event.event_date);
  const open = canRegister(event);
  const closed = event.registration_status === "closed";
  const directions = directionsFor(event);
  return (
    <article className="card-surface card-hover group relative flex flex-col overflow-hidden">
      <Link href={`/events/${event.slug}`} className="absolute inset-0 z-10" aria-label={`${event.title} details`} />
      <div className="relative aspect-[16/10] overflow-hidden">
        <MediaImage path={event.card_image_path ?? event.hero_image_path} alt="" className="transition duration-700 group-hover:scale-105" placeholderLabel={`${event.title} artwork`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-black/20" aria-hidden />
        {dp ? (
          <div className="absolute left-4 top-4 rounded-lg bg-black/70 px-3 py-2 text-center backdrop-blur">
            <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand">{dp.month}</div>
            <div className="font-display text-3xl font-extrabold leading-none">{dp.day}</div>
          </div>
        ) : null}
        <div className="absolute right-4 top-4">
          <Badge>{typeLabel(event.event_type)}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-wide">{event.title}</h3>
        <ul className="space-y-1.5 text-sm text-white/65">
          <li className="flex items-start gap-2"><Calendar className="mt-0.5 size-4 shrink-0 text-brand" />{formatEventDate(event.event_date)}{formatTimeRange(event.start_time, event.end_time, event.time_zone, event.event_date) ? ` · ${formatTimeRange(event.start_time, event.end_time, event.time_zone, event.event_date)}` : ""}</li>
          <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" />{locationLabel(event)}</li>
          <li className="flex items-start gap-2"><Users className="mt-0.5 size-4 shrink-0 text-brand" />{eligibilityLabel(event)}</li>
        </ul>
        <div className="mt-auto flex flex-col gap-2 pt-3">
          {closed ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Registration Closed</p>
          ) : (
            <div>
              <div className="font-display text-2xl font-bold">{priceLabel(event)}</div>
              <div className="text-xs uppercase tracking-wider text-white/45">{registrationLabel(event.registration_status)}</div>
            </div>
          )}
          {closed ? (
            <div className="grid gap-2">
              <ButtonLink href={checkInHref(event.slug)} size="sm" className="relative z-20">View Check-In Schedule</ButtonLink>
              {directions ? <ButtonLink href={directions} external variant="outline" size="sm" className="relative z-20">Get Directions</ButtonLink> : null}
            </div>
          ) : (
            <ButtonLink href={`/events/${event.slug}${open ? "#register" : ""}`} size="sm" variant={open ? "primary" : "dark"} className="relative z-20 self-start">
              {open ? "Register Now" : "View Event"}
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}

type Metric = { slug: string; name: string; unit: string; decimals: number; value: number };

export function AthleteCard({ athlete, metrics = [] }: { athlete: AthleteRow; metrics?: Metric[] }) {
  const name = athleteName(athlete);
  return (
    <article className="card-surface card-hover group relative flex flex-col overflow-hidden">
      <Link href={`/athletes/${athlete.slug}`} className="absolute inset-0 z-10" aria-label={`View ${name}'s profile`} />
      <div className="relative aspect-[4/5] overflow-hidden">
        <MediaImage path={athlete.profile_image_path} alt={`${name}`} sizes="(min-width: 1024px) 25vw, 50vw" className="transition duration-700 group-hover:scale-105" placeholderLabel="Athlete photo placeholder" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-[#151515]/20 to-transparent" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {athlete.primary_position ? <Badge>{athlete.primary_position}</Badge> : null}
            {athlete.graduation_year ? <Badge tone="neutral">Class of {athlete.graduation_year}</Badge> : null}
          </div>
          <h3 className="mt-2 font-display text-3xl font-extrabold uppercase leading-none">{name}</h3>
          <p className="mt-1 text-sm text-white/60">{[athlete.team, athlete.region].filter(Boolean).join(" · ") || "22 NEXT GEN athlete"}</p>
        </div>
      </div>
      {metrics.length ? (
        <dl className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.06]">
          {metrics.slice(0, 2).map((m) => (
            <div key={m.slug} className="bg-[#151515] px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/45">{m.name}</dt>
              <dd className="font-display text-xl font-bold">{formatMeasurement(m.value, m.unit, m.decimals)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-sm font-semibold text-brand">
        View Profile <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </article>
  );
}

export function ArticleCard({ article, featured }: { article: Pick<ArticleRow, "slug" | "title" | "summary" | "cover_image_path" | "category" | "published_at" | "author_name">; featured?: boolean }) {
  return (
    <article className={cn("card-surface card-hover group relative flex overflow-hidden", featured ? "flex-col lg:flex-row" : "flex-col")}>
      <Link href={`/news/${article.slug}`} className="absolute inset-0 z-10" aria-label={article.title} />
      <div className={cn("relative overflow-hidden", featured ? "aspect-[16/10] lg:aspect-auto lg:w-3/5" : "aspect-[16/10]")}>
        <MediaImage path={article.cover_image_path} alt="" sizes="(min-width: 1024px) 40vw, 100vw" className="transition duration-700 group-hover:scale-105" />
      </div>
      <div className={cn("flex flex-1 flex-col gap-3 p-5", featured && "lg:justify-center lg:p-8")}>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <Badge>{labelFor(ARTICLE_CATEGORIES, article.category)}</Badge>
          {article.published_at ? <time dateTime={article.published_at}>{formatPublishedDate(article.published_at)}</time> : null}
        </div>
        <h3 className={cn("font-display font-extrabold uppercase leading-tight tracking-wide", featured ? "text-3xl sm:text-4xl" : "text-2xl")}>{article.title}</h3>
        {article.summary ? <p className="line-clamp-3 text-sm text-white/60">{article.summary}</p> : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand">Read story <ArrowUpRight className="size-4" /></span>
      </div>
    </article>
  );
}

export function SponsorLogo({ sponsor, size = "md" }: { sponsor: SponsorRow; size?: "md" | "lg" }) {
  const content = (
    <div className={cn("card-surface card-hover relative flex items-center justify-center bg-white/[0.03] p-4", size === "lg" ? "h-36" : "h-24")}>
      {sponsor.logo_path ? (
        <div className="relative size-full">
          <MediaImage path={sponsor.logo_path} alt={`${sponsor.name} logo`} sizes="240px" className="!object-contain" />
        </div>
      ) : (
        <span className="text-center font-display text-xl font-bold uppercase tracking-wider text-white/70">{sponsor.name}</span>
      )}
    </div>
  );
  return sponsor.website_url ? (
    <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer sponsored" aria-label={`${sponsor.name} (opens in new tab)`}>
      {content}
    </a>
  ) : (
    content
  );
}
