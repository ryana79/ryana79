import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { ArticleForm } from "@/components/admin/article-form";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("news.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: a } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  return (
    <div>
      <AdminPageHeader title={a.title} backHref="/admin/news" />
      <ArticleForm articleId={id} status={a.status} initial={{ title: a.title, slug: a.slug, summary: a.summary ?? "", cover_image_path: a.cover_image_path ?? "", body_html: a.body_html, author_name: a.author_name ?? "", category: a.category, featured: a.featured, publish_at: "", seo_title: a.seo_title ?? "", seo_description: a.seo_description ?? "" }} />
    </div>
  );
}
