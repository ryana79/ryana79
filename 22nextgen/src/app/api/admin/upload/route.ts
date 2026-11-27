import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { assertCapability, ForbiddenError } from "@/lib/auth";
import { sniffImage } from "@/lib/image-sniff";
import type { Capability } from "@/lib/permissions";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;
const FOLDERS: Record<string, Capability> = {
  events: "events.manage",
  news: "news.manage",
  sponsors: "sponsors.manage",
  content: "content.manage",
  athletes: "athletes.manage",
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");
    const capability = FOLDERS[folder];
    if (!capability) return NextResponse.json({ error: "Unknown upload folder." }, { status: 400 });
    const { supabase, user } = await assertCapability(capability);

    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be under 5 MB." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return NextResponse.json({ error: "Only JPEG, PNG, WebP or AVIF images are allowed." }, { status: 415 });

    const path = `${folder}/${randomUUID()}.${kind.ext}`;
    const { error } = await supabase.storage.from("public-media").upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "31536000" });
    if (error) {
      console.error("[upload] storage error", error.message);
      return NextResponse.json({ error: "Upload failed. Check storage configuration and permissions." }, { status: 502 });
    }
    await supabase.from("media_assets").insert({ bucket: "public-media", path, mime_type: kind.mime, size_bytes: file.size, kind: folder, uploaded_by: user.id });
    return NextResponse.json({ path });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[upload] unexpected error");
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
