/** Public URL for an object in the public-media bucket (paths are stored relative to the bucket). */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/public-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}
