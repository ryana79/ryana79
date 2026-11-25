import type { Metadata } from "next";
import { Check, Clock, Sparkles } from "lucide-react";
import { PageHero, Section, SectionHeader } from "@/components/site/section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getPublicSettings } from "@/lib/data/settings";
import { formatCents } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "NEXT GEN+ Membership",
  description: "NEXT GEN+ is the planned premium membership for 22 NEXT GEN athletes: expanded profiles, performance tracking, player cards and more.",
  alternates: { canonical: "/membership" },
};

export default async function MembershipPage() {
  const { membership: m } = await getPublicSettings();
  return (
    <>
      <PageHero eyebrow={m.name} title="Level up your profile" description="NEXT GEN+ is designed for athletes who want expanded profiles, performance tracking over time and premium media. Here is exactly what exists today and what is still planned." />
      <Section className="!pt-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-8">
            <div className="card-surface p-6 sm:p-8">
              <h2 className="mb-4 flex items-center gap-2 font-display text-3xl font-extrabold uppercase"><Check className="size-6 text-emerald-300" /> Available now</h2>
              {m.available_benefits.length ? (
                <ul className="space-y-3">{m.available_benefits.map((b) => <li key={b} className="flex gap-3 text-white/80"><Check className="mt-1 size-4 shrink-0 text-emerald-300" />{b}</li>)}</ul>
              ) : <p className="text-white/55">No member-only benefits are live yet.</p>}
              <p className="mt-4 text-xs text-white/45">Profile publishing is free of charge and requires parental consent and staff approval; it does not depend on a membership.</p>
            </div>
            <div className="card-surface p-6 sm:p-8">
              <h2 className="mb-4 flex items-center gap-2 font-display text-3xl font-extrabold uppercase"><Clock className="size-6 text-brand" /> Planned</h2>
              <ul className="space-y-3">{m.planned_benefits.map((b) => <li key={b} className="flex gap-3 text-white/80"><Clock className="mt-1 size-4 shrink-0 text-brand" />{b}</li>)}</ul>
              <p className="mt-4 text-xs text-white/45">Planned benefits are not yet available and may change before launch.</p>
            </div>
          </div>
          <aside>
            <div className="hero-glow sticky top-24 rounded-2xl border border-brand/30 p-6 sm:p-8">
              <p className="eyebrow flex items-center gap-2"><Sparkles className="size-4" /> {m.name}</p>
              <p className="mt-3 font-display text-6xl font-extrabold">{formatCents(m.price_cents)}<span className="text-xl text-white/50">/{m.interval}</span></p>
              <p className="mt-2 text-sm text-white/60">Planned launch price. {m.billing_enabled ? "" : "Membership billing is not active, so no subscription can be purchased and no payment is collected."}</p>
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-3 font-display text-xl font-bold uppercase">Get notified at launch</h3>
                <InquiryForm kind="membership_interest" />
              </div>
            </div>
          </aside>
        </div>
      </Section>
      <Section tone="surface2"><SectionHeader eyebrow="Pricing note" title="Questions?" description="Pricing is configured by 22 Fitness LLC and may change before launch. Reach out via the contact page with any questions." /></Section>
    </>
  );
}
