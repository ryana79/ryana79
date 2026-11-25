"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { ButtonLink } from "./btn";
import { trackEvent } from "@/lib/analytics";

/** Embeds the Jotform registration. The embed is a convenience; the direct link always works as a fallback. */
export function JotformEmbed({ src, title, eventSlug, eventType }: { src: string; title: string; eventSlug: string; eventType: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      <div className="relative min-h-[620px] overflow-hidden rounded-xl border border-white/10 bg-white">
        {!loaded ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#111827] text-white/60" role="status">
            <Loader2 className="size-5 animate-spin" /> Loading registration form…
          </div>
        ) : null}
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="payment"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setLoaded(true);
            trackEvent("registration_form_open", { event_slug: eventSlug, event_type: eventType });
          }}
          className="h-[1100px] w-full border-0 sm:h-[1000px]"
        />
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
        Form not loading or prefer a full page?
        <ButtonLink href={src} external size="sm" variant="outline" onClick={() => trackEvent("registration_click", { event_slug: eventSlug, event_type: eventType, location: "fallback_link" })}>
          Open registration form <ExternalLink className="size-4" />
        </ButtonLink>
      </p>
    </div>
  );
}
