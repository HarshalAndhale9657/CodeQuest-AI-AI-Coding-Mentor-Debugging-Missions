"use client";

import { ArrowRight, Brain, Puzzle, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { conceptLabel, mistakeLabel } from "@/lib/format";
import { usePrefetchMission } from "@/lib/prefetch";
import type { Me, SkillBand } from "@/lib/types";
import { Card, CardTitle } from "../ui/card";
import { cx } from "../ui/cx";
import { DifficultyLabel } from "../ui/tag";

const BAND_TONE: Record<SkillBand["band"], string> = {
  ready: "text-text-2",
  learning: "text-medium",
  almost: "text-brand",
  mastered: "text-green",
};

const BAND_BADGE: Record<SkillBand["band"], string> = {
  ready: "bg-fill-2 text-text-2",
  learning: "bg-medium/20 text-medium",
  almost: "bg-brand text-bg",
  mastered: "bg-green text-bg",
};

/** The orange "Weekly Premium"-style card: what CodeQuest recommends next, and why. */
function NextUp({ me }: { me: Me }) {
  const prefetch = usePrefetchMission();
  return (
    <section aria-labelledby="next-up" className="overflow-hidden rounded-lc bg-layer-1">
      <div className="bg-linear-to-br from-brand-bg-2 to-brand-bg p-4">
        <h2 id="next-up" className="flex items-center gap-2 text-sm font-semibold text-brand">
          <Sparkles size={16} aria-hidden /> Next up for {me.user.name}
        </h2>
        {me.next_up.length === 0 ? (
          <p className="mt-3 text-sm text-text-2">You have completed every mission. Impressive!</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {me.next_up.map((item, i) => (
              <li key={item.challenge_id}>
                <Link
                  href={`/m/${item.challenge_id}`}
                  onMouseEnter={() => prefetch(item.challenge_id)}
                  onFocus={() => prefetch(item.challenge_id)}
                  className="group flex gap-3 rounded-lc-sm bg-black/20 p-2.5 transition-colors hover:bg-black/30"
                >
                  <span
                    className={cx(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      i === 0 ? "bg-brand text-bg" : "bg-brand/20 text-brand",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-text-1 group-hover:text-brand">{item.title}</span>
                      <span className="ml-auto shrink-0 text-xs">
                        <DifficultyLabel tier={item.tier} />
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-text-2">{item.reason}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function MistakeMemory({ me }: { me: Me }) {
  const { recurring, beaten, strength } = me.mistakes;
  const max = Math.max(1, ...recurring.map((k) => strength[k] ?? 0));
  return (
    <Card id="memory" aria-labelledby="memory-title" className="scroll-mt-20 pb-4">
      <CardTitle id="memory-title" icon={<Brain size={18} className="text-brand" aria-hidden />}>
        Mistake Memory
      </CardTitle>
      {recurring.length === 0 && beaten.length === 0 ? (
        <p className="px-4 pt-2 text-sm text-text-3">No recurring mistakes yet. CodeQuest is watching, kindly.</p>
      ) : (
        <ul className="mt-3 space-y-2 px-4">
          {recurring.map((k) => {
            const s = strength[k] ?? 0;
            return (
              <li key={k} className="rounded-lc-sm bg-fill-2 px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-1">{mistakeLabel(k)}</span>
                  <span className="text-xs text-red">recurring</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fill-3" aria-hidden>
                  <div className="h-full rounded-full bg-red" style={{ width: `${(s / max) * 100}%` }} />
                </div>
                <span className="sr-only">strength {s.toFixed(1)}</span>
              </li>
            );
          })}
          {beaten.map((k) => (
            <li key={k} className="flex items-center gap-2 px-1 text-sm text-green">
              <Trophy size={14} aria-hidden /> Beaten: {mistakeLabel(k)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Skills({ skills }: { skills: SkillBand[] }) {
  return (
    <Card aria-labelledby="skills-title" className="pb-4">
      <CardTitle id="skills-title">Skills by concept</CardTitle>
      <ul className="flex flex-wrap gap-2 px-4 pt-3">
        {skills.map((s) => (
          <li
            key={s.concept}
            title={`${conceptLabel(s.concept)}: ${s.band}, ${s.attempts} attempts, ${s.verified} verified`}
            className="inline-flex items-center gap-1.5 rounded-full bg-fill-4 py-1 pl-3 pr-1 text-xs"
          >
            <span className={cx("font-medium", BAND_TONE[s.band])}>{conceptLabel(s.concept)}</span>
            <span className={cx("rounded-full px-1.5 font-medium capitalize", BAND_BADGE[s.band])}>
              {s.verified > 0 ? s.verified : s.band}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-4 pt-3 text-[11px] text-text-3">Number = missions verified by hidden tests.</p>
    </Card>
  );
}

function CompanionCard() {
  return (
    <Link href="/settings#extension" className="group flex items-center gap-3 rounded-lc bg-layer-1 p-4 transition-colors hover:bg-hover">
      <span className="grid size-9 place-items-center rounded-lc bg-green/15">
        <Puzzle size={18} className="text-green" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text-1">LeetCode Companion</span>
        <span className="block text-xs text-text-3">Take your mentor to LeetCode</span>
      </span>
      <ArrowRight size={16} className="text-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function QuestRail({ me }: { me: Me }) {
  return (
    <aside className="space-y-4 lg:col-start-2 xl:col-start-auto" aria-label="Your progress">
      <NextUp me={me} />
      <MistakeMemory me={me} />
      <Skills skills={me.skills} />
      <CompanionCard />
    </aside>
  );
}
