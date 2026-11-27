"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { articleSchema, type ArticleFormInput } from "@/lib/validation/admin";
import { saveArticle } from "@/lib/actions/admin/news";
import { Field } from "@/components/forms/field";
import { Panel, adminBtn } from "./ui";
import { ImageField } from "./image-field";
import { RichTextEditor } from "./rich-text-editor";
import { ARTICLE_CATEGORIES } from "@/lib/site";
import { slugify } from "@/lib/format";

export const EMPTY_ARTICLE: ArticleFormInput = { title: "", slug: "", summary: "", cover_image_path: "", body_html: "", author_name: "", category: "football_news", featured: false, publish_at: "", seo_title: "", seo_description: "" };

export function ArticleForm({ articleId, initial, status }: { articleId: string | null; initial: ArticleFormInput; status?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ArticleFormInput>({ resolver: zodResolver(articleSchema) as never, defaultValues: initial });
  const { register, control, handleSubmit, setError, setValue, formState: { errors, touchedFields } } = form;
  const err = (k: keyof ArticleFormInput) => (errors[k] as { message?: string } | undefined)?.message;

  const submit = (intent: "save" | "publish") =>
    handleSubmit(() =>
      start(async () => {
        const res = await saveArticle(articleId, form.getValues(), intent);
        if (!res.ok) {
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof ArticleFormInput, { message: m[0] }));
          toast.error(res.error);
          return;
        }
        toast.success(intent === "publish" ? "Article published" : "Article saved");
        if (!articleId) router.replace(`/admin/news/${res.data.id}`);
        else router.refresh();
      }),
    )();

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
      <Panel title="Article">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" htmlFor="ar-title" error={err("title")} required className="md:col-span-2">
            <input id="ar-title" className="field" {...register("title", { onChange: (e) => { if (!articleId && !touchedFields.slug) setValue("slug", slugify(e.target.value)); } })} />
          </Field>
          <Field label="URL slug" htmlFor="ar-slug" error={err("slug")} required><input id="ar-slug" className="field" {...register("slug")} /></Field>
          <Field label="Category" htmlFor="ar-cat"><select id="ar-cat" className="field" {...register("category")}>{ARTICLE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
          <Field label="Author" htmlFor="ar-author"><input id="ar-author" className="field" {...register("author_name")} /></Field>
          <Field label="Publish date/time" htmlFor="ar-pub" error={err("publish_at")} hint="Optional. Leave blank to publish immediately."><input id="ar-pub" type="datetime-local" className="field" {...register("publish_at")} /></Field>
          <Field label="Summary" htmlFor="ar-sum" error={err("summary")} hint="Shown on cards and in search results." className="md:col-span-2"><textarea id="ar-sum" rows={2} className="field" {...register("summary")} /></Field>
          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Body</p>
            <Controller control={control} name="body_html" render={({ field }) => <RichTextEditor label="Article body" value={field.value ?? ""} onChange={field.onChange} />} />
            {err("body_html") ? <p role="alert" className="mt-1 text-xs text-red-300">{err("body_html")}</p> : null}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#147dff]" {...register("featured")} />Feature on the homepage</label>
        </div>
      </Panel>
      <Panel title="Cover image & SEO">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller control={control} name="cover_image_path" render={({ field }) => <ImageField label="Cover image" folder="news" value={field.value} onChange={field.onChange} />} />
          <div className="space-y-4">
            <Field label="SEO title" htmlFor="ar-seot" error={err("seo_title")}><input id="ar-seot" className="field" {...register("seo_title")} /></Field>
            <Field label="SEO description" htmlFor="ar-seod" error={err("seo_description")}><textarea id="ar-seod" rows={2} className="field" {...register("seo_description")} /></Field>
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => submit("save")} className={adminBtn.secondary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save {status === "published" ? "changes" : "draft"}</button>
        {status !== "published" ? <button type="button" disabled={pending} onClick={() => submit("publish")} className={adminBtn.primary}>Save &amp; publish</button> : null}
      </div>
    </form>
  );
}
