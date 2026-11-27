import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display font-bold uppercase tracking-[0.12em] transition duration-200 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";
const variants = {
  primary: "bg-brand text-white hover:bg-[#3a91ff] shadow-[0_10px_30px_-12px_rgba(20,125,255,0.9)]",
  outline: "border border-white/25 bg-transparent text-white hover:border-white hover:bg-white/5",
  ghost: "text-white/80 hover:bg-white/5 hover:text-white",
  dark: "bg-white/[0.06] text-white hover:bg-white/10 border border-white/10",
  danger: "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20",
} as const;
const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-base",
  lg: "h-14 px-8 text-lg",
} as const;

export type BtnStyle = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };

export function btnClass({ variant = "primary", size = "md", className }: BtnStyle = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  external,
  children,
  ...rest
}: BtnStyle & { href: string; external?: boolean; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={btnClass({ variant, size, className })} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={btnClass({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}

export function Btn({
  variant,
  size,
  className,
  type = "button",
  ...rest
}: BtnStyle & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={btnClass({ variant, size, className })} {...rest} />;
}
