"use client";

import { Btn } from "@/components/site/btn";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="hero-glow flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <h1 className="display-xl text-6xl sm:text-8xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-white/65">An unexpected error occurred. Please try again. If it keeps happening, contact us.</p>
      <Btn className="mt-8" onClick={reset}>Try again</Btn>
    </div>
  );
}
