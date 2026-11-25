"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/media";
import { adminBtn } from "./ui";

/** Uploads to Supabase Storage (public-media) through an authorized API route. Value is the storage path. */
export function ImageField({ value, onChange, folder, label, hint }: { value: string | null | undefined; onChange: (path: string) => void; folder: "events" | "news" | "sponsors" | "content" | "athletes"; label: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = mediaUrl(value);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.path);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-white/85">{label}</p>
      <div className="flex items-start gap-4">
        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.03]">
          {url ? <Image src={url} alt="" fill sizes="96px" className="object-cover" /> : <ImagePlus className="size-6 text-white/30" />}
        </div>
        <div className="space-y-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" aria-label={`Upload ${label}`} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className={adminBtn.secondary}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{url ? "Replace" : "Upload"}</button>
            {url ? <button type="button" onClick={() => onChange("")} className={adminBtn.secondary}><Trash2 className="size-4" />Remove</button> : null}
          </div>
          <p className="text-xs text-white/45">{hint ?? "JPEG, PNG, WebP or AVIF, up to 5 MB. Only upload images you have the right to use."}</p>
        </div>
      </div>
    </div>
  );
}
