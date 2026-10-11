import type { HTMLAttributes, ReactNode } from "react";
import { DIFFICULTY_CLASS, difficultyForTier } from "@/lib/format";
import { cx } from "./cx";

/** Rounded pill, like LeetCode's topic and company chips. */
export function Tag({ className, children, icon, ...rest }: HTMLAttributes<HTMLSpanElement> & { icon?: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full bg-fill-3 px-2.5 py-0.5 text-xs text-text-1", className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}

/** LeetCode's orange count bubble ("Google 2329"). */
export function CountBadge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums",
        tone === "brand" ? "bg-brand text-bg" : "bg-fill-2 text-text-2",
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyLabel({ tier, pill = false }: { tier: number; pill?: boolean }) {
  const d = difficultyForTier(tier);
  if (pill) {
    return <span className={cx("inline-flex rounded-full bg-fill-3 px-2.5 py-0.5 text-xs font-medium", DIFFICULTY_CLASS[d])}>{d}</span>;
  }
  return (
    <span className={cx("text-sm", DIFFICULTY_CLASS[d])} title={`${d} (tier ${tier})`}>
      {d === "Medium" ? "Med." : d}
    </span>
  );
}
