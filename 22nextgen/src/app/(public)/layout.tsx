import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AnalyticsConsent } from "@/components/site/analytics";
import { getPublicSettings } from "@/lib/data/settings";
import { gaMeasurementId } from "@/lib/env";

export const revalidate = 60;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Navbar signedIn={false} />
      <main id="main">{children}</main>
      <Footer contact={settings.contact} />
      <AnalyticsConsent measurementId={gaMeasurementId()} />
    </>
  );
}
