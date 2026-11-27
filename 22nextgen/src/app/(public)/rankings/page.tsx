import type { Metadata } from "next";
import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { Badge } from "@/components/site/cards";
import { listRankings } from "@/lib/data/public";
import { formatPublishedDate } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Youth Football Rankings",
  description: "Editorial 22 NEXT GEN athlete rankings with published criteria. Rankings are separate from combine leaderboards.",
  alternates: { canonical: "/rankings" },
};

export default async function RankingsPage() {
  const rankings = await listRankings();
  return (
    <>
      <PageHero eyebrow="Compete" title="Rankings" description="Editorial rankings curated and approved by 22 NEXT GEN. Each ranking publishes its criteria. A combine time alone is never treated as a scouting evaluation." />
      <Section className="!pt-10">
        {rankings.length ? (
          <ul className="grid gap-5 md:grid-cols-2">
            {rankings.map((r) => (
              <li key={r.id}>
                <Link href={`/rankings/${r.slug}`} className="card-surface card-hover block p-6">
                  <div className="flex flex-wrap gap-2">{r.graduation_year ? <Badge>Class of {r.graduation_year}</Badge> : null}{r.position ? <Badge tone="neutral">{r.position}</Badge> : null}{r.region ? <Badge tone="neutral">{r.region}</Badge> : null}</div>
                  <h2 className="mt-3 font-display text-3xl font-extrabold uppercase">{r.title}</h2>
                  {r.description ? <p className="mt-2 line-clamp-2 text-white/60">{r.description}</p> : null}
                  <p className="mt-3 text-xs text-white/40">Published {formatPublishedDate(r.published_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<ListOrdered className="size-6" />} title="No rankings published yet" description="Rankings are published only after editorial review and admin approval." />
        )}
      </Section>
    </>
  );
}
