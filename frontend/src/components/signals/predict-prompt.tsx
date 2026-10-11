"use client";

import { Brain, CornerDownLeft } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { PredictionInput, PredictionPrompt } from "@/lib/types";
import { Button } from "../ui/button";
import { cx } from "../ui/cx";

const MAX_ANSWER = 200;

/**
 * Predict Before You Run: one question before the first submission of an attempt. The learner predicts what their
 * own code returns for a small input the examples don't show; the judge then compares prediction, code and answer.
 */
export function PredictPrompt({
  prompt,
  busy,
  onSubmit,
  onCancel,
}: {
  prompt: PredictionPrompt;
  busy: boolean;
  onSubmit: (prediction: PredictionInput) => void;
  onCancel: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [crash, setCrash] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const ready = crash || answer.trim().length > 0;

  useEffect(() => input.current?.focus(), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready && !busy) onSubmit(crash ? { prompt_id: prompt.prompt_id, crash: true } : { prompt_id: prompt.prompt_id, answer: answer.trim() });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      aria-labelledby={`${hintId}-title`}
      className="space-y-4 rounded-lc bg-linear-to-br from-brand-bg-2 to-brand-bg p-4"
    >
      <div className="flex items-start gap-2">
        <Brain size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <div>
          <h2 id={`${hintId}-title`} className="text-sm font-semibold text-text-1">
            Before it runs: predict your code
          </h2>
          <p className="mt-0.5 text-xs text-text-2">
            One question per attempt. It shows whether you understand what your code does, not just whether it passes.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${hintId}-answer`} className="text-sm text-text-1">
          What will <span className="font-semibold">your</span> code return for
        </label>
        <p className="break-all rounded-lc-sm bg-black/25 px-3 py-2 font-mono text-[13px] text-text-1">{prompt.call}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          id={`${hintId}-answer`}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={crash}
          maxLength={MAX_ANSWER}
          spellCheck={false}
          autoComplete="off"
          placeholder="e.g. 3, [1, 2], 'ab', None"
          aria-describedby={`${hintId}-help`}
          className={cx(
            "h-9 min-w-0 flex-1 rounded-lc-sm bg-black/30 px-3 font-mono text-[13px] text-text-1 placeholder:text-text-3",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:opacity-40",
          )}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-2">
          <input
            type="checkbox"
            checked={crash}
            onChange={(e) => setCrash(e.target.checked)}
            className="size-4 accent-[var(--lc-brand)]"
          />
          It raises an error
        </label>
      </div>
      <p id={`${hintId}-help`} className="text-[11px] text-text-3">
        Type a Python value. Quotes are optional for text. Trace your code in your head; don&apos;t run it.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={!ready} loading={busy}>
          Run with my prediction <CornerDownLeft size={14} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onSubmit({ prompt_id: prompt.prompt_id, skipped: true })}
        >
          Skip and run
        </Button>
        <button type="button" onClick={onCancel} className="ml-auto text-xs text-text-3 hover:text-text-1">
          Back to editing
        </button>
      </div>
    </motion.form>
  );
}
