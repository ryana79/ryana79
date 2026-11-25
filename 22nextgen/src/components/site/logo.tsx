import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className, asLink = true }: { className?: string; asLink?: boolean }) {
  const inner = (
    <span className={cn("font-display text-[1.7rem] font-extrabold uppercase leading-none tracking-[0.04em] text-white", className)}>
      <span className="text-brand">22</span> NEXT GEN
    </span>
  );
  if (!asLink) return inner;
  return (
    <Link href="/" aria-label="22 NEXT GEN home" className="inline-flex items-center">
      {inner}
    </Link>
  );
}
