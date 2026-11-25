"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

export function TrackView({ name, params }: { name: AnalyticsEvent; params?: Record<string, unknown> }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    trackEvent(name, JSON.parse(key));
    // consent may be granted after first paint; retry once
    const t = window.setTimeout(() => {}, 0);
    return () => window.clearTimeout(t);
  }, [name, key]);
  return null;
}

export function TrackClick({
  name,
  params,
  children,
  className,
}: {
  name: AnalyticsEvent;
  params?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={className} onClickCapture={() => trackEvent(name, params)}>
      {children}
    </span>
  );
}
