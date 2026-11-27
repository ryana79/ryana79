import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, DataTable, Pagination, SearchBar, StatusBadge, adminBtn, parsePage, safeTerm } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { deleteArticle, setArticleStatus } from "@/lib/actions/admin/news";
import { formatPublishedDate } from "@/lib/format";
import { ARTICLE_CATEGORIES, labelFor } from "@/lib/site";

const PAGE_SIZE = 15;

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireCapability("news.manage");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  let q = supabase.from("articles").select("id, slug, title, category, status, published_at, updated_at", { count: "exact" }).order("updated_at", { ascending: false });
  const term = safeTerm(sp.q);
  if (term) q = q.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
  if (sp.status && ["draft", "published", "archived"].includes(sp.status)) q = q.eq("status", sp.status);
  const { data, count } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return (
    <div>
      <AdminPageHeader title="News" description="Write and publish articles, recaps and spotlights." actions={<Link href="/admin/news/new" className={adminBtn.primary}><Plus className="size-4" />New article</Link>} />
      <SearchBar action="/admin/news" q={sp.q} placeholder="Search title or slug">
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="field h-10 w-auto"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
      </SearchBar>
      <DataTable
        caption="Articles"
        rows={data ?? []}
        empty={<>No articles yet. <Link href="/admin/news/new" className="text-brand underline">Write the first one</Link>.</>}
        columns={[
          { header: "Title", cell: (a) => <Link href={`/admin/news/${a.id}`} className="font-medium hover:text-brand">{a.title}</Link> },
          { header: "Category", cell: (a) => labelFor(ARTICLE_CATEGORIES, a.category) },
          { header: "Published", cell: (a) => (a.published_at ? formatPublishedDate(a.published_at) : "—") },
          { header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
          { header: "Actions", className: "text-right", cell: (a) => (
            <div className="flex justify-end gap-2">
              <Link href={`/admin/news/${a.id}`} className={adminBtn.secondary}>Edit</Link>
              {a.status === "published" ? <ActionButton label="Unpublish" action={setArticleStatus.bind(null, a.id, "draft")} confirm={{ title: "Unpublish article?", description: "It will be removed from the public site." }} /> : <ActionButton label="Publish" variant="primary" action={setArticleStatus.bind(null, a.id, "published")} />}
              <ActionButton label="Delete" variant="danger" action={deleteArticle.bind(null, a.id)} confirm={{ title: "Delete article?", description: "This permanently deletes the article.", confirmLabel: "Delete" }} />
            </div>
          ) },
        ]}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/news" params={{ q: sp.q, status: sp.status }} />
    </div>
  );
}
