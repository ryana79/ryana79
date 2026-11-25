import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { EmptyState, PageHero, Section, SectionHeader } from "@/components/site/section";
import { SponsorLogo } from "@/components/site/cards";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getSponsors } from "@/lib/data/public";
import { getPublicSettings } from "@/lib/data/settings";
import { formatCents } from "@/lib/format";
import { SPONSOR_TIERS, labelFor } from "@/lib/site";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Partners & Sponsors",
  description: "Partner with 22 NEXT GEN: event sponsorships and annual partnerships reaching New Jersey youth football athletes, families and coaches.",
  alternates: { canonical: "/partners" },
};

export default async function PartnersPage() {
  const [sponsors, { sponsorPackages: p }] = await Promise.all([getSponsors(), getPublicSettings()]);
  const tiers = SPONSOR_TIERS.map((t) => ({ ...t, items: sponsors.filter((s) => s.tier === t.value) })).filter((t) => t.items.length);
  return (
    <>
      <PageHero eyebrow="Partners" title="Back the next generation" description="Event sponsors and annual partners help make combines, showcases and development camps possible for New Jersey athletes." />
      <Section className="!pt-10">
        {tiers.length ? (
          <div className="space-y-12">
            {tiers.map((t) => (
              <div key={t.value}>
                <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-[0.14em] text-white/60">{labelFor(SPONSOR_TIERS, t.value)} partners</h2>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{t.items.map((s) => <li key={s.id}><SponsorLogo sponsor={s} size="lg" />{s.description ? <p className="mt-2 line-clamp-3 text-xs text-white/50">{s.description}</p> : null}</li>)}</ul>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={<Handshake className="size-6" />} title="Be our first partner" description="No partners are listed yet. Reach families, athletes and coaches across New Jersey and the Northeast." />}
      </Section>
      <Section tone="surface">
        <SectionHeader eyebrow="Opportunities" title="Partnership options" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card-surface p-6"><h3 className="font-display text-3xl font-extrabold uppercase">Event sponsor</h3><p className="mt-1 font-display text-4xl font-extrabold text-brand">{formatCents(p.event_sponsor_min_cents)} – {p.event_sponsor_max_label}</p><p className="mt-3 text-white/60">Associate your brand with a specific combine, showcase or camp. Packages are built around your goals.</p></div>
          <div className="card-surface p-6"><h3 className="font-display text-3xl font-extrabold uppercase">Annual partner</h3><p className="mt-1 font-display text-4xl font-extrabold text-brand">{p.annual_partner_label}</p><p className="mt-3 text-white/60">Season-long presence across events, content and the athlete platform.</p></div>
        </div>
        {p.notes ? <p className="mt-4 text-sm text-white/45">{p.notes}</p> : null}
      </Section>
      <Section id="inquiry" className="scroll-mt-16">
        <div className="mx-auto max-w-2xl"><SectionHeader eyebrow="Get in touch" title="Partnership inquiry" description="Tell us about your brand. Our team will follow up by email." /><InquiryForm kind="partnership" /></div>
      </Section>
    </>
  );
}
