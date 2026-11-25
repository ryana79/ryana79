import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/section";
import { LegalNotice } from "@/components/site/legal";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms for using the 22 NEXT GEN website and services.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Use" />
      <Section className="!pt-10">
        <div className="prose-ng mx-auto max-w-3xl">
          <LegalNotice />
          <h2>Using this site</h2>
          <p>By using 22 NEXT GEN you agree to use the site lawfully and respectfully. Accounts must be created by a parent, guardian or adult. You may not scrape, harass athletes or families, or misuse athlete information.</p>
          <h2>Events and registration</h2>
          <p>Event registration, payment and waivers are handled through the registration form for each event. The price shown on an event page is informational; the amount charged is set in the registration form. Event details can change.</p>
          <h2>Results and rankings</h2>
          <p>Combine results are labelled verified only after confirmation by 22 NEXT GEN staff. Rankings are editorial opinions based on published criteria and are not guarantees, evaluations of future performance, or endorsements by any school or organization.</p>
          <h2>Membership</h2>
          <p>NEXT GEN+ is a planned offering. Until billing is announced as active, no subscription is available for purchase.</p>
          <h2>Content and conduct</h2>
          <p>Content submitted to us may be displayed only with the appropriate consent. We may remove content or accounts that violate these terms.</p>
          <h2>Disclaimers</h2>
          <p>22 NEXT GEN is not affiliated with any league, school, college or professional organization unless explicitly stated. Participation in athletic activity carries inherent risk.</p>
          <h2>Contact</h2>
          <p>Questions about these terms: use the contact page.</p>
        </div>
      </Section>
    </>
  );
}
