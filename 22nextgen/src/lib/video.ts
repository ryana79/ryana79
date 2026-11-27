export type VideoLink = { url: string; embed: string | null; host: string };

/** Accepts only https links. YouTube/Vimeo get privacy-friendly embeds; everything else is link-out only. */
export function parseVideoUrl(raw: string): VideoLink | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  let embed: string | null = null;
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v");
    if (id && /^[\w-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (/^[\w-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) embed = `https://player.vimeo.com/video/${id}?dnt=1`;
  }
  return { url: u.toString(), embed, host };
}
