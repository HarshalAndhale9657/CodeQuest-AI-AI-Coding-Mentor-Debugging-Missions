import type { HTMLAttributes, ReactNode } from "react";
import { DIFFICULTY_CLASS, difficultyForTier, type Difficulty } from "@/lib/format";
import { cx } from "./cx";

/** A quiet rounded chip for topics and facts. */
export function Tag({ className, children, icon, ...rest }: HTMLAttributes<HTMLSpanElement> & { icon?: ReactNode }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full bg-fill-2 px-2.5 py-0.5 text-xs text-text-2 ring-1 ring-inset ring-white/[0.04]", className)}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

/** A small count bubble. */
export function CountBadge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        tone === "brand" ? "bg-brand text-brand-ink" : "bg-fill-3 text-text-2",
      )}
    >
      {children}
    </span>
  );
}

const DIFFICULTY_PILL: Record<Difficulty, string> = {
  Easy: "bg-easy/10 ring-easy/20",
  Medium: "bg-medium/10 ring-medium/20",
  Hard: "bg-hard/10 ring-hard/20",
};

export function DifficultyLabel({ tier, pill = false }: { tier: number; pill?: boolean }) {
  const d = difficultyForTier(tier);
  if (pill) {
    return (
      <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", DIFFICULTY_PILL[d], DIFFICULTY_CLASS[d])}>
        {d}
      </span>
    );
  }
  return (
    <span className={cx("text-[13px] font-medium", DIFFICULTY_CLASS[d])} title={`${d} (tier ${tier})`}>
      {d === "Medium" ? "Med." : d}
    </span>
  );
}
