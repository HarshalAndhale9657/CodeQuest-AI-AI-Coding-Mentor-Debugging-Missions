"use client";

import { Brain, Bug, Gauge, History, Lightbulb, ShieldCheck, Swords, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { conceptLabel, mistakeLabel, TIER_NAME } from "@/lib/format";
import { percent, PREDICTION_COPY, STYLE_COPY } from "@/lib/signals";
import type { Growth, JourneyStyle } from "@/lib/types";
import { Card, CardTitle } from "../ui/card";
import { cx } from "../ui/cx";
import { EmptyState } from "../ui/states";

/* ---------------------------------------------------------------- shared bits */

/** Hover/focus tooltip. It only enhances: every value is also in the card text or its table view. */
function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lc-sm bg-menu px-2 py-1 text-xs text-text-1 opacity-0 shadow-menu transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/** Every chart has a table twin: the accessible, colour-free way to read the same numbers. */
function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="px-4 pt-3 text-xs text-text-3">
      <summary className="cursor-pointer select-none hover:text-text-1">Show as table</summary>
      <table className="mt-2 w-full text-left text-text-2">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="py-1 pr-3 font-medium text-text-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-3 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Kpi({ icon, label, value, sub, trend }: { icon: ReactNode; label: string; value: string; sub: string; trend?: ReactNode }) {
  return (
    <div className="rounded-lc bg-panel px-3 py-3">
      <p className="flex items-center gap-1.5 text-xs text-text-3">
        {icon}
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-2 text-xl font-semibold text-text-1">
        {value}
        {trend}
      </p>
      <p className="text-[11px] text-text-3">{sub}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- KPI row */

function GrowthKpis({ g }: { g: Growth }) {
  const s = g.solves;
  const trend =
    s.trend === "up" ? (
      <span className="inline-flex items-center gap-0.5 text-xs font-normal text-green">
        <TrendingUp size={13} aria-hidden /> rising
      </span>
    ) : s.trend === "down" ? (
      <span className="inline-flex items-center gap-0.5 text-xs font-normal text-medium">
        <TrendingDown size={13} aria-hidden /> slipping
      </span>
    ) : null;
  const p = g.prediction;
  return (
    <div className="grid gap-2 px-4 pt-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        icon={<Lightbulb size={14} className="text-medium" aria-hidden />}
        label="Hint-free solves"
        value={percent(s.hint_free, s.count)}
        sub={s.count ? `${s.hint_free} of ${s.count} solves` : "No solves yet"}
        trend={trend}
      />
      <Kpi
        icon={<Target size={14} className="text-green" aria-hidden />}
        label="First-try solves"
        value={percent(s.first_try, s.count)}
        sub={s.count ? `${s.first_try} of ${s.count} passed on submission 1` : "No solves yet"}
      />
      <Kpi
        icon={<Brain size={14} className="text-brand" aria-hidden />}
        label="Reads own code"
        value={p ? percent(p.traced, p.total) : "–"}
        sub={p ? `${p.traced} of ${p.total} predictions matched the code` : "No predictions yet"}
      />
      <Kpi
        icon={<ShieldCheck size={14} className="text-blue" aria-hidden />}
        label="Robust solves"
        value={g.robustness.checked ? `${g.robustness.robust}/${g.robustness.checked}` : "–"}
        sub={
          g.robustness.fragile
            ? `${g.robustness.fragile} passed the tests but broke on extra inputs`
            : g.robustness.checked
              ? "Survived the search beyond the tests"
              : "Checked after each pass"
        }
      />
    </div>
  );
}

/* ---------------------------------------------------------------- hint independence */

function HintTrendCard({ g }: { g: Growth }) {
  const { series, rolling } = g.solves;
  const W = 100;
  const points = rolling.map((r, i) => ({
    x: rolling.length === 1 ? W / 2 : (i / (rolling.length - 1)) * W,
    y: 100 - r.hint_free_rate * 100,
    r,
    s: series[i],
  }));
  return (
    <Card className="pb-4">
      <CardTitle icon={<Lightbulb size={18} className="text-medium" aria-hidden />}>Hint independence</CardTitle>
      {series.length === 0 ? (
        <EmptyState title="No solves yet" text="Each solved mission adds a point: did you need hints?" />
      ) : (
        <>
          <p className="px-4 pt-1 text-xs text-text-3">Share of your last {Math.min(5, series.length)} solves that needed no hints.</p>
          <div className="px-4 pt-3">
            <div className="relative ml-9 mr-2 h-28 border-b border-l border-line" role="img" aria-label={`Hint-free rate over ${series.length} solves, latest ${Math.round((rolling.at(-1)?.hint_free_rate ?? 0) * 100)}%`}>
              {[0, 50].map((y) => (
                <span key={y} className="absolute inset-x-0 border-t border-line/60" style={{ top: `${y}%` }} aria-hidden />
              ))}
              <span className="absolute -left-1 top-0 -translate-x-full -translate-y-1/2 text-[10px] text-text-3">100%</span>
              <span className="absolute -left-1 bottom-0 -translate-x-full translate-y-1/2 text-[10px] text-text-3">0%</span>
              {points.length > 1 && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="var(--lc-brand)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {points.map((p) => (
                <span key={p.r.n} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <Tip label={`Solve ${p.r.n}: ${p.s.title} · ${p.s.hints} hint${p.s.hints === 1 ? "" : "s"} · ${Math.round(p.r.hint_free_rate * 100)}% hint-free`}>
                    <span tabIndex={0} className="grid size-6 place-items-center rounded-full focus:outline-none" aria-label={`Solve ${p.r.n}`}>
                      <span className="size-2.5 rounded-full bg-brand ring-2 ring-layer-1" />
                    </span>
                  </Tip>
                </span>
              ))}
            </div>
            <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Hints used per solve">
              {series.map((s, i) => (
                <li key={`${s.challenge_id}-${i}`}>
                  <Tip label={`${s.title}: ${s.hints} hint${s.hints === 1 ? "" : "s"}, ${s.submissions} submission${s.submissions === 1 ? "" : "s"}`}>
                    <span
                      tabIndex={0}
                      className={cx(
                        "grid size-7 place-items-center rounded-lc-sm text-[11px] font-medium",
                        s.hint_free ? "bg-green/15 text-green" : "bg-medium/15 text-medium",
                      )}
                      aria-label={`${s.title}: ${s.hints} hints`}
                    >
                      {s.hint_free ? "✓" : s.hints}
                    </span>
                  </Tip>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] text-text-3">✓ = solved without hints · number = hints used</p>
          </div>
          <TableView
            caption="Hints per solve"
            head={["#", "Mission", "Hints", "Submissions", "First try", "Hint-free (last 5)"]}
            rows={series.map((s, i) => [i + 1, s.title, s.hints, s.submissions, s.first_try ? "yes" : "no", `${Math.round((rolling[i]?.hint_free_rate ?? 0) * 100)}%`])}
          />
        </>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- struggle map */

const EFFORT_TILE: Record<"clean" | "worked" | "hard", string> = {
  clean: "bg-green/80 text-bg",
  worked: "bg-medium/80 text-bg",
  hard: "bg-red/80 text-text-1",
};

function StruggleCard({ g, own }: { g: Growth; own: boolean }) {
  const tiers = [...new Set(g.struggle.map((t) => t.tier))].sort((a, b) => a - b);
  const describe = (t: Growth["struggle"][number]) =>
    t.state === "untouched"
      ? `${t.title}: not tried yet`
      : t.state === "stuck"
        ? `${t.title}: not solved yet (${t.submissions} submissions, ${t.hints} hints)`
        : `${t.title}: ${t.effort} solve (${t.submissions} submission${t.submissions === 1 ? "" : "s"}, ${t.hints} hint${t.hints === 1 ? "" : "s"})`;
  return (
    <Card className="pb-4">
      <CardTitle icon={<Swords size={18} className="text-red" aria-hidden />}>Struggle map</CardTitle>
      <p className="px-4 pt-1 text-xs text-text-3">Every mission, by tier. The number is how many submissions it took.</p>
      <div className="space-y-2 px-4 pt-3">
        {tiers.map((tier) => (
          <div key={tier} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs text-text-3">{TIER_NAME[tier] ?? `Tier ${tier}`}</span>
            <ul className="flex flex-wrap gap-1.5">
              {g.struggle
                .filter((t) => t.tier === tier)
                .map((t) => {
                  const tile = (
                    <span
                      tabIndex={own ? undefined : 0}
                      aria-label={describe(t)}
                      className={cx(
                        "grid size-8 place-items-center rounded-lc-sm text-xs font-semibold",
                        t.state === "solved" && t.effort && EFFORT_TILE[t.effort],
                        t.state === "stuck" && "border-2 border-red text-red",
                        t.state === "untouched" && "bg-fill-2 text-text-3",
                        t.type === "debug" && "rounded-full",
                      )}
                    >
                      {t.state === "untouched" ? "" : t.state === "stuck" ? "!" : t.submissions}
                    </span>
                  );
                  return (
                    <li key={t.challenge_id}>
                      <Tip label={describe(t)}>{own ? <Link href={`/m/${t.challenge_id}`}>{tile}</Link> : tile}</Tip>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-3 text-[11px] text-text-3" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-green/80" aria-hidden /> Clean: 1 submission, no hints</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-medium/80" aria-hidden /> Worked for it</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red/80" aria-hidden /> Hard: 4+ submissions or 2+ hints</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border-2 border-red" aria-hidden /> Stuck</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-fill-4" aria-hidden /> Circle = debug mission</li>
      </ul>
      <TableView
        caption="Struggle map"
        head={["Mission", "Tier", "State", "Submissions", "Hints"]}
        rows={g.struggle.filter((t) => t.state !== "untouched").map((t) => [t.title, t.tier, t.state === "solved" ? `solved (${t.effort})` : t.state, t.submissions, t.hints])}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------- mistake lanes */

const LANE_DOT: Record<"recurring" | "seen" | "beaten", string> = {
  recurring: "bg-red",
  seen: "bg-text-3",
  beaten: "bg-green",
};

function LaneState({ state }: { state: "recurring" | "seen" | "beaten" }) {
  if (state === "recurring")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red/15 px-2 py-0.5 text-[11px] font-medium text-red">
        <Swords size={11} aria-hidden /> Boss: active
      </span>
    );
  if (state === "beaten")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[11px] font-medium text-green">
        <Trophy size={11} aria-hidden /> Defeated
      </span>
    );
  return <span className="rounded-full bg-fill-3 px-2 py-0.5 text-[11px] text-text-2">Seen</span>;
}

export function MistakeLanesCard({ g }: { g: Growth }) {
  const { attempts, lanes } = g.lanes;
  const cols = attempts.length;
  return (
    <Card className="pb-4">
      <CardTitle icon={<Bug size={18} className="text-brand" aria-hidden />}>Mistake lanes</CardTitle>
      <p className="px-4 pt-1 text-xs text-text-3">
        One lane per kind of bug across your attempts. A bug that keeps coming back is a boss; stop repeating it to defeat it.
      </p>
      {lanes.length === 0 ? (
        <EmptyState title="A clean slate" text="No mistakes recorded yet." />
      ) : (
        <div className="overflow-x-auto px-4 pt-3">
          <div className="grid min-w-[28rem] items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: "minmax(9rem, 12rem) minmax(0, 1fr)" }}>
            <span />
            <div className="grid text-[10px] text-text-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
              {attempts.map((a) => (
                <span key={a.n} className="text-center">
                  {cols <= 12 || a.n === 1 || a.n === cols || a.n % 5 === 0 ? a.number : ""}
                </span>
              ))}
            </div>
            {lanes.map((lane) => (
              <div key={lane.key} className="contents">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm text-text-1">{mistakeLabel(lane.key)}</p>
                  <div className="flex items-center gap-2">
                    <LaneState state={lane.state} />
                    <span className="text-[11px] text-text-3">{lane.hits.length}×</span>
                  </div>
                </div>
                <div className="relative grid h-8 items-center rounded-lc-sm bg-row-alt" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                  {attempts.map((a) => {
                    const hit = lane.hits.includes(a.n);
                    return (
                      <span key={a.n} className="flex justify-center">
                        {hit ? (
                          <Tip label={`Attempt ${a.number}: ${a.title}`}>
                            <span tabIndex={0} className="grid size-6 place-items-center focus:outline-none" aria-label={`${mistakeLabel(lane.key)} in attempt ${a.number}, ${a.title}`}>
                              <span className={cx("size-3 rounded-full ring-2 ring-row-alt", LANE_DOT[lane.state])} />
                            </span>
                          </Tip>
                        ) : (
                          <span className="h-1 w-px bg-line-strong" aria-hidden />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="pt-2 text-right text-[11px] text-text-3">attempt →</p>
        </div>
      )}
      <TableView
        caption="Mistake lanes"
        head={["Mistake", "State", "Times", "Attempts"]}
        rows={lanes.map((l) => [mistakeLabel(l.key), l.state, l.hits.length, l.hits.map((n) => attempts[n - 1]?.title ?? n).join(", ")])}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------- prediction */

const FLAG_COPY = {
  lucky_passes: "Passing without predicting it",
  untraced_skill: "Skill outpaces tracing",
} as const;

function PredictionStatsCard({ g }: { g: Growth }) {
  const p = g.prediction;
  return (
    <Card className="pb-4">
      <CardTitle icon={<Brain size={18} className="text-brand" aria-hidden />}>Predict before you run</CardTitle>
      {!p ? (
        <EmptyState title="No predictions yet" text="The first submission of each attempt asks what your code will return." />
      ) : (
        <>
          <p className="px-4 pt-1 text-xs text-text-3">
            Before running, you predicted your code&apos;s output {p.total} time{p.total === 1 ? "" : "s"}. Rows: did you know the
            right answer? Columns: did you know what your code would do?
          </p>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 px-4 pt-3 text-xs">
            <span />
            <span className="text-center text-text-3">Read the code right</span>
            <span className="text-center text-text-3">Code surprised you</span>
            <span className="self-center pr-1 text-right text-text-3">Knew the answer</span>
            <MatrixCell count={p.by_state.aligned} title={PREDICTION_COPY.aligned.title} tone="bg-green/10" />
            <MatrixCell count={p.by_state.slip} title={PREDICTION_COPY.slip.title} tone="bg-medium/10" />
            <span className="self-center pr-1 text-right text-text-3">Didn&apos;t</span>
            <MatrixCell count={p.by_state.misconception} title={PREDICTION_COPY.misconception.title} tone="bg-red/10" />
            <MatrixCell
              count={p.by_state.lucky + p.by_state.lost}
              title={`${PREDICTION_COPY.lucky.title} (${p.by_state.lucky}) · lost (${p.by_state.lost})`}
              tone="bg-purple/10"
            />
          </div>
          <ul className="space-y-2 px-4 pt-4">
            {p.by_concept.map((c) => (
              <li key={c.concept}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text-1">{conceptLabel(c.concept)}</span>
                  <span className="flex items-center gap-2 text-xs text-text-3">
                    {c.flag && <span className="rounded-full bg-medium/15 px-2 py-0.5 font-medium text-medium">{FLAG_COPY[c.flag]}</span>}
                    {c.traced}/{c.total} read right
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fill-2" aria-hidden>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${c.traced ? Math.max(4, (c.traced / c.total) * 100) : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <TableView
            caption="Prediction accuracy by concept"
            head={["Concept", "Predictions", "Read right", "Lucky passes", "Flag"]}
            rows={p.by_concept.map((c) => [conceptLabel(c.concept), c.total, c.traced, c.lucky, c.flag ? FLAG_COPY[c.flag] : "–"])}
          />
        </>
      )}
    </Card>
  );
}

function MatrixCell({ count, title, tone }: { count: number; title: string; tone: string }) {
  return (
    <div className={cx("rounded-lc-sm px-3 py-2", tone)}>
      <p className="text-lg font-semibold text-text-1">{count}</p>
      <p className="text-[11px] leading-tight text-text-2">{title}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- debugging */

const STYLE_ORDER: JourneyStyle[] = ["methodical", "quick_fix", "exploratory", "trial_and_error", "too_short"];

function DebuggingCard({ g }: { g: Growth }) {
  const d = g.debugging;
  const rows = STYLE_ORDER.filter((s) => d.styles[s]).map((s) => ({ style: s, count: d.styles[s] ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));
  const reports = (d.self_report.agrees ?? 0) + (d.self_report.close ?? 0) + (d.self_report.differs ?? 0);
  return (
    <Card className="pb-4">
      <CardTitle icon={<History size={18} className="text-brand" aria-hidden />}>Debugging style</CardTitle>
      {d.journeys === 0 ? (
        <EmptyState title="Not enough data yet" text="Your style appears after an attempt with two or more submissions." />
      ) : (
        <>
          <p className="px-4 pt-1 text-xs text-text-3">
            From {d.journeys} attempt{d.journeys === 1 ? "" : "s"} with more than one submission.
          </p>
          <ul className="space-y-2 px-4 pt-3">
            {rows.map((r) => (
              <li key={r.style} className="grid grid-cols-[8rem_minmax(0,1fr)_1.5rem] items-center gap-2 text-sm">
                <span className="truncate text-text-1">{STYLE_COPY[r.style].title}</span>
                <span className="h-2 overflow-hidden rounded-full bg-fill-2" aria-hidden>
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${(r.count / max) * 100}%` }} />
                </span>
                <span className="text-right text-xs text-text-2">{r.count}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 px-4 pt-4">
            <Kpi
              icon={<TrendingUp size={14} className="text-green" aria-hidden />}
              label="Steps forward"
              value={d.productive_ratio === null ? "–" : `${Math.round(d.productive_ratio * 100)}%`}
              sub="of resubmissions moved tests forward"
            />
            <Kpi
              icon={<Gauge size={14} className="text-medium" aria-hidden />}
              label="Stuck score (EQ)"
              value={d.error_quotient === null ? "–" : d.error_quotient.toFixed(2)}
              sub="0 = every change mattered · 1 = stuck"
            />
          </div>
          {reports > 0 && (
            <p className="px-4 pt-3 text-xs text-text-2">
              Your own reflections matched the data in {d.self_report.agrees ?? 0} of {reports} attempt{reports === 1 ? "" : "s"}.
            </p>
          )}
          <TableView
            caption="Debugging style by attempt"
            head={["Mission", "Style", "Steps forward", "EQ"]}
            rows={d.series.map((r) => [r.title, STYLE_COPY[r.style].title, r.productive_ratio === null ? "–" : `${Math.round(r.productive_ratio * 100)}%`, r.error_quotient === null ? "–" : r.error_quotient.toFixed(2)])}
          />
        </>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- section */

/** The growth story: how the learner is changing, not just what they have solved. */
export function GrowthSection({ growth, own }: { growth: Growth; own: boolean }) {
  return (
    <section aria-labelledby="growth-title" className="space-y-4">
      <Card className="pb-4">
        <CardTitle id="growth-title" icon={<TrendingUp size={18} className="text-green" aria-hidden />}>
          How you&apos;re growing
        </CardTitle>
        <GrowthKpis g={growth} />
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <HintTrendCard g={growth} />
        <StruggleCard g={growth} own={own} />
      </div>
      <MistakeLanesCard g={growth} />
      <div className="grid gap-4 xl:grid-cols-2">
        <PredictionStatsCard g={growth} />
        <DebuggingCard g={growth} />
      </div>
    </section>
  );
}
