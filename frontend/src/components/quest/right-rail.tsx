"use client";

import { ArrowRight, Brain, Puzzle, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { conceptLabel, mistakeLabel } from "@/lib/format";
import { usePrefetchMission } from "@/lib/prefetch";
import type { Me, SkillBand } from "@/lib/types";
import { Card, CardTitle } from "../ui/card";
import { cx } from "../ui/cx";
import { DifficultyLabel } from "../ui/tag";
import { RoadmapCard, WarmupCard } from "./plan-cards";

const BAND_TONE: Record<SkillBand["band"], string> = {
  ready: "text-text-2",
  learning: "text-medium",
  almost: "text-brand",
  mastered: "text-green",
};

const BAND_BADGE: Record<SkillBand["band"], string> = {
  ready: "bg-fill-3 text-text-2",
  learning: "bg-medium/20 text-medium",
  almost: "bg-brand text-brand-ink",
  mastered: "bg-green text-bg-ws",
};

/** The page's one lit card: what CodeQuest recommends next, and why. */
function NextUp({ me }: { me: Me }) {
  const prefetch = usePrefetchMission();
  return (
    <section aria-labelledby="next-up" className="cq-lamp overflow-hidden rounded-lc">
      <div className="p-5">
        <h2 id="next-up" className="flex items-center gap-2 font-display text-[16px] font-semibold text-text-1">
          <Sparkles size={17} className="text-brand" aria-hidden /> Next up for {me.user.name}
        </h2>
        <p className="mt-1 text-[13px] text-text-2">Picked from your skills and the mistakes you repeat.</p>
        {me.next_up.length === 0 ? (
          <p className="mt-3 text-sm text-text-2">You have completed every mission. Impressive!</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {me.next_up.map((item, i) => (
              <li key={item.challenge_id}>
                <Link
                  href={`/m/${item.challenge_id}`}
                  onMouseEnter={() => prefetch(item.challenge_id)}
                  onFocus={() => prefetch(item.challenge_id)}
                  className="group flex gap-3 rounded-lc-sm bg-black/25 p-3 ring-1 ring-inset ring-white/[0.04] transition-colors hover:bg-black/35 hover:ring-brand/30"
                >
                  <span
                    className={cx(
                      "grid size-6 shrink-0 place-items-center rounded-full font-display text-xs font-bold",
                      i === 0 ? "bg-brand text-brand-ink" : "bg-brand/15 text-brand",
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
                    <span className="mt-0.5 block text-xs leading-relaxed text-text-2">{item.reason}</span>
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
    <Card id="memory" aria-labelledby="memory-title" className="scroll-mt-24 pb-5">
      <CardTitle
        id="memory-title"
        icon={<Brain size={18} className="text-brand" aria-hidden />}
        action={recurring.length > 0 ? <span className="text-xs text-text-3">{recurring.length} active</span> : undefined}
      >
        Mistake Memory
      </CardTitle>
      {recurring.length === 0 && beaten.length === 0 ? (
        <p className="px-5 pt-2 text-sm text-text-3">No recurring mistakes yet. CodeQuest is watching, kindly.</p>
      ) : (
        <ul className="mt-3 space-y-2 px-5">
          {recurring.map((k) => {
            const s = strength[k] ?? 0;
            return (
              <li key={k} className="rounded-lc-sm bg-red/[0.06] px-3 py-2.5 ring-1 ring-inset ring-red/15">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-1">{mistakeLabel(k)}</span>
                  <span className="text-xs font-medium text-red">Recurring</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-fill-3" aria-hidden>
                  <div className="h-full rounded-full bg-red" style={{ width: `${(s / max) * 100}%` }} />
                </div>
                <span className="sr-only">strength {s.toFixed(1)}</span>
              </li>
            );
          })}
          {beaten.map((k) => (
            <li key={k} className="flex items-center gap-2 rounded-lc-sm px-3 py-1.5 text-sm text-green">
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
    <Card aria-labelledby="skills-title" className="pb-5">
      <CardTitle id="skills-title">Skills by concept</CardTitle>
      <ul className="flex flex-wrap gap-2 px-5 pt-3">
        {skills.map((s) => (
          <li
            key={s.concept}
            title={`${conceptLabel(s.concept)}: ${s.band}, ${s.attempts} attempts, ${s.verified} verified`}
            className="inline-flex items-center gap-1.5 rounded-full bg-fill-2 py-1 pl-3 pr-1 text-xs ring-1 ring-inset ring-line"
          >
            <span className={cx("font-medium", BAND_TONE[s.band])}>{conceptLabel(s.concept)}</span>
            <span className={cx("rounded-full px-1.5 py-px text-[11px] font-semibold capitalize", BAND_BADGE[s.band])}>
              {s.verified > 0 ? s.verified : s.band}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-5 pt-3 text-xs text-text-3">A number is how many missions in that concept hidden tests have verified.</p>
    </Card>
  );
}

function CompanionCard() {
  return (
    <Link
      href="/settings#extension"
      className="group flex items-center gap-3 rounded-lc bg-layer-1 p-4 shadow-card ring-1 ring-line/70 transition-colors hover:bg-hover"
    >
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
      <RoadmapCard me={me} />
      <MistakeMemory me={me} />
      <Skills skills={me.skills} />
      <WarmupCard me={me} />
      <CompanionCard />
    </aside>
  );
}
