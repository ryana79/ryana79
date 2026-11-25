import { ButtonLink } from "@/components/site/btn";
import { Wordmark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="hero-glow flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Wordmark className="text-3xl" />
      <h1 className="display-xl mt-8 text-7xl sm:text-9xl">404</h1>
      <p className="mt-3 text-lg text-white/65">That page isn&apos;t on the field.</p>
      <div className="mt-8 flex gap-3"><ButtonLink href="/">Home</ButtonLink><ButtonLink href="/events" variant="outline">Events</ButtonLink></div>
    </div>
  );
}
