import Link from "next/link";
import { Wordmark } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-glow relative flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div className="yard-lines absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center"><Wordmark className="text-4xl" /></div>
        <div className="rounded-2xl border border-white/10 bg-[#0f1420]/90 p-7 shadow-2xl backdrop-blur sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-white/40"><Link href="/" className="hover:text-white">← Back to 22nextgen.com</Link></p>
      </div>
    </div>
  );
}
