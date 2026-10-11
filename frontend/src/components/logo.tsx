import Link from "next/link";

/** CodeQuest mark: an amber "Q" whose tail is a code chevron. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17.5 17.5A8 8 0 1 1 20 12" stroke="var(--cq-brand)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="m14.5 14.5 3.5 3.5-3.5 3.5" stroke="var(--cq-text-1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" fill="var(--cq-brand)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display text-[18px] font-bold tracking-[-0.02em] text-text-1 ${className}`}>CodeQuest</span>;
}

export function Logo({ href = "/home", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 rounded-lc-sm" aria-label="CodeQuest home">
      <LogoMark />
      {!compact && <Wordmark />}
    </Link>
  );
}
