import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHero, Section } from "@/components/site/section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getPublicSettings } from "@/lib/data/settings";

export const revalidate = 60;
export const metadata: Metadata = { title: "Contact", description: "Contact 22 NEXT GEN with questions about events, athlete profiles, results or partnerships.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const { contact } = await getPublicSettings();
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to the team" description="Questions about events, registration, athlete profiles or results? Send us a message." />
      <Section className="!pt-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div><InquiryForm kind="contact" /></div>
          <aside className="space-y-4">
            <div className="card-surface space-y-4 p-6">
              {contact.email ? <p className="flex items-center gap-3"><Mail className="size-5 text-brand" /><a href={`mailto:${contact.email}`} className="hover:text-brand">{contact.email}</a></p> : null}
              {contact.phone ? <p className="flex items-center gap-3"><Phone className="size-5 text-brand" /><a href={`tel:${contact.phone}`} className="hover:text-brand">{contact.phone}</a></p> : null}
              {contact.address ? <p className="flex items-center gap-3"><MapPin className="size-5 text-brand" />{contact.address}</p> : null}
              {!contact.email && !contact.phone && !contact.address ? <p className="text-sm text-white/55">Use the form and we will reply by email.</p> : null}
            </div>
            <p className="text-xs text-white/45">Parents: to correct, remove or delete an athlete profile, use the <a className="text-brand underline underline-offset-4" href="/privacy#requests">privacy request form</a>.</p>
          </aside>
        </div>
      </Section>
    </>
  );
}
