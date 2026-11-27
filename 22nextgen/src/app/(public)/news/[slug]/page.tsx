import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getArticleBySlug, getPublishedArticleSlugs } from "@/lib/data/public";
import { MediaImage } from "@/components/site/media";
import { ArticleCard, Badge } from "@/components/site/cards";
import { Section, SectionHeader } from "@/components/site/section";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { formatPublishedDate } from "@/lib/format";
import { ARTICLE_CATEGORIES, BRAND, labelFor } from "@/lib/site";
import { mediaUrl } from "@/lib/media";
import { jsonLdString } from "@/lib/seo";
import { siteUrl } from "@/lib/env";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedArticleSlugs()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArticleBySlug(slug);
  if (!data) return { title: "Article not found", robots: { index: false } };
  const a = data.article;
  const desc = a.seo_description || a.summary || stripHtml(a.body_html).slice(0, 155);
  const image = mediaUrl(a.cover_image_path);
  return {
    title: a.seo_title || a.title,
    description: desc,
    alternates: { canonical: `/news/${a.slug}` },
    openGraph: { type: "article", title: a.seo_title || a.title, description: desc, publishedTime: a.published_at ?? undefined, images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title: a.title, description: desc },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getArticleBySlug(slug);
  if (!data) notFound();
  const { article: a, related } = data;
  const image = mediaUrl(a.cover_image_path);
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author: { "@type": a.author_name ? "Person" : "Organization", name: a.author_name || BRAND.name },
    publisher: { "@type": "Organization", name: BRAND.company },
    image: image ? [image] : undefined,
    mainEntityOfPage: `${siteUrl}/news/${a.slug}`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <article>
        <header className="hero-glow relative overflow-hidden pt-28 sm:pt-36">
          <div className="yard-lines absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-4xl px-5 pb-10 sm:px-8">
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-white/50"><Link href="/news" className="hover:text-white">News</Link><ChevronRight className="size-3.5" /><span className="truncate text-white/80">{a.title}</span></nav>
            <Badge>{labelFor(ARTICLE_CATEGORIES, a.category)}</Badge>
            <h1 className="display-xl mt-4 text-5xl sm:text-7xl">{a.title}</h1>
            {a.summary ? <p className="mt-4 text-xl text-white/70">{a.summary}</p> : null}
            <p className="mt-5 text-sm text-white/50">{a.author_name ? `By ${a.author_name} · ` : ""}<time dateTime={a.published_at ?? undefined}>{formatPublishedDate(a.published_at)}</time></p>
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          {a.cover_image_path ? <div className="relative -mt-2 mb-10 aspect-[16/9] overflow-hidden rounded-xl"><MediaImage path={a.cover_image_path} alt="" sizes="(min-width: 896px) 896px, 100vw" priority /></div> : <div className="h-10" />}
          <div className="prose-ng pb-16" dangerouslySetInnerHTML={{ __html: sanitizeRichText(a.body_html) }} />
        </div>
      </article>
      {related.length ? (
        <Section tone="surface2"><SectionHeader eyebrow="Keep reading" title="Related stories" /><div className="grid gap-5 lg:grid-cols-3">{related.map((r) => <ArticleCard key={r.id} article={r} />)}</div></Section>
      ) : null}
    </>
  );
}
