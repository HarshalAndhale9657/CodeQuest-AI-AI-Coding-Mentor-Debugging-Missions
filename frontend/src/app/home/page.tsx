"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain, Bug, CheckCircle2, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ConnectExtension } from "@/components/connect-extension";
import { ApiError, api } from "@/lib/api";
import { conceptLabel, mistakeLabel, TIER_NAME } from "@/lib/format";
import type { ChallengeSummary, SkillBand } from "@/lib/types";

const BAND_STYLE: Record<SkillBand["band"], string> = {
  ready: "border-line text-muted",
  learning: "border-wrong/40 text-wrong",
  almost: "border-accent/50 text-accent",
  mastered: "border-pass/50 text-pass",
};

export default function HomePage() {
  return (
    <AppShell>
      <Home />
    </AppShell>
  );
}

function Home() {
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const missions = useQuery({ queryKey: ["challenges"], queryFn: api.challenges });

  if (me.isPending || missions.isPending) return <p className="text-muted">Loading your quest…</p>;
  if (me.isError || missions.isError) {
    const err = me.error ?? missions.error;
    return (
      <p role="alert" className="text-error">
        {err instanceof ApiError ? err.message : "Could not load your quest."}
      </p>
    );
  }

  const tiers = new Map<number, ChallengeSummary[]>();
  for (const m of missions.data) tiers.set(m.tier, [...(tiers.get(m.tier) ?? []), m]);
  const { recurring, beaten, strength } = me.data.mistakes;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section aria-labelledby="next-up">
          <h2 id="next-up" className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Sparkles size={18} className="text-accent" aria-hidden /> Next up for {me.data.user.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {me.data.next_up.map((item) => (
              <Link
                key={item.challenge_id}
                href={`/m/${item.challenge_id}`}
                className="rounded-xl border border-line bg-panel p-4 transition hover:border-accent/60"
              >
                <p className="text-xs text-muted">
                  Tier {item.tier} {item.type === "debug" && "· Debugging"}
                </p>
                <p className="mt-1 font-medium">{item.title}</p>
                <p className="mt-2 text-xs text-muted">{item.reason}</p>
              </Link>
            ))}
            {me.data.next_up.length === 0 && (
              <p className="text-sm text-muted">You have completed every mission. Impressive!</p>
            )}
          </div>
        </section>

        <section aria-labelledby="quest-map">
          <h2 id="quest-map" className="mb-3 text-lg font-semibold">
            Quest map
          </h2>
          <ol className="space-y-3">
            {[...tiers.entries()].map(([tier, list]) => (
              <li key={tier} className="rounded-xl border border-line bg-panel p-4">
                <p className="text-xs text-muted">
                  Tier {tier} · {TIER_NAME[tier] ?? ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {list.map((m) => (
                    <Link
                      key={m.id}
                      href={`/m/${m.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition hover:bg-panel-2 ${
                        m.solved ? "border-pass/40" : "border-line"
                      }`}
                    >
                      {m.solved ? (
                        <CheckCircle2 size={14} className="text-pass" aria-label="Solved" />
                      ) : m.type === "debug" ? (
                        <Bug size={14} className="text-wrong" aria-label="Debugging mission" />
                      ) : null}
                      {m.title}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-6">
        <section aria-labelledby="memory" className="rounded-xl border border-line bg-panel p-4">
          <h2 id="memory" className="flex items-center gap-2 font-semibold">
            <Brain size={18} className="text-accent" aria-hidden /> Mistake Memory
          </h2>
          {recurring.length === 0 && beaten.length === 0 && (
            <p className="mt-2 text-sm text-muted">No recurring mistakes yet. CodeQuest is watching, kindly.</p>
          )}
          {recurring.length > 0 && (
            <ul className="mt-3 space-y-2">
              {recurring.map((k) => (
                <li key={k} className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm">
                  <span>{mistakeLabel(k)}</span>
                  <span className="text-xs text-wrong">recurring · strength {strength[k]?.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
          {beaten.length > 0 && (
            <ul className="mt-3 space-y-2">
              {beaten.map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm text-pass">
                  <Trophy size={14} aria-hidden /> Beaten: {mistakeLabel(k)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="skills" className="rounded-xl border border-line bg-panel p-4">
          <h2 id="skills" className="font-semibold">
            Skills by concept
          </h2>
          <ul className="mt-3 space-y-2">
            {me.data.skills.map((s) => (
              <li key={s.concept} className="flex items-center justify-between text-sm">
                <span>{conceptLabel(s.concept)}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${BAND_STYLE[s.band]}`}>
                  {s.band}
                  {s.verified > 0 ? ` · ${s.verified} verified` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <ConnectExtension />
      </aside>
    </div>
  );
}
