import Image from "next/image";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { Football } from "./icons";

/** Intentional branded placeholder used when no licensed photography is uploaded yet. */
export function CinematicPlaceholder({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("hero-glow relative isolate flex items-center justify-center overflow-hidden", className)} role="img" aria-label={label ?? "22 NEXT GEN placeholder artwork"}>
      <div className="yard-lines absolute inset-0 opacity-80" aria-hidden />
      <Football className="relative size-1/4 min-h-10 min-w-10 text-brand/70" />
      <span className="absolute bottom-3 left-4 font-display text-xs font-bold uppercase tracking-[0.3em] text-white/30">22 NEXT GEN</span>
    </div>
  );
}

export function MediaImage({
  path,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority,
  placeholderLabel,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  placeholderLabel?: string;
}) {
  const src = mediaUrl(path);
  if (!src) return <CinematicPlaceholder className={cn("size-full", className)} label={placeholderLabel} />;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
}
