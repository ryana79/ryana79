import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { getPublishedArticleSlugs, getPublishedEventSlugs, listRankings, searchAthletes } from "@/lib/data/public";
import { isAthleteIndexable } from "@/lib/privacy";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/events", "/athletes", "/rankings", "/combine-results", "/news", "/membership", "/partners", "/about", "/contact", "/privacy", "/terms"];
  const [events, articles, rankings] = await Promise.all([getPublishedEventSlugs(), getPublishedArticleSlugs(), listRankings()]);
  const entries: MetadataRoute.Sitemap = [
    ...staticPaths.map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...events.map((e) => ({ url: `${siteUrl}/events/${e.slug}`, lastModified: e.updated_at, priority: 0.8 })),
    ...articles.map((a) => ({ url: `${siteUrl}/news/${a.slug}`, lastModified: a.updated_at, priority: 0.6 })),
    ...rankings.map((r) => ({ url: `${siteUrl}/rankings/${r.slug}`, priority: 0.6 })),
  ];
  if (isAthleteIndexable()) {
    const { athletes } = await searchAthletes({ page: 1 });
    entries.push(...athletes.map((a) => ({ url: `${siteUrl}/athletes/${a.slug}`, priority: 0.5 })));
  }
  return entries;
}
