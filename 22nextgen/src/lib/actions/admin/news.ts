"use server";

import { assertCapability } from "@/lib/auth";
import { articleSchema } from "@/lib/validation/admin";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { sanitizeRichText } from "@/lib/sanitize";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

type Intent = "save" | "publish";

export async function saveArticle(id: string | null, input: unknown, intent: Intent = "save"): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertCapability("news.manage");
    const parsed = articleSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const { publish_at, ...rest } = parsed.data;
    const row: Record<string, unknown> = { ...rest, body_html: sanitizeRichText(rest.body_html) };
    if (intent === "publish") {
      if (!sanitizeRichText(rest.body_html).trim()) return fail("Write the article body before publishing.", { body_html: ["The body is empty."] });
      row.status = "published";
      row.published_at = publish_at ?? new Date().toISOString();
    } else if (publish_at) {
      row.published_at = publish_at;
    }
    const q = id ? supabase.from("articles").update(row).eq("id", id).select("id, slug").single() : supabase.from("articles").insert(row).select("id, slug").single();
    const { data, error } = await q;
    if (error) return dbError("news", error, "article");
    revalidatePublic("/news", `/news/${data.slug}`);
    return okData({ id: data.id });
  } catch (e) {
    return guardError("news", e);
  }
}

export async function setArticleStatus(id: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("news.manage");
    const { data: a } = await supabase.from("articles").select("slug, body_html").eq("id", id).single();
    if (!a) return fail("Article not found.");
    if (status === "published" && !a.body_html.trim()) return fail("Write the article body before publishing.");
    const { error } = await supabase.from("articles").update({ status }).eq("id", id);
    if (error) return dbError("news", error, "article");
    revalidatePublic("/news", `/news/${a.slug}`);
    return okay();
  } catch (e) {
    return guardError("news", e);
  }
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("news.manage");
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return dbError("news", error, "article");
    revalidatePublic("/news");
    return okay();
  } catch (e) {
    return guardError("news", e);
  }
}
