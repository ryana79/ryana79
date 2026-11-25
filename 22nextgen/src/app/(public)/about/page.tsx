import type { Metadata } from "next";
import { Compass, Gauge, ShieldCheck, Trophy } from "lucide-react";
import { PageHero, Section, SectionHeader } from "@/components/site/section";
import { ButtonLink } from "@/components/site/btn";
import { BRAND } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "22 NEXT GEN, powered by 22 Fitness LLC, creates New Jersey youth football events, athlete exposure and measurable development.", alternates: { canonical: "/about" } };

const PILLARS = [
  { icon: Trophy, title: "Compete", text: "Combines and showcases that put young athletes in a real competitive, measured environment." },
  { icon: Gauge, title: "Develop", text: "Standardized testing and verified results so athletes can see progress over time." },
  { icon: Compass, title: "Get Discovered", text: "An athlete directory where approved profiles carry verified, context-rich information." },
  { icon: ShieldCheck, title: "Protect", text: "A youth-first privacy model: profiles are private until parents consent and staff approve." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="The future starts here." description={`${BRAND.name} is powered by ${BRAND.company}. We build New Jersey youth football events and the data platform that helps athletes compete, develop and get discovered.`} />
      <Section className="!pt-12">
        <SectionHeader eyebrow="What we do" title="Built for athletes and families" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{PILLARS.map((p) => <div key={p.title} className="card-surface p-6"><p.icon className="mb-4 size-7 text-brand" /><h3 className="font-display text-2xl font-extrabold uppercase">{p.title}</h3><p className="mt-2 text-sm text-white/60">{p.text}</p></div>)}</div>
      </Section>
      <Section tone="surface2">
        <div className="mx-auto max-w-3xl space-y-5 text-lg text-white/75">
          <p>We start in New Jersey and are building toward the Northeast and national events. Our goal is simple: measurable, trustworthy information about young football players, shared responsibly.</p>
          <p>Combine results are labelled verified only after staff confirm them. Rankings are editorial and publish their criteria. Athlete profiles are public only with recorded parental or guardian consent.</p>
          <div className="flex flex-wrap gap-3 pt-2"><ButtonLink href="/events">Explore Events</ButtonLink><ButtonLink href="/contact" variant="outline">Contact Us</ButtonLink></div>
        </div>
      </Section>
    </>
  );
}
