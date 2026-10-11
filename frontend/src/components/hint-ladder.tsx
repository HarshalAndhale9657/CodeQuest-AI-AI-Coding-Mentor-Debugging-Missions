"use client";

import { Crosshair, Lightbulb, Lock, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { HintEntry, HintGate } from "@/lib/types";
import { Button } from "./ui/button";
import { cx } from "./ui/cx";

interface Props {
  ladder: HintEntry[];
  maxLevel: number;
  next: HintGate | null;
  /** When `next` was fetched (ms since epoch); the cooldown counts down from here. */
  nextFetchedAt: number;
  canAsk: boolean;
  busy: boolean;
  error: string | null;
  onAsk: () => void;
  onFocusRegion: (region: [number, number] | null) => void;
}

function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}

/** Progressive hints as a vertical stepper: used steps are filled, locked steps show what unlocks them. */
export function HintLadder({ ladder, maxLevel, next, nextFetchedAt, canAsk, busy, error, onAsk, onFocusRegion }: Props) {
  const deadline = next && !next.available && next.unlocks_in_s ? nextFetchedAt + next.unlocks_in_s * 1000 : null;
  const remaining = useCountdown(deadline);
  const exhausted = ladder.length >= maxLevel;
  const locked = !!next && !next.available && remaining > 0;
  const upcoming = Array.from({ length: Math.max(0, maxLevel - ladder.length) }, (_, i) => ladder.length + i + 1);

  return (
    <section aria-label="Hints" className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb size={18} className="text-medium" aria-hidden />
        <h2 className="text-base font-semibold text-text-1">Hint ladder</h2>
        <span className="ml-auto rounded-full bg-fill-3 px-2 py-0.5 text-xs text-text-2">
          {ladder.length}/{maxLevel} used · never the answer
        </span>
      </div>

      <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-line-strong">
        {ladder.map((h) => (
          <motion.li key={h.level} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-3">
            <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-medium text-xs font-semibold text-bg">{h.level}</span>
            <div className="min-w-0 flex-1 rounded-lc bg-fill-2 p-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-medium">{h.title}</p>
                {h.source === "ai" && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-1.5 py-px text-[10px] font-medium text-brand"
                    title="Worded by AI from CodeQuest's deterministic hint, then leak-checked against the solution"
                  >
                    <Sparkles size={10} aria-hidden /> AI-worded
                  </span>
                )}
                {h.region && (
                  <button
                    type="button"
                    onClick={() => onFocusRegion(h.region)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lc-sm px-1.5 py-0.5 text-xs text-text-2 transition-colors hover:bg-fill-3 hover:text-text-1"
                  >
                    <Crosshair size={12} aria-hidden /> Show lines {h.region[0]}–{h.region[1]}
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-text-1">{h.text}</p>
            </div>
          </motion.li>
        ))}
        {upcoming.map((level) => (
          <li key={level} className="relative flex items-center gap-3">
            <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-fill-3 text-xs text-text-3">{level}</span>
            <span className={cx("text-sm", level === ladder.length + 1 ? "text-text-2" : "text-text-3")}>
              {level === ladder.length + 1 ? "Next hint" : "Locked"}
            </span>
          </li>
        ))}
      </ol>

      {!exhausted && (
        <Button variant="secondary" className="w-full" onClick={onAsk} disabled={!canAsk || locked} loading={busy}>
          {locked ? <Lock size={14} aria-hidden /> : <Lightbulb size={14} className="text-medium" aria-hidden />}
          {busy ? "Thinking…" : locked ? `Change your code and resubmit, or wait ${remaining}s` : `Show hint ${ladder.length + 1}`}
        </Button>
      )}
      {!canAsk && !exhausted && <p className="text-xs text-text-3">Submit your code first. Hints respond to what you wrote.</p>}
      {error && (
        <p role="alert" className="text-xs text-red">
          {error}
        </p>
      )}
    </section>
  );
}
