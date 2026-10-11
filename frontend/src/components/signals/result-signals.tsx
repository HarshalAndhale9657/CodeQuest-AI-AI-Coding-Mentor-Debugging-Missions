"use client";

import { Brain, Loader2, Scale, ShieldAlert, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { PREDICTION_COPY, PREDICTION_TONE } from "@/lib/signals";
import type { PredictionResult, Robustness, RuleViolation } from "@/lib/types";
import { cx } from "../ui/cx";

function Cell({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lc-sm bg-fill-2 px-3 py-2">
      <p className="text-[11px] text-text-3">{label}</p>
      <p className={cx("truncate font-mono text-[13px] text-text-1", tone)} title={typeof value === "string" ? value : undefined}>
        {value}
      </p>
    </div>
  );
}

/** Where the prediction landed: prediction vs what the code returned vs the correct answer. */
export function PredictionCard({ prediction }: { prediction: PredictionResult }) {
  const copy = PREDICTION_COPY[prediction.state];
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Prediction check"
      className="space-y-3 rounded-lc border-l-2 border-line-strong bg-fill-2/40 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Brain size={16} className={PREDICTION_TONE[prediction.state]} aria-hidden />
        <h3 className="text-sm font-semibold text-text-1">Prediction: {copy.title}</h3>
        <span className="font-mono text-xs text-text-3">{prediction.call}</span>
      </div>
      {prediction.state !== "unrun" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Cell label="You predicted" value={prediction.predicted} />
          <Cell label="Your code returned" value={prediction.actual} />
          <Cell
            label="Correct answer"
            value={prediction.expected ?? <span className="font-sans text-text-3">revealed by a later hint</span>}
          />
        </div>
      )}
      <p className="text-sm leading-relaxed text-text-2">{prediction.message}</p>
    </motion.section>
  );
}

/** Why did you pass? The small-input search that runs after every passing submission. */
export function RobustnessCard({ robustness }: { robustness: Robustness }) {
  if (robustness.status === "unchecked") return null;
  if (robustness.status === "checking") {
    return (
      <p className="flex items-center gap-2 text-xs text-text-3" aria-live="polite">
        <Loader2 size={14} className="animate-spin" aria-hidden /> Checking small inputs beyond the tests…
      </p>
    );
  }
  if (robustness.status === "robust") {
    return (
      <p className="flex items-start gap-2 rounded-lc bg-green/10 px-3 py-2 text-sm text-text-1" aria-live="polite">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-green" aria-hidden />
        <span>
          <span className="font-medium">Robust.</span> {robustness.message}
        </span>
      </p>
    );
  }
  const ce = robustness.counterexample;
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      aria-live="polite"
      aria-label="Fragile pass"
      className="space-y-3 rounded-lc bg-medium/10 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-medium" aria-hidden />
        <h3 className="text-sm font-semibold text-text-1">You solved it, but it&apos;s fragile</h3>
        <span className="ml-auto text-xs text-text-3">
          {robustness.failed} of {robustness.checked} extra inputs wrong
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Cell label="Input the tests missed" value={ce.call} />
        <Cell label="Correct answer" value={ce.expected} />
        <Cell label="Your code" value={ce.got ?? (ce.error?.startsWith("no answer") ? "never finished" : `raised ${ce.error}`)} tone="text-red" />
      </div>
      <p className="text-sm leading-relaxed text-text-2">{robustness.message}</p>
      <p className="text-[11px] text-text-3">Your solve still counts. Tests sample behaviour; they don&apos;t prove it.</p>
    </motion.section>
  );
}

/** Tests pass but the mission's rule ("without max()") is broken, so the mission is not complete yet. */
export function RuleBanner({ violations }: { violations: RuleViolation[] }) {
  const calls = [...new Set(violations.map((v) => `${v.call.startsWith(".") ? v.call.slice(1) : v.call}()`))];
  const lines = [...new Set(violations.map((v) => v.line))];
  return (
    <div role="status" className="flex items-start gap-2 rounded-lc bg-medium/10 px-3 py-2 text-sm text-text-1">
      <Scale size={18} className="mt-0.5 shrink-0 text-medium" aria-hidden />
      <span>
        Every test passed, but this mission asks you to solve it without <strong>{calls.join(", ")}</strong> (line
        {lines.length > 1 ? "s" : ""} {lines.join(", ")}). Rewrite that part to complete the mission.
      </span>
    </div>
  );
}
