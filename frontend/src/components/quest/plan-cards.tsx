"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Keyboard, Map as MapIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { mistakeLabel } from "@/lib/format";
import type { Me } from "@/lib/types";
import { Skeleton } from "../ui/states";

/** This week's slice of the roadmap, or an invitation to build one. */
export function RoadmapCard({ me }: { me: Me }) {
  const roadmap = useQuery({ queryKey: ["roadmap"], queryFn: api.roadmap, enabled: me.onboarded, retry: false });

  if (!me.onboarded) {
    return (
      <Link
        href="/onboarding"
        className="group block rounded-lc bg-linear-to-br from-blue/20 to-layer-1 p-4 ring-1 ring-blue/30 transition-colors hover:ring-blue/60"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-blue">
          <Sparkles size={16} aria-hidden /> Get your personal roadmap
        </span>
        <span className="mt-1 block text-sm text-text-2">
          Four quick questions about your goal and time, then a week-by-week plan built around your mistakes.
        </span>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-text-1">
          Start <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    );
  }

  if (roadmap.isPending) return <Skeleton className="h-28 w-full rounded-lc" />;
  const plan = roadmap.data;
  const week = plan?.weeks.find((w) => w.week === plan.current_week);
  const nextItem = week?.items.find((i) => !i.done);
  return (
    <Link href="/roadmap" className="group block rounded-lc bg-layer-1 p-4 transition-colors hover:bg-hover">
      <span className="flex items-center gap-2 text-sm font-semibold text-text-1">
        <MapIcon size={16} className="text-blue" aria-hidden /> My roadmap
        {plan && (
          <span className="ml-auto text-xs font-normal text-text-3 tabular-nums">
            {plan.progress.done}/{plan.progress.total} done
          </span>
        )}
      </span>
      {plan && week ? (
        <>
          <span className="mt-1 block text-xs text-text-2">
            Week {week.week} of {plan.weeks.length} · {week.done}/{week.items.length} this week
          </span>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-fill-3" aria-hidden>
            <span className="block h-full rounded-full bg-blue" style={{ width: `${(week.done / Math.max(1, week.items.length)) * 100}%` }} />
          </span>
          {nextItem && (
            <span className="mt-2 block truncate text-sm text-text-1">
              Next: <span className="group-hover:text-brand">{nextItem.title}</span>
            </span>
          )}
        </>
      ) : (
        <span className="mt-1 block text-xs text-text-2">
          {plan ? "Every item is done. Time to re-plan for the next level." : "Open your week-by-week plan."}
        </span>
      )}
      {plan?.replan.suggested && <span className="mt-2 block text-xs text-brand">Your progress changed: update the plan.</span>}
    </Link>
  );
}

/** Syntax Warm-up entry point; it says why when recurring syntax slips make it worth doing today. */
export function WarmupCard({ me }: { me: Me }) {
  const slips = me.mistakes.recurring.filter((k) => k.startsWith("syntax:"));
  return (
    <Link href="/typing" className="group flex items-center gap-3 rounded-lc bg-layer-1 p-4 transition-colors hover:bg-hover">
      <span className="grid size-9 shrink-0 place-items-center rounded-lc bg-cyan/15">
        <Keyboard size={18} className="text-cyan" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text-1">Syntax Warm-up</span>
        <span className="block truncate text-xs text-text-3">
          {slips.length ? `Recommended: ${slips.map(mistakeLabel).join(", ")} keeps repeating` : "Code typing drills, accuracy first"}
        </span>
      </span>
      <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
