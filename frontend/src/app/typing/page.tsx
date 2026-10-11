"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Gauge, Keyboard, RotateCcw, SkipForward, Sparkles, Target, Trophy, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/app-shell";
import { Trainer } from "@/components/typing/trainer";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { ErrorState, Kbd, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { ApiError, api } from "@/lib/api";
import { conceptLabel, mistakeLabel } from "@/lib/format";
import type { TypingDrill, TypingDrills, TypingRunInput, TypingRunResult, TypingSummary } from "@/lib/types";

const PREFS_KEY = "codequest.typing.prefs";

interface Prefs {
  autoIndent: boolean;
  pace: boolean;
}

const DEFAULT_PREFS: Prefs = { autoIndent: true, pace: true };
const prefListeners = new Set<() => void>();
let memoryPrefs = ""; // used when localStorage is blocked, so toggles still work for this visit

function readRawPrefs(): string {
  try {
    return window.localStorage.getItem(PREFS_KEY) ?? memoryPrefs;
  } catch {
    return memoryPrefs;
  }
}

function subscribePrefs(onChange: () => void): () => void {
  prefListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    prefListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parsePrefs(raw: string): Prefs {
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return { autoIndent: parsed.autoIndent ?? true, pace: parsed.pace ?? true };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: Prefs): void {
  memoryPrefs = JSON.stringify(prefs);
  try {
    window.localStorage.setItem(PREFS_KEY, memoryPrefs);
  } catch {
    /* storage unavailable: the in-memory copy still applies */
  }
  prefListeners.forEach((notify) => notify());
}

/** Trainer preferences from localStorage; defaults during SSR and the first client render. */
function usePrefs(): Prefs {
  const raw = useSyncExternalStore(subscribePrefs, readRawPrefs, () => "");
  return useMemo(() => parsePrefs(raw), [raw]);
}

/** How a key is shown in the results: invisible characters get a visible name. */
function keyLabel(ch: string): string {
  if (ch === " ") return "space";
  if (ch === "\n") return "enter";
  return ch;
}

export default function TypingPage() {
  return (
    <AppShell>
      <TypingView />
    </AppShell>
  );
}

function TypingView() {
  const drills = useQuery({ queryKey: ["typing-drills"], queryFn: api.typingDrills, staleTime: 60_000 });
  if (drills.isError) {
    return (
      <ErrorState
        message={drills.error instanceof ApiError ? drills.error.message : "Could not load your typing drills."}
        onRetry={() => void drills.refetch()}
      />
    );
  }
  if (!drills.data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
        <Skeleton className="h-[420px] rounded-lc" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lc" />
          <Skeleton className="h-72 rounded-lc" />
        </div>
      </div>
    );
  }
  return <Warmup data={drills.data} />;
}

function Warmup({ data }: { data: TypingDrills }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(() => data.drills[0]?.id ?? "");
  const [attempt, setAttempt] = useState(0);
  const prefs = usePrefs();
  const [result, setResult] = useState<{ res: TypingRunResult; errors: Record<string, number> } | null>(null);

  const drill = data.drills.find((d) => d.id === selectedId) ?? data.drills[0];
  const summary = result?.res.summary ?? data.summary;

  const save = useMutation({
    mutationFn: (input: TypingRunInput) => api.postTypingRun(input),
    onSuccess: (res) => {
      queryClient.setQueryData<TypingDrills>(["typing-drills"], (old) => (old ? { ...old, summary: res.summary } : old));
      void queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const onFinish = useCallback(
    (input: TypingRunInput, errors: Record<string, number>) => {
      save.mutate(input, { onSuccess: (res) => setResult({ res, errors }) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `save.mutate` is stable
    [],
  );

  const choose = (id: string) => {
    setSelectedId(id);
    setResult(null);
    save.reset();
    setAttempt((a) => a + 1);
  };
  const next = () => {
    const i = data.drills.findIndex((d) => d.id === drill?.id);
    const after = data.drills[(i + 1) % data.drills.length];
    if (after) choose(after.id);
  };
  const retry = () => {
    setResult(null);
    save.reset();
    setAttempt((a) => a + 1);
  };
  const updatePrefs = (patch: Partial<Prefs>) => {
    writePrefs({ ...prefs, ...patch });
    retry();
  };

  if (!drill) {
    return <ErrorState message="There are no typing drills available right now." />;
  }
  const pace = prefs.pace ? (summary?.pace_cpm ?? null) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <header>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-bg-2 px-3 py-1 text-xs font-medium text-brand">
            <Keyboard size={14} aria-hidden /> Syntax Warm-up
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-text-1">Code typing, accuracy first</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-2">
            Real Python, picked for your weak spots. A wrong key never moves the caret, so you build clean habits before speed.
            Brackets, colons, quotes and commas count extra: they cause most beginner syntax errors.
          </p>
        </header>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-text-1">
                {drill.title}
                {drill.source === "own" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[11px] font-medium text-green">
                    <UserRound size={11} aria-hidden /> Your code
                  </span>
                )}
                <span className="rounded-full bg-fill-3 px-2 py-0.5 text-[11px] font-normal text-text-2">{conceptLabel(drill.concept)}</span>
              </h2>
              <p className="mt-0.5 text-xs text-text-3">{drill.reason}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-2">
              <label className="inline-flex items-center gap-2">
                <Switch label="Auto-indent" checked={prefs.autoIndent} onChange={(on) => updatePrefs({ autoIndent: on })} />
                Auto-indent
              </label>
              <label className="inline-flex items-center gap-2" title={summary?.pace_cpm ? undefined : "Unlocks after 3 runs at 95%+ accuracy"}>
                <Switch label="Pace caret" checked={prefs.pace} onChange={(on) => updatePrefs({ pace: on })} />
                Pace caret
              </label>
            </div>
          </div>

          {result ? (
            <Results result={result.res} errors={result.errors} onRetry={retry} onNext={next} />
          ) : (
            <>
              <Trainer
                key={`${drill.id}-${prefs.autoIndent}-${attempt}`}
                drill={drill}
                autoIndent={prefs.autoIndent}
                paceCpm={pace}
                onFinish={onFinish}
                onNext={next}
              />
              {save.isPending && <p className="mt-3 text-sm text-text-2">Saving your run…</p>}
              {save.isError && (
                <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-red">
                  {save.error instanceof ApiError ? save.error.message : "Could not save this run."}
                  <Button size="sm" onClick={retry}>
                    <RotateCcw size={14} aria-hidden /> Try again
                  </Button>
                </div>
              )}
              <p className="mt-3 text-xs text-text-3">
                {prefs.autoIndent ? "Press Enter at each ↵; indentation is typed for you." : "Type the indentation too (Tab = 4 spaces): it trains the skill behind IndentationError."}{" "}
                {pace ? "The blue caret is your personal pace: your recent median + 5%." : ""} Paste is disabled. Best on a physical keyboard.
              </p>
            </>
          )}
        </Card>
      </div>

      <aside className="space-y-4" aria-label="Your typing">
        <StatsCard summary={summary} />
        <FocusCard focus={data.focus} />
        <DrillList drills={data.drills} selected={drill.id} onSelect={choose} />
      </aside>
    </div>
  );
}

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      setShown(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return <>{(reduce ? value : shown).toFixed(decimals)}</>;
}

function Results({ result, errors, onRetry, onNext }: { result: TypingRunResult; errors: Record<string, number>; onRetry: () => void; onNext: () => void }) {
  const { run } = result;
  const reduce = useReducedMotion();
  const missed = Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 8);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onNext();
      } else if (e.key === "r" || e.key === "R" || e.key === "Escape") {
        e.preventDefault();
        onRetry();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onRetry]);

  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} role="status">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="text-xs text-text-3">Words per minute</p>
          <p className="text-5xl font-semibold tabular-nums text-brand">
            <CountUp value={run.wpm} />
          </p>
        </div>
        <ResultStat label="Accuracy" value={`${Math.round(run.accuracy * 100)}%`} tone={run.accuracy >= 0.95 ? "text-green" : run.accuracy >= 0.85 ? "text-medium" : "text-red"} />
        <ResultStat label="Syntax accuracy" value={run.syntax_accuracy === null ? "–" : `${Math.round(run.syntax_accuracy * 100)}%`} />
        <ResultStat label="Time" value={`${(run.duration_ms / 1000).toFixed(1)}s`} />
        <ResultStat label="Chars / min" value={String(Math.round(run.cpm))} />
        {run.personal_best && (
          <motion.span
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-sm font-semibold text-bg"
          >
            <Trophy size={15} aria-hidden /> New personal best
          </motion.span>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lc bg-panel p-3">
          <p className="text-xs font-medium text-text-2">Keys you missed</p>
          {missed.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {missed.map(([ch, n]) => (
                <li key={ch} className="inline-flex items-center gap-1 rounded-md bg-red/10 px-2 py-0.5 font-mono text-xs text-red">
                  {keyLabel(ch)} <span className="text-text-3">×{n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-green">Flawless. Not a single wrong key.</p>
          )}
        </div>
        <div className="rounded-lc bg-panel p-3">
          <p className="text-xs font-medium text-text-2">Your last runs (WPM)</p>
          <Sparkline summary={result.summary} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={onNext}>
          <SkipForward size={16} aria-hidden /> Next drill
        </Button>
        <Button onClick={onRetry}>
          <RotateCcw size={16} aria-hidden /> Retry
        </Button>
        <span className="text-xs text-text-3">
          <Kbd>Enter</Kbd> next · <Kbd>R</Kbd> retry
        </span>
      </div>
    </motion.div>
  );
}

function ResultStat({ label, value, tone = "text-text-1" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-text-3">{label}</p>
      <p className={cx("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

function Sparkline({ summary }: { summary: TypingSummary }) {
  const points = summary.recent.map((r) => r.wpm);
  if (points.length < 2) return <p className="mt-2 text-sm text-text-3">Do another run to see your trend.</p>;
  const w = 240;
  const h = 48;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (w - 8) + 4, h - 4 - ((p - min) / span) * (h - 8)] as const);
  const last = xy[xy.length - 1];
  const first = points[0];
  const latest = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 h-12 w-full"
      role="img"
      aria-label={`WPM over your last ${points.length} runs, from ${Math.round(first)} to ${Math.round(latest)}; best ${Math.round(max)}.`}
    >
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-brand" />
      <circle cx={last[0]} cy={last[1]} r={3.5} className="fill-brand" />
    </svg>
  );
}

function StatsCard({ summary }: { summary: TypingSummary | null }) {
  return (
    <Card aria-labelledby="typing-stats" className="pb-4">
      <CardTitle id="typing-stats" icon={<Gauge size={18} className="text-cyan" aria-hidden />}>
        Your typing
      </CardTitle>
      {summary ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 px-4">
            <Mini label="Best WPM" value={String(Math.round(summary.best_wpm))} />
            <Mini label="Accuracy (last 10)" value={`${Math.round(summary.accuracy * 100)}%`} />
            <Mini label="Syntax fluency" value={summary.syntax_accuracy === null ? "–" : `${Math.round(summary.syntax_accuracy * 100)}%`} />
            <Mini label="Runs" value={String(summary.runs)} />
          </dl>
          <p className="mt-3 flex items-start gap-2 px-4 text-xs text-text-3">
            <Target size={14} className="mt-0.5 shrink-0 text-blue" aria-hidden />
            {summary.pace_cpm
              ? `Pace caret: ${Math.round(summary.pace_cpm / 5)} WPM. It rises as you improve.`
              : "Your pace caret unlocks after 3 runs at 95%+ accuracy."}
          </p>
          {summary.top_errors.length > 0 && (
            <div className="mt-3 px-4">
              <p className="text-xs text-text-3">Trickiest keys lately</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.top_errors.map(([ch, n]) => (
                  <li key={ch} className="rounded-md bg-fill-3 px-2 py-0.5 font-mono text-xs text-text-1">
                    {keyLabel(ch)} <span className="text-text-3">×{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="px-4 pt-2 text-sm text-text-3">No runs yet. Your first drill sets your baseline.</p>
      )}
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lc bg-panel px-3 py-2">
      <dt className="text-[11px] text-text-3">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-text-1">{value}</dd>
    </div>
  );
}

function FocusCard({ focus }: { focus: TypingDrills["focus"] }) {
  if (!focus.syntax.length && !focus.concepts.length) return null;
  return (
    <Card aria-labelledby="typing-focus" className="pb-4">
      <CardTitle id="typing-focus" icon={<Brain size={18} className="text-brand" aria-hidden />}>
        Picked for you
      </CardTitle>
      <div className="space-y-2 px-4 pt-2 text-sm">
        {focus.syntax.length > 0 && (
          <p className="text-text-2">
            Your code keeps hitting <span className="text-text-1">{focus.syntax.map(mistakeLabel).join(", ")}</span>, so drills heavy in
            those characters come first.
          </p>
        )}
        {focus.concepts.length > 0 && (
          <p className="text-text-2">
            Concepts you&apos;re learning: <span className="text-text-1">{focus.concepts.map(conceptLabel).join(", ")}</span>.
          </p>
        )}
      </div>
    </Card>
  );
}

function DrillList({ drills, selected, onSelect }: { drills: TypingDrill[]; selected: string; onSelect: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(() => (showAll ? drills : drills.slice(0, 8)), [drills, showAll]);
  return (
    <Card aria-labelledby="typing-drills" className="pb-3">
      <CardTitle id="typing-drills" icon={<Sparkles size={18} className="text-green" aria-hidden />}>
        Drills
      </CardTitle>
      <ul className="mt-2 space-y-0.5 px-2">
        {visible.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onSelect(d.id)}
              aria-current={d.id === selected ? "true" : undefined}
              className={cx(
                "flex w-full items-center gap-2 rounded-lc-sm px-2 py-2 text-left transition-colors",
                d.id === selected ? "bg-fill-3" : "hover:bg-hover",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text-1">{d.title}</span>
                <span className="block text-[11px] text-text-3">
                  {conceptLabel(d.concept)} · {d.lines} lines
                </span>
              </span>
              {d.source === "own" && <UserRound size={14} className="shrink-0 text-green" aria-label="Your code" />}
              {d.recommended && <span className="shrink-0 rounded-full bg-brand/15 px-1.5 text-[10px] font-medium text-brand">For you</span>}
            </button>
          </li>
        ))}
      </ul>
      {drills.length > 8 && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="mx-4 mt-2 text-xs text-brand hover:underline">
          {showAll ? "Show fewer" : `Show all ${drills.length} drills`}
        </button>
      )}
    </Card>
  );
}
