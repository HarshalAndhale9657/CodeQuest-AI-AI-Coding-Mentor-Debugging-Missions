"use client";

import { Bug, CheckCircle2, Lock, SearchX } from "lucide-react";
import Link from "next/link";
import { conceptLabel } from "@/lib/format";
import { usePrefetchMission } from "@/lib/prefetch";
import type { ChallengeSummary } from "@/lib/types";
import { cx } from "../ui/cx";
import { EmptyState, Skeleton } from "../ui/states";
import { DifficultyLabel } from "../ui/tag";

export interface MissionRow extends ChallengeSummary {
  number: number;
}

const GRID = "grid-cols-[24px_minmax(0,1fr)_auto] sm:grid-cols-[24px_minmax(0,1fr)_minmax(0,200px)_52px_52px]";

/** The mission list: status, number and title, concepts, hidden tests, difficulty. */
export function MissionTable({ rows, recommended }: { rows: MissionRow[]; recommended: Set<string> }) {
  const prefetch = usePrefetchMission();
  if (rows.length === 0) {
    return <EmptyState icon={<SearchX size={22} aria-hidden />} title="No missions match" text="Try another concept, another type, or clear the search." />;
  }
  return (
    <div>
      <div className={cx("hidden h-8 items-center gap-3 px-4 text-xs text-text-3 sm:grid", GRID)} aria-hidden>
        <span />
        <span>Mission</span>
        <span>Concepts</span>
        <span className="flex items-center gap-1" title="Hidden tests">
          <Lock size={11} /> Tests
        </span>
        <span className="text-right">Level</span>
      </div>
      <ol aria-label="Missions" className="space-y-0.5">
        {rows.map((m, i) => (
          <li key={m.id}>
            <Link
              href={`/m/${m.id}`}
              onMouseEnter={() => prefetch(m.id)}
              onFocus={() => prefetch(m.id)}
              className={cx("group grid h-12 items-center gap-3 rounded-lc-sm px-4 transition-colors hover:bg-hover", GRID, i % 2 === 0 && "bg-row-alt")}
            >
              <span className="flex justify-center">
                {m.solved ? (
                  <CheckCircle2 size={17} className="text-green" aria-label="Solved" />
                ) : m.type === "debug" ? (
                  <Bug size={16} className="text-medium" aria-label="Debugging mission" />
                ) : (
                  <span className="size-1.5 rounded-full bg-line-strong" aria-hidden />
                )}
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-text-3">{m.number}</span>
                <span className="truncate text-[14.5px] font-medium text-text-1 transition-colors group-hover:text-brand" title={m.title}>
                  {m.title}
                </span>
                {recommended.has(m.id) && (
                  <span className="shrink-0 rounded-full bg-brand/12 px-2 py-px text-[11px] font-semibold text-brand ring-1 ring-inset ring-brand/30">
                    Next up
                  </span>
                )}
              </span>
              <span className="hidden min-w-0 truncate text-[13px] text-text-3 sm:block">{m.concepts.map(conceptLabel).join(", ")}</span>
              <span className="hidden items-center gap-1 text-[13px] tabular-nums text-text-3 sm:flex" title={`${m.hidden_test_count} hidden tests`}>
                <Lock size={12} aria-hidden /> {m.hidden_test_count}
              </span>
              <span className="text-right">
                <DifficultyLabel tier={m.tier} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MissionTableSkeleton() {
  return (
    <div className="space-y-0.5" aria-busy="true" aria-label="Loading missions">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={cx("flex h-12 items-center gap-4 rounded-lc-sm px-4", i % 2 === 0 && "bg-row-alt")}>
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
