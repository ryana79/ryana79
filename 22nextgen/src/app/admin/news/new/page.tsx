import { requireCapability } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { ArticleForm, EMPTY_ARTICLE } from "@/components/admin/article-form";

export default async function NewArticlePage() {
  await requireCapability("news.manage");
  return (
    <div>
      <AdminPageHeader title="New article" backHref="/admin/news" />
      <ArticleForm articleId={null} initial={EMPTY_ARTICLE} />
    </div>
  );
}
