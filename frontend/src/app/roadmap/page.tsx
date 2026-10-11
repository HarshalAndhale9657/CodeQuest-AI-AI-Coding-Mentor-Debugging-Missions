"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Brain,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Keyboard,
  Lightbulb,
  Map as MapIcon,
  RefreshCw,
  Repeat,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Tag } from "@/components/ui/tag";
import { ApiError, api } from "@/lib/api";
import { DIFFICULTY_CLASS, formatMinutes } from "@/lib/format";
import type { Roadmap, RoadmapItem, RoadmapTopic, RoadmapWeek } from "@/lib/types";

const LIST_LABEL: Record<string, string> = { blind75: "Blind 75", neetcode150: "NeetCode 150" };

export default function RoadmapPage() {
  return (
    <AppShell>
      <RoadmapView />
    </AppShell>
  );
}

function RoadmapView() {
  const roadmap = useQuery({ queryKey: ["roadmap"], queryFn: api.roadmap, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 });

  if (roadmap.isError) {
    const err = roadmap.error;
    if (err instanceof ApiError && err.body.code === "profile_required") {
      return (
        <Card className="mx-auto max-w-xl">
          <EmptyState
            icon={<MapIcon size={28} aria-hidden />}
            title="Your roadmap starts with four questions"
            text="Tell CodeQuest your goal, your time and your level. It builds a week-by-week plan from that and from your real mistakes."
            action={
              <Link href="/onboarding" className={buttonClass("primary", "md", "mt-3")}>
                <Sparkles size={16} aria-hidden /> Build my roadmap
              </Link>
            }
          />
        </Card>
      );
    }
    return <ErrorState message={err instanceof ApiError ? err.message : "Could not load your roadmap."} onRetry={() => void roadmap.refetch()} />;
  }
  if (!roadmap.data) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lc" />
          <Skeleton className="h-72 rounded-lc" />
        </div>
        <Skeleton className="h-96 rounded-lc" />
      </div>
    );
  }
  return <Plan plan={roadmap.data} />;
}

function Plan({ plan }: { plan: Roadmap }) {
  const queryClient = useQueryClient();
  const replan = useMutation({
    mutationFn: () => api.replan(plan.ai.enabled),
    onSuccess: (next) => queryClient.setQueryData(["roadmap"], next),
  });
  const labels = useMemo(() => Object.fromEntries(plan.topics.map((t) => [t.id, t.label])), [plan.topics]);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Header plan={plan} onReplan={() => replan.mutate()} replanning={replan.isPending} />
        {replan.isError && (
          <p role="alert" className="rounded-lc bg-red/10 px-4 py-2 text-sm text-red">
            {replan.error instanceof ApiError ? replan.error.message : "Could not re-plan. Please try again."}
          </p>
        )}
        {plan.replan.suggested && !replan.isPending && <ReplanBanner reasons={plan.replan.reasons} onReplan={() => replan.mutate()} />}
        {plan.warnings.length > 0 && (
          <ul className="space-y-2">
            {plan.warnings.map((w) => (
              <li key={w} className="flex items-start gap-2 rounded-lc bg-medium/10 px-4 py-2.5 text-sm text-text-1">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-medium" aria-hidden /> {w}
              </li>
            ))}
          </ul>
        )}
        <section aria-label="Weekly plan" className="space-y-3">
          {plan.weeks.map((week) => (
            <WeekCard key={`${plan.version}-${week.week}`} week={week} current={week.week === plan.current_week} labels={labels} />
          ))}
        </section>
      </div>
      <aside className="space-y-4" aria-label="Plan details">
        <CoachCard plan={plan} />
        <SkillPath topics={plan.topics} />
      </aside>
    </div>
  );
}

function Header({ plan, onReplan, replanning }: { plan: Roadmap; onReplan: () => void; replanning: boolean }) {
  const { progress, profile } = plan;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative grid place-items-center">
          <ProgressRing value={progress.done} total={progress.total} size={64} stroke={5} tone="stroke-brand" label={`${progress.done} of ${progress.total} items done`} />
          <span className="absolute text-sm font-semibold tabular-nums text-text-1">{pct}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-brand">Your roadmap, version {plan.version}</p>
          <h1 className="mt-0.5 font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-text-1">{plan.goal_label}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Tag icon={<Clock size={12} aria-hidden />}>{profile.hours_per_week} h/week</Tag>
            <Tag icon={<Target size={12} aria-hidden />}>{profile.deadline_weeks ? `${profile.deadline_weeks}-week deadline` : "No deadline"}</Tag>
            <Tag>{plan.level_label}</Tag>
            <Tag>
              {plan.weeks.length} week{plan.weeks.length === 1 ? "" : "s"} · {progress.done}/{progress.total} done
            </Tag>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href="/onboarding" className={buttonClass("secondary", "sm", "flex-1 sm:flex-none")}>
            <Settings2 size={14} aria-hidden /> Edit goals
          </Link>
          <Button size="sm" variant="secondary" className="flex-1 sm:flex-none" onClick={onReplan} loading={replanning}>
            {!replanning && <RefreshCw size={14} aria-hidden />} Re-plan
          </Button>
        </div>
      </div>
      {progress.minutes_left > 0 && (
        <p className="mt-4 text-xs text-text-3">
          About {formatMinutes(progress.minutes_left)} of practice left. Missions tick themselves off when their hidden tests pass;
          tick LeetCode problems yourself (or let the Companion extension do it).
        </p>
      )}
    </Card>
  );
}

function ReplanBanner({ reasons, onReplan }: { reasons: string[]; onReplan: () => void }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lc bg-linear-to-br from-brand-bg-2 to-brand-bg px-4 py-3">
      <Brain size={18} className="shrink-0 text-brand" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-text-1">Your progress changed since this plan was made</p>
        <p className="text-text-2">{reasons.join(" ")}</p>
      </div>
      <Button size="sm" variant="primary" onClick={onReplan}>
        <RefreshCw size={14} aria-hidden /> Update my plan
      </Button>
    </div>
  );
}

function WeekCard({ week, current, labels }: { week: RoadmapWeek; current: boolean; labels: Record<string, string> }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(current);
  const complete = week.done === week.items.length;
  const pct = week.items.length ? (week.done / week.items.length) * 100 : 0;
  const panelId = `week-${week.week}-items`;
  return (
    <Card className={cx("overflow-hidden", current && "ring-1 ring-brand/50")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover"
      >
        <span
          className={cx(
            "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
            complete ? "bg-green text-bg" : current ? "bg-brand text-bg" : "bg-fill-3 text-text-1",
          )}
        >
          {complete ? <Check size={16} strokeWidth={3} aria-label="Week complete" /> : week.week}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 font-display text-[15px] font-semibold text-text-1">
            Week {week.week}
            {current && <span className="rounded-full bg-brand/15 px-2 text-[11px] font-medium text-brand">This week</span>}
          </span>
          <span className="block truncate text-xs text-text-2">{week.focus.length ? week.focus.map((t) => labels[t] ?? t.replaceAll("_", " ")).join(" · ") : "Mistake drills"}</span>
        </span>
        <span className="hidden text-right text-xs text-text-3 tabular-nums sm:block">
          {week.done}/{week.items.length} · {formatMinutes(week.minutes)}
        </span>
        <ChevronDown size={18} className={cx("shrink-0 text-text-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div className="h-0.5 bg-fill-2" aria-hidden>
        <div className="h-full bg-green transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {week.note && (
              <p className="mx-4 mt-3 flex items-start gap-2 rounded-lc-sm border-l-2 border-brand bg-brand/5 px-3 py-2 text-sm text-text-1">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {week.note}
              </p>
            )}
            <ul className="divide-y divide-line px-2 py-2">
              {week.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
            <p className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-text-3">
              <Repeat size={13} aria-hidden /> {week.review} ({formatMinutes(week.review_minutes)})
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function ItemRow({ item }: { item: RoadmapItem }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: (done: boolean) => api.markRoadmapItem(item.id, done),
    onMutate: async (done) => {
      await queryClient.cancelQueries({ queryKey: ["roadmap"] });
      const previous = queryClient.getQueryData<Roadmap>(["roadmap"]);
      if (previous) queryClient.setQueryData(["roadmap"], withItemDone(previous, item.id, done));
      return { previous };
    },
    onError: (_e, _done, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["roadmap"], ctx.previous);
    },
    onSuccess: (next) => queryClient.setQueryData(["roadmap"], next),
  });

  const external = item.kind === "leetcode";
  const Icon = item.kind === "warmup" ? Keyboard : item.kind === "mission" ? BadgeCheck : ExternalLink;
  const title = (
    <span className={cx("text-sm font-medium", item.done ? "text-text-3 line-through decoration-text-3/60" : "text-text-1 group-hover:text-brand")}>
      {item.title}
    </span>
  );

  return (
    <li className="flex items-start gap-3 px-2 py-2.5">
      {external ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={item.done}
          aria-label={`Mark ${item.title} as ${item.done ? "not done" : "done"}`}
          onClick={() => toggle.mutate(!item.done)}
          disabled={toggle.isPending}
          className={cx(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
            item.done ? "border-green bg-green text-bg" : "border-line-strong hover:border-text-2",
          )}
        >
          {item.done && <Check size={13} strokeWidth={3} aria-hidden />}
        </button>
      ) : (
        <span
          className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md", item.done ? "bg-green text-bg" : "bg-fill-2 text-text-3")}
          title={item.kind === "mission" ? "Ticks itself off when the hidden tests pass" : "Ticks itself off after a warm-up run"}
        >
          {item.done ? <Check size={13} strokeWidth={3} aria-label="Done" /> : <Icon size={12} aria-hidden />}
          {!item.done && <span className="sr-only">Not done yet</span>}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {external ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5">
              {title}
              <ExternalLink size={12} className="text-text-3" aria-hidden />
              <span className="sr-only">(opens LeetCode in a new tab)</span>
            </a>
          ) : (
            <Link href={item.url} className="group">
              {title}
            </Link>
          )}
          {item.trap && <span className="rounded-full bg-red/15 px-2 text-[11px] font-medium text-red">Mistake drill</span>}
          {item.mission_type === "debug" && <span className="rounded-full bg-medium/15 px-2 text-[11px] font-medium text-medium">Debug</span>}
          {item.kind === "mission" && !item.trap && <span className="rounded-full bg-blue/15 px-2 text-[11px] font-medium text-blue">CodeQuest</span>}
          {item.lists.filter((l) => LIST_LABEL[l]).map((l) => (
            <span key={l} className="rounded-full bg-fill-3 px-2 text-[11px] text-text-2">
              {LIST_LABEL[l]}
            </span>
          ))}
        </div>
        <p className="mt-0.5 text-xs text-text-3">{item.reason}</p>
        {toggle.isError && (
          <p role="alert" className="mt-1 text-xs text-red">
            {toggle.error instanceof ApiError ? toggle.error.message : "Could not save. Try again."}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right text-xs">
        <p className={DIFFICULTY_CLASS[item.difficulty]}>{item.difficulty}</p>
        <p className="mt-0.5 text-text-3 tabular-nums">{item.minutes} min</p>
      </div>
    </li>
  );
}

function withItemDone(plan: Roadmap, itemId: string, done: boolean): Roadmap {
  let delta = 0;
  const weeks = plan.weeks.map((w) => {
    const items = w.items.map((i) => {
      if (i.id !== itemId || i.done === done) return i;
      delta += done ? 1 : -1;
      return { ...i, done };
    });
    return { ...w, items, done: items.filter((i) => i.done).length };
  });
  return { ...plan, weeks, progress: { ...plan.progress, done: plan.progress.done + delta } };
}

function CoachCard({ plan }: { plan: Roadmap }) {
  const ai = plan.coach.source === "ai";
  return (
    <section aria-labelledby="coach-title" className="cq-lamp overflow-hidden rounded-lc">
      <div className="p-5">
        <h2 id="coach-title" className="flex items-center gap-2 font-display text-[16px] font-semibold text-brand">
          <Sparkles size={16} aria-hidden /> Coach notes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-1">{plan.coach.summary}</p>
        <ul className="mt-3 space-y-1.5">
          {plan.coach.tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-text-1">
              <Check size={14} className="mt-0.5 shrink-0 text-green" aria-hidden /> {tip}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-text-3">
          {ai
            ? "Worded by AI from your plan's facts only, then checked: no code, no links, no invented numbers. The plan itself is computed by CodeQuest."
            : plan.ai.available && !plan.ai.enabled
              ? "AI wording is off for you, so these notes are CodeQuest's own templates."
              : "Written by CodeQuest's planner. The plan works the same with or without AI."}
        </p>
      </div>
    </section>
  );
}

const STATUS_STYLE: Record<RoadmapTopic["status"], { dot: string; label: string }> = {
  planned: { dot: "bg-brand", label: "In your plan" },
  mastered: { dot: "bg-green", label: "Mastered" },
  skipped: { dot: "bg-blue", label: "Already strong" },
  trimmed: { dot: "bg-fill-4", label: "Left out for time" },
};

function SkillPath({ topics }: { topics: RoadmapTopic[] }) {
  return (
    <Card aria-labelledby="path-title" className="pb-4">
      <CardTitle id="path-title" icon={<MapIcon size={18} className="text-blue" aria-hidden />}>
        Skill path
      </CardTitle>
      <p className="px-5 pt-1 text-xs text-text-3">Every topic in prerequisite order, and why it is or isn&apos;t in your plan.</p>
      <ol className="mt-3 space-y-0.5 px-3">
        {topics.map((t, i) => (
          <li key={t.id} className="flex items-start gap-3 rounded-lc-sm px-2 py-1.5" title={t.reason}>
            <span className="flex flex-col items-center pt-1.5" aria-hidden>
              <span className={cx("size-2.5 rounded-full", STATUS_STYLE[t.status].dot)} />
              {i < topics.length - 1 && <span className="mt-1 h-4 w-px bg-line-strong" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx("block text-sm", t.status === "trimmed" ? "text-text-3" : "text-text-1")}>{t.label}</span>
              <span className="block text-[11px] text-text-3">
                {STATUS_STYLE[t.status].label}
                {t.status === "planned" && t.items ? ` · ${t.items} items` : ""}
                {t.source === "self-reported" && " · you said you're comfortable"}
                {t.source === "imported" && " · imported stats"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
