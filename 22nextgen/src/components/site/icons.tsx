export function Football({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 40C8 22 22 8 40 8c8 0 16 2 16 2s2 8 2 16c0 18-14 32-32 32-8 0-16-2-16-2S8 48 8 40Z" transform="rotate(0 32 32)" />
      <path d="m24 40 16-16M29 24l-5 5M35 30l-5 5M41 36l-5 5M27 38l-5 5" />
    </svg>
  );
}
