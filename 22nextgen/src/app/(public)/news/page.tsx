import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { ArticleCard } from "@/components/site/cards";
import { EmptyState, PageHero, Section } from "@/components/site/section";
import { ButtonLink } from "@/components/site/btn";
import { listArticles } from "@/lib/data/public";
import { ARTICLE_CATEGORIES } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "News: Athlete Spotlights, Combine Recaps & Announcements",
  description: "Athlete spotlights, combine recaps, interviews, event announcements and football development content from 22 NEXT GEN.",
  alternates: { canonical: "/news" },
};

type SP = Promise<{ category?: string; page?: string }>;

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = ARTICLE_CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined;
  const page = sp.page && /^\d+$/.test(sp.page) ? Number(sp.page) : 1;
  const { articles, total, pageSize } = await listArticles({ category, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const chip = (a: boolean) => cn("rounded-full border px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em]", a ? "border-brand bg-brand text-white" : "border-white/15 text-white/70 hover:border-white/40");
  const href = (p: number) => `/news?${new URLSearchParams({ ...(category ? { category } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;
  return (
    <>
      <PageHero eyebrow="The Latest" title="News" description="Spotlights, recaps, announcements and development." />
      <Section className="!pt-10">
        <nav aria-label="Categories" className="mb-8 flex flex-wrap gap-2">
          <Link href="/news" className={chip(!category)}>All</Link>
          {ARTICLE_CATEGORIES.map((c) => <Link key={c.value} href={`/news?category=${c.value}`} className={chip(category === c.value)}>{c.label}</Link>)}
        </nav>
        {articles.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{articles.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
            {pages > 1 ? (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
                {page > 1 ? <ButtonLink href={href(page - 1)} variant="outline" size="sm" rel="prev">Previous</ButtonLink> : null}
                <span className="px-3 text-sm text-white/60">Page {page} of {pages}</span>
                {page < pages ? <ButtonLink href={href(page + 1)} variant="outline" size="sm" rel="next">Next</ButtonLink> : null}
              </nav>
            ) : null}
          </>
        ) : <EmptyState icon={<Newspaper className="size-6" />} title="No stories yet" description="Published articles will appear here." />}
      </Section>
    </>
  );
}
