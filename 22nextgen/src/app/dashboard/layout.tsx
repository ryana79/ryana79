import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/site/logo";
import { signOut } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LINKS = [
  ["/dashboard", "Overview"],
  ["/dashboard/athletes", "My athletes"],
  ["/dashboard/results", "Results"],
  ["/dashboard/events", "Events"],
  ["/dashboard/membership", "Membership"],
  ["/dashboard/media", "Media"],
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  return (
    <div className="min-h-dvh bg-[#080808] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="22 NEXT GEN home"><Wordmark /></Link>
          <form action={signOut}><button className="text-sm text-white/60 hover:text-white">Sign out</button></form>
        </div>
        <nav aria-label="Dashboard" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {LINKS.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-white/65 hover:bg-white/10 hover:text-white">{label}</Link>)}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
