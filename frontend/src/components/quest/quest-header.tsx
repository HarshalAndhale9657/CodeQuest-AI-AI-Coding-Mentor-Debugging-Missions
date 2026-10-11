"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { difficultyForTier, type Difficulty } from "@/lib/format";
import { usePrefetchMission } from "@/lib/prefetch";
import type { ChallengeSummary, Me } from "@/lib/types";
import { buttonClass } from "../ui/button";
import { cx } from "../ui/cx";

const BAR: Record<Difficulty, { bar: string; text: string }> = {
  Easy: { bar: "bg-easy", text: "text-easy" },
  Medium: { bar: "bg-medium", text: "text-medium" },
  Hard: { bar: "bg-hard", text: "text-hard" },
};

/** Greeting, the one next step, and solved progress split by difficulty. */
export function QuestHeader({ me, missions }: { me: Me; missions: ChallengeSummary[] }) {
  const prefetch = usePrefetchMission();
  const first = me.user.name.split(/\s+/)[0] || me.user.name;
  const solved = missions.filter((m) => m.solved).length;
  const recurring = me.mistakes.recurring.length;
  const next = me.next_up[0];
  const byDifficulty = (["Easy", "Medium", "Hard"] as const).map((d) => {
    const all = missions.filter((m) => difficultyForTier(m.tier) === d);
    return { d, total: all.length, done: all.filter((m) => m.solved).length };
  });

  return (
    <section aria-labelledby="quest-title" className="flex flex-wrap items-end gap-x-8 gap-y-5">
      <div className="min-w-0 flex-1">
        <h1 id="quest-title" className="font-display text-[28px] font-bold leading-tight tracking-[-0.025em] text-text-1 sm:text-[32px]">
          {solved ? `Welcome back, ${first}` : `Your quest starts here, ${first}`}
        </h1>
        <p className="mt-1.5 text-[15px] text-text-2">
          {solved} of {missions.length} missions solved.{" "}
          {recurring > 0
            ? `${recurring} recurring ${recurring === 1 ? "bug is" : "bugs are"} shaping your next missions.`
            : "No recurring bugs so far."}
        </p>
        <dl className="mt-4 grid max-w-md grid-cols-3 gap-4">
          {byDifficulty.map(({ d, total, done }) => (
            <div key={d}>
              <dt className="flex items-baseline justify-between text-xs">
                <span className={cx("font-semibold", BAR[d].text)}>{d}</span>
                <span className="tabular-nums text-text-3">
                  <span className="text-text-1">{done}</span>/{total}
                </span>
              </dt>
              <dd className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fill-2" aria-label={`${done} of ${total} ${d} missions solved`}>
                <span className={cx("block h-full rounded-full", BAR[d].bar)} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {next && (
        <Link
          href={`/m/${next.challenge_id}`}
          onMouseEnter={() => prefetch(next.challenge_id)}
          onFocus={() => prefetch(next.challenge_id)}
          className={buttonClass("primary", "lg", "group w-full min-w-0 sm:w-auto sm:max-w-full")}
        >
          <span className="min-w-0 truncate">Continue with {next.title}</span>
          <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </section>
  );
}
