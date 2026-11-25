import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/data/settings";
import { getFeaturedAthletes, getLatestArticles, getLeaderboard, getSponsors, getTestTypes, getUpcomingEvents } from "@/lib/data/public";
import { EventPromoSection, FeaturedAthletesSection, Hero, LeaderboardsSection, MembershipPromo, NewsSection, SponsorsSection, UpcomingEventsSection } from "@/components/site/home-sections";
import { BRAND } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} | New Jersey Youth Football Combines, Showcases & Camps` },
  description:
    "22 NEXT GEN runs New Jersey youth football combines, showcases and development camps, with verified combine results and approved athlete profiles.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const settings = await getPublicSettings();
  const cfg = settings.homepage;
  const [events, featured, articles, sponsors, tests] = await Promise.all([
    cfg.events.enabled || cfg.event_promo.enabled ? getUpcomingEvents(3) : Promise.resolve([]),
    cfg.athletes.enabled ? getFeaturedAthletes(4) : Promise.resolve({ athletes: [], metrics: new Map() }),
    cfg.news.enabled ? getLatestArticles(3) : Promise.resolve([]),
    cfg.sponsors.enabled ? getSponsors() : Promise.resolve([]),
    cfg.leaderboards.enabled ? getTestTypes() : Promise.resolve([]),
  ]);
  const boards = cfg.leaderboards.enabled ? await Promise.all(tests.map((t) => getLeaderboard(t.slug, {}, 5))) : [];

  return (
    <>
      {cfg.hero.enabled ? <Hero hero={cfg.hero} /> : <div className="h-20" />}
      {cfg.event_promo.enabled ? <EventPromoSection cfg={cfg.event_promo} featured={events[0] ?? null} /> : null}
      {cfg.events.enabled ? <UpcomingEventsSection cfg={cfg.events} events={events} /> : null}
      {cfg.athletes.enabled ? <FeaturedAthletesSection cfg={cfg.athletes} athletes={featured.athletes} metrics={featured.metrics} /> : null}
      {cfg.leaderboards.enabled ? <LeaderboardsSection cfg={cfg.leaderboards} boards={boards} /> : null}
      {cfg.news.enabled ? <NewsSection cfg={cfg.news} articles={articles} /> : null}
      {cfg.membership.enabled ? <MembershipPromo cfg={cfg.membership} membership={settings.membership} /> : null}
      {cfg.sponsors.enabled ? <SponsorsSection cfg={cfg.sponsors} sponsors={sponsors} /> : null}
    </>
  );
}
