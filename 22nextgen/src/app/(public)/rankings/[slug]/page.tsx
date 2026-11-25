import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero, Section } from "@/components/site/section";
import { MediaImage } from "@/components/site/media";
import { getRankingBySlug } from "@/lib/data/public";
import { athleteName, formatPublishedDate } from "@/lib/format";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRankingBySlug(slug);
  if (!data) return { title: "Ranking not found", robots: { index: false } };
  return { title: data.ranking.title, description: data.ranking.description ?? `${data.ranking.title}: editorial rankings by 22 NEXT GEN.`, alternates: { canonical: `/rankings/${slug}` } };
}

export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getRankingBySlug(slug);
  if (!data) notFound();
  const { ranking, entries } = data;
  return (
    <>
      <PageHero eyebrow={`Published ${formatPublishedDate(ranking.published_at)}`} title={ranking.title} description={ranking.description ?? undefined} />
      <Section className="!pt-10">
        <div className="mb-8 rounded-xl border border-brand/30 bg-brand/[0.07] p-5">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-brand">Ranking criteria</h2>
          <p className="mt-1 whitespace-pre-line text-white/80">{ranking.criteria}</p>
        </div>
        {entries.length ? (
          <ol className="space-y-3">
            {entries.map((e) => (
              <li key={e.id}>
                <Link href={`/athletes/${e.athlete.slug}`} className="card-surface card-hover flex items-center gap-4 p-4">
                  <span className="w-12 text-center font-display text-4xl font-extrabold text-brand">{e.rank}</span>
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg"><MediaImage path={e.athlete.profile_image_path} alt="" sizes="64px" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-2xl font-bold uppercase">{athleteName(e.athlete)}</span>
                    <span className="block truncate text-sm text-white/50">{[e.athlete.primary_position, e.athlete.graduation_year ? `Class of ${e.athlete.graduation_year}` : null, e.athlete.team].filter(Boolean).join(" · ")}</span>
                    {e.note ? <span className="mt-1 block text-sm text-white/70">{e.note}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : <p className="text-white/60">Only athletes with approved public profiles are shown.</p>}
        <p className="mt-8 text-xs text-white/40">Rankings are editorial opinions of 22 NEXT GEN, based on the criteria above. They are not guarantees or predictions of future performance.</p>
      </Section>
    </>
  );
}
