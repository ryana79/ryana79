"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Btn } from "./btn";

const CONSENT_EVENT = "ng-consent-change";
type Consent = "granted" | "denied" | "unset";

function subscribeConsent(cb: () => void) {
  window.addEventListener(CONSENT_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CONSENT_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function readConsent(): Consent {
  try {
    const stored = window.localStorage.getItem("ng_consent");
    if (stored === "granted" || stored === "denied") return stored;
  } catch {}
  return "unset";
}

/** GA4 loads ONLY after the visitor opts in. Without NEXT_PUBLIC_GA_MEASUREMENT_ID nothing loads and no banner is shown. */
export function AnalyticsConsent({ measurementId }: { measurementId: string | null }) {
  const choice = useSyncExternalStore(subscribeConsent, readConsent, () => null);

  if (!measurementId || choice === null) return null;

  const save = (v: "granted" | "denied") => {
    try {
      window.localStorage.setItem("ng_consent", v);
    } catch {}
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  return (
    <>
      {choice === "granted" ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
        </>
      ) : null}
      {choice === "unset" ? (
        <div role="dialog" aria-label="Analytics preferences" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-xl border border-white/10 bg-[#111827]/95 p-4 shadow-2xl backdrop-blur sm:p-5">
          <p className="text-sm text-white/80">
            We use privacy-limited analytics to understand which pages and events are useful. We never send athlete names or personal details to analytics.{" "}
            <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy policy</Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn size="sm" onClick={() => save("granted")}>Accept analytics</Btn>
            <Btn size="sm" variant="outline" onClick={() => save("denied")}>Decline</Btn>
          </div>
        </div>
      ) : null}
    </>
  );
}
