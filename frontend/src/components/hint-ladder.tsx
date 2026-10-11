"use client";

import { Lightbulb, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { HintEntry, HintGate } from "@/lib/types";

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

export function HintLadder({ ladder, maxLevel, next, nextFetchedAt, canAsk, busy, error, onAsk, onFocusRegion }: Props) {
  const deadline = next && !next.available && next.unlocks_in_s ? nextFetchedAt + next.unlocks_in_s * 1000 : null;
  const remaining = useCountdown(deadline);
  const exhausted = ladder.length >= maxLevel;
  const locked = !!next && !next.available && remaining > 0;
  return (
    <section aria-label="Hints" className="rounded-xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb size={16} className="text-wrong" aria-hidden />
        <h2 className="text-sm font-medium">Hints</h2>
        <span className="ml-auto text-xs text-muted">
          {ladder.length}/{maxLevel} used · never the answer
        </span>
      </div>
      <ol className="space-y-2">
        {ladder.map((h) => (
          <motion.li
            key={h.level}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg bg-panel-2 p-2.5 text-sm"
          >
            <button type="button" className="w-full text-left" onClick={() => onFocusRegion(h.region)}>
              <span className="text-xs text-muted">
                Hint {h.level} · {h.title}
              </span>
              <p className="mt-0.5 leading-relaxed">{h.text}</p>
            </button>
          </motion.li>
        ))}
      </ol>
      {!exhausted && (
        <button
          type="button"
          onClick={onAsk}
          disabled={!canAsk || busy || locked}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm transition hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {locked ? <Lock size={14} aria-hidden /> : <Lightbulb size={14} aria-hidden />}
          {busy
            ? "Thinking…"
            : locked
              ? `Change your code and resubmit, or wait ${remaining}s`
              : `Show hint ${ladder.length + 1}`}
        </button>
      )}
      {!canAsk && !exhausted && (
        <p className="mt-2 text-xs text-muted">Submit your code first. Hints respond to what you wrote.</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}
    </section>
  );
}
