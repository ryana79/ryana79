/** Jotform URL / ID validation and embed helpers. Pure functions (unit tested). */

export type JotformParse =
  | { ok: true; formId: string | null; url: string; embedUrl: string; warnings: string[] }
  | { ok: false; error: string };

const ID_ONLY = /^\d{8,24}$/;
const HOST = /^(?:[a-z0-9-]+\.)*jotform\.(?:com|pro|us)$/i;

export function parseJotformInput(raw: string | null | undefined): JotformParse {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, error: "Enter a Jotform form URL or numeric form ID." };

  if (ID_ONLY.test(input)) {
    const url = `https://form.jotform.com/${input}`;
    return { ok: true, formId: input, url, embedUrl: url, warnings: [] };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL or form ID." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Jotform links must use https." };
  if (!HOST.test(url.hostname)) return { ok: false, error: "Only jotform.com form links are accepted." };
  if (url.username || url.password) return { ok: false, error: "Link must not contain credentials." };

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { ok: false, error: "That link doesn't point to a specific form." };
  const idSegment = [...segments].reverse().find((s) => ID_ONLY.test(s)) ?? null;
  const warnings: string[] = [];
  if (!idSegment) {
    warnings.push("No numeric form ID found in this link. The page can embed it, but webhook registrations cannot be matched to this event until the form ID is set.");
  }
  const clean = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  return { ok: true, formId: idSegment, url: clean, embedUrl: clean, warnings };
}

export function embedUrlForEvent(e: { jotform_form_id: string | null; jotform_url: string | null }): string | null {
  if (e.jotform_url) {
    const p = parseJotformInput(e.jotform_url);
    if (p.ok) return p.embedUrl;
  }
  if (e.jotform_form_id) return `https://form.jotform.com/${e.jotform_form_id}`;
  return null;
}
