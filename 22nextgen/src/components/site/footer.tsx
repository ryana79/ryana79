import Link from "next/link";
import { Wordmark } from "./logo";
import { BRAND } from "@/lib/site";
import type { ContactSettings } from "@/lib/types";
import { Mail, Phone } from "lucide-react";

const SOCIAL_LABELS: Record<string, string> = { instagram: "Instagram", x: "X", youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok" };

export function Footer({ contact }: { contact: ContactSettings }) {
  const socials = Object.entries(contact.social).filter(([, url]) => !!url) as [string, string][];
  return (
    <footer className="border-t border-white/[0.08] bg-[#050505]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="text-3xl" />
          <p className="mt-3 font-display text-lg font-semibold uppercase tracking-[0.14em] text-white/80">{BRAND.slogan}</p>
          <p className="mt-2 text-sm text-white/50">{BRAND.tagline}</p>
          {socials.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-brand hover:text-white">
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Explore">
          <h2 className="eyebrow mb-4 !text-xs">Explore</h2>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><Link className="hover:text-white" href="/events">Events</Link></li>
            <li><Link className="hover:text-white" href="/athletes">Athletes</Link></li>
            <li><Link className="hover:text-white" href="/combine-results">Combine Results</Link></li>
            <li><Link className="hover:text-white" href="/rankings">Rankings</Link></li>
            <li><Link className="hover:text-white" href="/news">News</Link></li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="eyebrow mb-4 !text-xs">Company</h2>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><Link className="hover:text-white" href="/about">About</Link></li>
            <li><Link className="hover:text-white" href="/membership">NEXT GEN+</Link></li>
            <li><Link className="hover:text-white" href="/partners">Partners</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4 !text-xs">Contact</h2>
          <ul className="space-y-2.5 text-sm text-white/70">
            {contact.email ? (
              <li className="flex items-center gap-2"><Mail className="size-4 text-brand" /><a className="hover:text-white" href={`mailto:${contact.email}`}>{contact.email}</a></li>
            ) : null}
            {contact.phone ? (
              <li className="flex items-center gap-2"><Phone className="size-4 text-brand" /><a className="hover:text-white" href={`tel:${contact.phone}`}>{contact.phone}</a></li>
            ) : null}
            <li><Link className="text-brand hover:text-white" href="/contact">Send us a message</Link></li>
            <li className="pt-2"><Link className="hover:text-white" href="/privacy">Privacy</Link> · <Link className="hover:text-white" href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} {BRAND.company}. All rights reserved. Not affiliated with any league, school or professional organization.</p>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Powered by 22 Fitness</p>
        </div>
      </div>
    </footer>
  );
}
