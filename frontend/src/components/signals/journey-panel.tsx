"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, GitCompareArrows, History, MessageSquareQuote, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { mistakeLabel } from "@/lib/format";
import { AGREEMENT_COPY, SELF_REPORT_COPY, STEP_DOT, STEP_LABEL, STYLE_COPY, signed } from "@/lib/signals";
import type { DiffRow, Journey, JourneyStep, SelfReport } from "@/lib/types";
import { Button } from "../ui/button";
import { cx } from "../ui/cx";
import { ErrorState, Skeleton } from "../ui/states";

const MAX_NOTE = 280;

function deltaText(step: JourneyStep, steps: JourneyStep[]): string {
  if (step.kind === "first") return `${step.passed}/${step.total} tests passed`;
  if (step.kind === "resubmit") return "Identical code (comments and spacing aside), so nothing could change";
  if (step.kind === "revert") return `Back to the code of step ${step.revert_of}`;
  if (step.kind === "sideways") {
    const prev = steps[step.index - 2];
    return prev && prev.failing.join() === step.failing.join()
      ? "Code changed, but the same tests still fail"
      : "Same number of tests, but different ones fail";
  }
  if (step.delta === null) return "";
  return `${signed(step.delta)} test${Math.abs(step.delta) === 1 ? "" : "s"} compared with step ${step.index - 1}`;
}

function DiffView({ step }: { step: JourneyStep }) {
  if (!step.change) return null;
  if (step.change.hunks.length === 0) return <p className="text-sm text-text-3">No code changes in this step.</p>;
  return (
    <div className="overflow-x-auto rounded-lc-sm bg-bg-ws font-mono text-[12.5px] leading-5">
      {step.change.hunks.map((hunk, h) => (
        <div key={h} className={cx(h > 0 && "border-t border-line")}>
          {h > 0 && <div className="px-3 text-text-3" aria-hidden>⋯</div>}
          {hunk.rows.map((row: DiffRow, i) => (
            <div
              key={i}
              className={cx(
                "grid grid-cols-[2.5rem_2.5rem_1rem_minmax(0,1fr)] whitespace-pre",
                row.t === "+" && "bg-green/10",
                row.t === "-" && "bg-red/10",
              )}
            >
              <span className="select-none pr-2 text-right text-gutter">{row.a ?? ""}</span>
              <span className="select-none pr-2 text-right text-gutter">{row.b ?? ""}</span>
              <span className={cx("select-none", row.t === "+" ? "text-green" : row.t === "-" ? "text-red" : "text-text-3")} aria-hidden>
                {row.t === " " ? "" : row.t}
              </span>
              <span className="pr-3 text-text-1">
                <span className="sr-only">{row.t === "+" ? "added: " : row.t === "-" ? "removed: " : ""}</span>
                {row.text || " "}
              </span>
            </div>
          ))}
        </div>
      ))}
      {step.change.truncated && <p className="px-3 py-1 text-text-3">Diff truncated.</p>}
    </div>
  );
}

function Timeline({ steps, selected, onSelect }: { steps: JourneyStep[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <ol className="flex items-end gap-1 overflow-x-auto pb-1" aria-label="Submissions in this attempt">
      {steps.map((s, i) => {
        const share = s.total ? s.passed / s.total : 0;
        return (
          <li key={s.submission_id} className="flex items-end">
            {i > 0 && <span className="mb-[18px] h-px w-4 bg-line-strong" aria-hidden />}
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={i === selected ? "step" : undefined}
              aria-label={`Step ${s.index}: ${STEP_LABEL[s.kind]}, ${s.passed} of ${s.total} tests passed`}
              className={cx(
                "group flex w-16 flex-col items-center gap-1 rounded-lc-sm px-1 py-1.5 transition-colors",
                i === selected ? "bg-fill-3" : "hover:bg-fill-2",
              )}
            >
              <span className="relative h-10 w-2.5 overflow-hidden rounded-full bg-fill-2" aria-hidden>
                <span className="absolute inset-x-0 bottom-0 rounded-full bg-green" style={{ height: `${Math.max(share * 100, 6)}%` }} />
              </span>
              <span className="flex items-center gap-1 text-[11px] text-text-2">
                <span className={cx("size-2 rounded-full", STEP_DOT[s.kind])} aria-hidden />
                {s.index}
              </span>
              <span className="text-[10px] tabular-nums text-text-3">
                {s.passed}/{s.total}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Reflection({ journey, challengeId }: { journey: Journey; challengeId: string }) {
  const queryClient = useQueryClient();
  const id = useId();
  const [editing, setEditing] = useState(!journey.reflection);
  const [choice, setChoice] = useState<SelfReport | null>(journey.reflection?.strategy ?? null);
  const [note, setNote] = useState(journey.reflection?.note ?? "");
  const save = useMutation({
    mutationFn: () => api.reflect(challengeId, choice as SelfReport, note),
    onSuccess: (data) => {
      queryClient.setQueryData(["journey", challengeId, null], data);
      queryClient.setQueryData(["journey", challengeId, data.attempt?.id ?? null], data);
      setEditing(false);
    },
  });

  if (!editing && journey.reflection) {
    const style = journey.summary?.style;
    return (
      <div className="space-y-1 rounded-lc bg-fill-2 px-3 py-2 text-sm">
        <p className="text-text-1">
          You called it <strong>{SELF_REPORT_COPY[journey.reflection.strategy].title.toLowerCase()}</strong>.{" "}
          {journey.agreement && (
            <span className="text-text-2">
              {AGREEMENT_COPY[journey.agreement]}
              {journey.agreement !== "agrees" && style ? ` It reads as ${STYLE_COPY[style].title.toLowerCase()}.` : ""}
            </span>
          )}
        </p>
        {journey.reflection.note && <p className="text-text-2">&ldquo;{journey.reflection.note}&rdquo;</p>}
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-brand hover:underline">
          Change
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (choice) save.mutate();
      }}
      className="space-y-3 rounded-lc bg-fill-2 px-3 py-3"
      aria-labelledby={`${id}-q`}
    >
      <p id={`${id}-q`} className="flex items-center gap-2 text-sm font-medium text-text-1">
        <MessageSquareQuote size={16} className="text-brand" aria-hidden /> Looking back, how did you debug this?
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-q`} className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(SELF_REPORT_COPY) as SelfReport[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={choice === key}
            onClick={() => setChoice(key)}
            className={cx(
              "rounded-lc-sm px-3 py-2 text-left text-sm transition-colors",
              choice === key ? "bg-brand/15 text-text-1 ring-1 ring-brand" : "bg-fill-3 text-text-2 hover:text-text-1",
            )}
          >
            <span className="block font-medium text-text-1">{SELF_REPORT_COPY[key].title}</span>
            <span className="text-xs">{SELF_REPORT_COPY[key].text}</span>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs text-text-3">What was the bug, and what clue found it? (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={MAX_NOTE}
          rows={2}
          className="mt-1 w-full resize-none rounded-lc-sm bg-hover px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-line-strong"
        />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={!choice} loading={save.isPending}>
          Save reflection
        </Button>
        {save.isError && (
          <span role="alert" className="text-xs text-red">
            {save.error instanceof ApiError ? save.error.message : "Could not save."}
          </span>
        )}
      </div>
    </form>
  );
}

/** Debug Journey: every submission of an attempt as a timeline of code changes and test results. */
export function JourneyPanel({ challengeId }: { challengeId: string }) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);
  const journey = useQuery({
    queryKey: ["journey", challengeId, attemptId],
    queryFn: () => api.journey(challengeId, attemptId ?? undefined),
  });

  if (journey.isError) {
    return (
      <ErrorState
        message={journey.error instanceof ApiError ? journey.error.message : "Could not load your journey."}
        onRetry={() => void journey.refetch()}
      />
    );
  }
  if (journey.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  const data = journey.data;
  if (!data.attempt || data.steps.length === 0 || !data.summary) {
    return (
      <p className="grid h-full min-h-32 place-items-center text-center text-sm text-text-3">
        Submit your code and every attempt is replayed here, change by change.
      </p>
    );
  }
  const steps = data.steps;
  const selected = Math.min(picked ?? steps.length - 1, steps.length - 1);
  const step = steps[selected];
  const summary = data.summary;
  const style = summary.style ? STYLE_COPY[summary.style] : null;
  // The reflection belongs to the latest attempt (that is what the API saves it on).
  const canReflect = (data.attempt.solved || steps.length >= 2) && data.attempt.id === data.attempts[0]?.id;

  return (
    <section aria-label="Debug journey" className={cx("space-y-4", journey.isFetching && "opacity-80 transition-opacity")}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-1">
            <History size={17} className="text-brand" aria-hidden /> Debug journey
            {style && <span className="rounded-full bg-fill-3 px-2 py-0.5 text-xs font-medium text-text-1">{style.title}</span>}
          </h2>
          {style && <p className="mt-1 text-sm text-text-2">{style.text}</p>}
        </div>
        {data.attempts.length > 1 && (
          <label className="text-xs text-text-3">
            <span className="sr-only">Attempt</span>
            <select
              value={data.attempt.id}
              onChange={(e) => {
                setAttemptId(e.target.value);
                setPicked(null);
              }}
              className="h-8 rounded-lc-sm bg-fill-3 px-2 text-sm text-text-1"
            >
              {data.attempts.map((a, i) => (
                <option key={a.id} value={a.id}>
                  {i === 0 ? "Latest attempt" : `Attempt ${data.attempts.length - i}`} · {a.submissions} submission{a.submissions === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Submissions", String(summary.submissions)],
          ["Steps forward", steps.length > 1 ? `${summary.productive} of ${steps.length - 1}` : "–"],
          ["Repeats & reverts", String(summary.resubmits + summary.reverts)],
          ["Stuck score (EQ)", summary.error_quotient === null ? "–" : summary.error_quotient.toFixed(2)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lc-sm bg-fill-2 px-3 py-2">
            <dt className="text-[11px] text-text-3">{label}</dt>
            <dd className="text-base font-semibold text-text-1">{value}</dd>
          </div>
        ))}
      </dl>

      <Timeline steps={steps} selected={selected} onSelect={setPicked} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx("size-2.5 rounded-full", STEP_DOT[step.kind])} aria-hidden />
          <h3 className="text-sm font-semibold text-text-1">
            Step {step.index}: {STEP_LABEL[step.kind]}
          </h3>
          <span className="text-sm text-text-2">{deltaText(step, steps)}</span>
          {step.change && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-3">
              <GitCompareArrows size={13} aria-hidden /> +{step.change.added} −{step.change.removed}
              {step.change.focused ? " · one idea" : ""}
            </span>
          )}
        </div>
        {(step.mistakes.length > 0 || step.syntax_error) && (
          <div className="flex flex-wrap gap-1.5">
            {step.syntax_error && <span className="rounded-full bg-red/10 px-2 py-0.5 text-xs text-red">Syntax error</span>}
            {step.mistakes.map((m) => (
              <span key={m} className="rounded-full bg-fill-3 px-2 py-0.5 text-xs text-text-2">
                {mistakeLabel(m)}
              </span>
            ))}
          </div>
        )}
        {step.change ? <DiffView step={step} /> : <p className="text-sm text-text-3">Your starting point for this attempt.</p>}
        <button
          type="button"
          onClick={() => setShowCode((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-text-1"
          aria-expanded={showCode}
        >
          {showCode ? <RotateCcw size={13} aria-hidden /> : <Code2 size={13} aria-hidden />}
          {showCode ? "Hide full code" : `Show the full code at step ${step.index}`}
        </button>
        {showCode && (
          <pre className="max-h-72 overflow-auto rounded-lc-sm bg-bg-ws px-3 py-2 font-mono text-[12.5px] leading-5 text-text-1">{step.code}</pre>
        )}
      </div>

      {canReflect && <Reflection key={data.attempt.id} journey={data} challengeId={challengeId} />}
    </section>
  );
}
