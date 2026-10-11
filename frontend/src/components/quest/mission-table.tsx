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

/** LeetCode problem-list rows: alternating #272727 stripes, status icon, title, difficulty. */
export function MissionTable({ rows, recommended }: { rows: MissionRow[]; recommended: Set<string> }) {
  const prefetch = usePrefetchMission();
  if (rows.length === 0) {
    return <EmptyState icon={<SearchX size={28} aria-hidden />} title="No missions match" text="Try another concept or clear the search." />;
  }
  return (
    <ol aria-label="Missions">
      {rows.map((m, i) => (
        <li key={m.id}>
          <Link
            href={`/m/${m.id}`}
            onMouseEnter={() => prefetch(m.id)}
            onFocus={() => prefetch(m.id)}
            className={cx(
              "group grid h-11 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-lc px-4 transition-colors hover:bg-hover sm:grid-cols-[28px_minmax(0,1fr)_minmax(0,220px)_64px_56px]",
              i % 2 === 0 && "bg-row-alt",
            )}
          >
            <span className="flex justify-center">
              {m.solved ? (
                <CheckCircle2 size={16} className="text-green" aria-label="Solved" />
              ) : m.type === "debug" ? (
                <Bug size={16} className="text-medium" aria-label="Debugging mission" />
              ) : null}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-text-1 group-hover:text-blue" title={m.title}>
                {m.number}. {m.title}
              </span>
              {recommended.has(m.id) && (
                <span className="shrink-0 rounded-full bg-brand-bg-2 px-2 py-px text-[11px] font-medium text-brand">Next up</span>
              )}
            </span>
            <span className="hidden min-w-0 truncate text-xs text-text-3 sm:block">{m.concepts.map(conceptLabel).join(" · ")}</span>
            <span className="hidden items-center gap-1 text-xs text-text-3 sm:flex" title={`${m.hidden_test_count} hidden tests`}>
              <Lock size={12} aria-hidden /> {m.hidden_test_count}
            </span>
            <span className="text-right">
              <DifficultyLabel tier={m.tier} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function MissionTableSkeleton() {
  return (
    <div className="space-y-1" aria-busy="true" aria-label="Loading missions">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={cx("flex h-11 items-center gap-4 rounded-lc px-4", i % 2 === 0 && "bg-row-alt")}>
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
