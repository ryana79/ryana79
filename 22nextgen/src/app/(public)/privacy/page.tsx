import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/section";
import { LegalNotice } from "@/components/site/legal";
import { PrivacyRequestForm } from "@/components/forms/privacy-request-form";

export const metadata: Metadata = { title: "Privacy Policy", description: "How 22 NEXT GEN collects, uses and protects information about young athletes and families.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <Section className="!pt-10">
        <div className="prose-ng mx-auto max-w-3xl">
          <LegalNotice />
          <h2>Who we are</h2>
          <p>22 NEXT GEN is operated by 22 Fitness LLC (&quot;we&quot;). This policy explains how we handle information about youth athletes and their families.</p>
          <h2>Youth athletes first</h2>
          <p>Most athletes on this platform are minors. An athlete profile is private by default. It becomes public only after (1) a parent or guardian&apos;s consent is recorded and (2) a 22 NEXT GEN administrator approves the profile. Consent can be withdrawn at any time, which removes the profile from public view.</p>
          <p>Profiles for athletes under 13 are not published until a verifiable parental consent process that complies with the Children&apos;s Online Privacy Protection Act (COPPA) is approved and in place. A checkbox alone is not treated as sufficient.</p>
          <h2>What is shown publicly</h2>
          <p>On an approved public profile: name, photo, position, graduation class, team, general region/town, height, weight, highlight links, awards and verified combine results. We never publish birth dates, parent or guardian contact details, home addresses, emergency contacts, waivers, registration answers, payment information or internal notes. We do not provide public comments or direct messaging.</p>
          <h2>What we collect privately</h2>
          <p>Registrations run through our form provider (Jotform), which handles payments and waivers. We receive limited registration details (participant and parent/guardian contact information, grade, position) and store them in access-restricted systems used only by authorized staff to run events and, with consent, build profiles.</p>
          <h2>Analytics</h2>
          <p>If enabled, we use Google Analytics 4 only after you opt in, with IP anonymization and without advertising features. We never send athlete names or contact details to analytics.</p>
          <h2>Your choices</h2>
          <p>Parents and guardians may request correction, consent withdrawal, a copy of data we hold, or deletion using the form below. We verify the requester&apos;s relationship to the athlete before acting.</p>
          <h2>Retention</h2>
          <p>Retention periods are to be set with legal counsel before launch. Draft practice: registration data is kept only as long as needed to run events and meet legal obligations; withdrawn or deleted profiles are removed from public view immediately.</p>
          <h2 id="requests">Submit a privacy request</h2>
        </div>
        <div className="mx-auto mt-6 max-w-3xl"><PrivacyRequestForm /></div>
      </Section>
    </>
  );
}
