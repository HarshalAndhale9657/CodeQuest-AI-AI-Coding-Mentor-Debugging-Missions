"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Brain, Bug, Check, CheckCircle2, Keyboard, Lightbulb, Link2, ListChecks, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { DifficultyLabel, Tag } from "@/components/ui/tag";
import { Avatar } from "@/components/user-menu";
import { ApiError, api, getToken } from "@/lib/api";
import { conceptLabel, mistakeLabel } from "@/lib/format";
import type { ImportPlatform, ImportRow, Portfolio, SkillBand } from "@/lib/types";

export default function PortfolioPage() {
  return (
    <AppShell requireAuth={false}>
      <PortfolioView />
    </AppShell>
  );
}

function PortfolioView() {
  const { handle } = useParams<{ handle: string }>();
  const portfolio = useQuery({ queryKey: ["portfolio", handle], queryFn: () => api.portfolio(handle) });
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, enabled: !!getToken() });
  const own = me.data?.user.handle === handle;

  if (portfolio.isError) {
    const notFound = portfolio.error instanceof ApiError && portfolio.error.status === 404;
    return (
      <ErrorState
        message={notFound ? "No portfolio with that handle." : portfolio.error instanceof ApiError ? portfolio.error.message : "Could not load this portfolio."}
        onRetry={notFound ? undefined : () => void portfolio.refetch()}
      />
    );
  }
  if (portfolio.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]" aria-busy="true">
        <Skeleton className="h-80 rounded-lc" />
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-lc" />
          <Skeleton className="h-64 rounded-lc" />
        </div>
      </div>
    );
  }
  const p = portfolio.data;
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <IdentityCard p={p} own={own} />
        <TypingCard typing={p.typing} />
      </div>
      <div className="min-w-0 space-y-4">
        <StatsCard p={p} />
        <ConceptsCard concepts={p.verified.all_concepts} />
        <div className="grid gap-4 xl:grid-cols-2">
          <ImportCard platform="leetcode" row={p.imports.leetcode} own={own} handle={p.handle} />
          <ImportCard platform="codeforces" row={p.imports.codeforces} own={own} handle={p.handle} />
        </div>
        <MistakesCard p={p} />
        <SolvedCard p={p} />
      </div>
    </div>
  );
}

function IdentityCard({ p, own }: { p: Portfolio; own: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <Avatar name={p.name} size={72} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-text-1">{p.name}</h1>
          <p className="truncate text-sm text-text-3">@{p.handle}</p>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-sm text-text-2">
        <BadgeCheck size={16} className="mt-0.5 shrink-0 text-blue" aria-hidden />
        Skills here are verified by CodeQuest&apos;s hidden tests, not self-reported.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" className="flex-1" onClick={copyLink}>
          {copied ? <Check size={14} className="text-green" aria-hidden /> : <Link2 size={14} aria-hidden />}
          {copied ? "Link copied" : "Share profile"}
        </Button>
        {own && (
          <Link href="/settings" className="inline-flex h-8 flex-1 items-center justify-center rounded-lc-sm bg-green/15 px-3 text-sm font-medium text-green hover:bg-green/25">
            Edit settings
          </Link>
        )}
      </div>
    </Card>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lc bg-panel px-3 py-3">
      {icon}
      <div>
        <p className="text-xs text-text-3">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-text-1">{value}</p>
      </div>
    </div>
  );
}

function StatsCard({ p }: { p: Portfolio }) {
  const s = p.verified.stats;
  return (
    <Card className="grid items-center gap-5 p-5 sm:grid-cols-[auto_1fr]">
      <div className="relative mx-auto grid size-[120px] place-items-center">
        <div className="absolute inset-0">
          <ProgressRing value={s.solved} total={s.missions_total} size={120} stroke={8} tone="stroke-brand" label={`${s.solved} of ${s.missions_total} missions solved`} />
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold tabular-nums text-text-1">
            {s.solved}
            <span className="text-sm font-normal text-text-3">/{s.missions_total}</span>
          </p>
          <p className="flex items-center justify-center gap-1 text-xs text-text-2">
            <CheckCircle2 size={12} className="text-green" aria-hidden /> Solved
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <StatTile icon={<Lightbulb size={20} className="text-medium" aria-hidden />} label="Hints per solve" value={s.hints_per_solve === null ? "–" : String(s.hints_per_solve)} />
        <StatTile icon={<Bug size={20} className="text-red" aria-hidden />} label="Debug missions" value={String(s.debug_missions)} />
        <StatTile icon={<ListChecks size={20} className="text-blue" aria-hidden />} label="Attempts" value={String(s.attempts)} />
      </div>
    </Card>
  );
}

const BAND_BAR: Record<SkillBand["band"], string> = {
  ready: "bg-fill-4",
  learning: "bg-medium",
  almost: "bg-brand",
  mastered: "bg-green",
};
const BAND_TEXT: Record<SkillBand["band"], string> = {
  ready: "text-text-3",
  learning: "text-medium",
  almost: "text-brand",
  mastered: "text-green",
};

function ConceptsCard({ concepts }: { concepts: SkillBand[] }) {
  return (
    <Card className="pb-5">
      <CardTitle>Concept mastery</CardTitle>
      {concepts.length === 0 ? (
        <EmptyState title="No concepts yet" text="Solve a mission to start building a verified skill map." />
      ) : (
        <ul className="grid gap-x-8 gap-y-3 px-5 pt-4 md:grid-cols-2">
          {concepts.map((c) => (
            <li key={c.concept}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-1">{conceptLabel(c.concept)}</span>
                <span className={cx("text-xs capitalize", BAND_TEXT[c.band])}>
                  {c.band}
                  {c.verified > 0 && <span className="text-text-3"> · {c.verified} verified</span>}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fill-2" role="img" aria-label={`${conceptLabel(c.concept)}: ${Math.round(c.p_median * 100)}% predicted success`}>
                <div className={cx("h-full rounded-full transition-[width] duration-700", BAND_BAR[c.band])} style={{ width: `${Math.max(4, Math.round(c.p_median * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="px-5 pt-3 text-[11px] text-text-3">Bar = predicted chance of solving a typical mission in that concept.</p>
    </Card>
  );
}

const PLATFORM: Record<ImportPlatform, { name: string; tone: string }> = {
  leetcode: { name: "LeetCode", tone: "text-brand" },
  codeforces: { name: "Codeforces", tone: "text-blue" },
};

const STATUS_TONE: Record<ImportRow["status"], string> = {
  ok: "bg-green/15 text-green",
  stale: "bg-medium/15 text-medium",
  error: "bg-red/15 text-red",
  queued: "bg-fill-3 text-text-2",
};

async function waitForImport(handle: string, platform: ImportPlatform, previous: number | null): Promise<Portfolio> {
  let latest = await api.portfolio(handle);
  for (let i = 0; i < 15; i += 1) {
    const fetched = latest.imports[platform]?.fetched ?? null;
    if (fetched !== null && fetched !== previous) return latest;
    await new Promise((r) => setTimeout(r, 2000));
    latest = await api.portfolio(handle);
  }
  return latest;
}

function ImportCard({ platform, row, own, handle }: { platform: ImportPlatform; row?: ImportRow; own: boolean; handle: string }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(row?.handle ?? "");
  const meta = PLATFORM[platform];
  const sync = useMutation({
    mutationFn: async (h: string) => {
      const res = await api.requestImport(platform, h);
      if (res.status === "cached") return api.portfolio(handle);
      return waitForImport(handle, platform, row?.fetched ?? null);
    },
    onSuccess: (data) => queryClient.setQueryData(["portfolio", handle], data),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) sync.mutate(value.trim());
  };
  const solved = row?.solved;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <h2 className={cx("text-[15px] font-semibold", meta.tone)}>{meta.name}</h2>
        {row && <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE[row.status])}>{row.status}</span>}
        {row && <span className="ml-auto truncate text-xs text-text-3">@{row.handle}</span>}
      </div>

      {!row ? (
        <p className="mt-3 text-sm text-text-3">{own ? `Link your ${meta.name} account to merge its stats here.` : "Not linked."}</p>
      ) : (
        <div className="mt-4 flex-1 space-y-3">
          {typeof solved === "object" && solved && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Total", solved.total, "text-text-1"],
                ["Easy", solved.easy, "text-easy"],
                ["Med.", solved.medium, "text-medium"],
                ["Hard", solved.hard, "text-hard"],
              ].map(([label, count, tone]) => (
                <div key={label as string} className="rounded-lc bg-panel py-2">
                  <p className={cx("text-lg font-semibold tabular-nums", tone as string)}>{count}</p>
                  <p className="text-[11px] text-text-3">{label}</p>
                </div>
              ))}
            </div>
          )}
          {platform === "codeforces" && (row.rating != null || typeof solved === "number") && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lc bg-panel py-2">
                <p className="text-lg font-semibold tabular-nums text-text-1">{row.rating ?? "–"}</p>
                <p className="text-[11px] text-text-3">Rating</p>
              </div>
              <div className="rounded-lc bg-panel py-2">
                <p className="text-lg font-semibold tabular-nums text-text-1">{row.max_rating ?? "–"}</p>
                <p className="text-[11px] text-text-3">Max</p>
              </div>
              <div className="rounded-lc bg-panel py-2">
                <p className="text-lg font-semibold tabular-nums text-text-1">{typeof solved === "number" ? solved : "–"}</p>
                <p className="text-[11px] text-text-3">Solved</p>
              </div>
            </div>
          )}
          {row.rank && <p className="text-sm capitalize text-text-2">Rank: {row.rank}</p>}
          {row.top_tags && row.top_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {row.top_tags.map(([tag, count]) => (
                <Tag key={tag} className="bg-fill-4">
                  {tag} <span className="text-text-3">{count}</span>
                </Tag>
              ))}
            </div>
          )}
          {row.error && <p className="text-xs text-red">{row.status === "stale" ? `Showing the last good snapshot. ${row.error}` : row.error}</p>}
        </div>
      )}

      {own && (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{meta.name} handle</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`${meta.name} handle`}
              maxLength={40}
              pattern="[A-Za-z0-9_.\-]{1,40}"
              spellCheck={false}
              className="h-8 w-full rounded-lc-sm bg-hover px-3 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-line-strong"
            />
          </label>
          <Button type="submit" size="sm" variant="secondary" loading={sync.isPending} disabled={!value.trim()}>
            {sync.isPending ? "Syncing…" : row ? "Refresh" : "Link"}
          </Button>
        </form>
      )}
      {sync.isError && (
        <p role="alert" className="mt-2 text-xs text-red">
          {sync.error instanceof ApiError ? sync.error.message : "Could not start the import."}
        </p>
      )}
    </Card>
  );
}

function MistakesCard({ p }: { p: Portfolio }) {
  const rows = p.verified.mistakes;
  return (
    <Card className="pb-4">
      <CardTitle icon={<Brain size={18} className="text-brand" aria-hidden />}>Mistake timeline</CardTitle>
      {rows.length === 0 ? (
        <EmptyState title="A clean slate" text="No mistakes recorded yet." />
      ) : (
        <ol className="mt-3 px-2">
          {rows.map((r, i) => (
            <li key={r.key} className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lc px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_120px_90px]", i % 2 === 0 && "bg-row-alt")}>
              <span className="truncate text-sm text-text-1">{mistakeLabel(r.key)}</span>
              <span className="hidden text-xs tabular-nums text-text-3 sm:block">
                {r.first_seen ? `attempt ${r.first_seen}${r.last_seen && r.last_seen !== r.first_seen ? `–${r.last_seen}` : ""}` : "–"} · {r.times}×
              </span>
              <span className="text-right">
                {r.beaten ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                    <Trophy size={12} aria-hidden /> Beaten
                  </span>
                ) : r.recurring ? (
                  <span className="text-xs font-medium text-red">Recurring</span>
                ) : (
                  <span className="text-xs text-text-3">Seen</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function SolvedCard({ p }: { p: Portfolio }) {
  const solved = p.verified.solved;
  return (
    <Card className="pb-4">
      <CardTitle icon={<CheckCircle2 size={18} className="text-green" aria-hidden />}>Solved missions</CardTitle>
      {solved.length === 0 ? (
        <EmptyState title="Nothing solved yet" text="Solved missions appear here, verified by hidden tests." />
      ) : (
        <ol className="mt-3 px-2">
          {solved.map((m, i) => (
            <li key={m.id} className={cx("flex items-center gap-3 rounded-lc px-3 py-2.5", i % 2 === 0 && "bg-row-alt")}>
              <span className="min-w-0 flex-1 truncate text-sm text-text-1">{m.title}</span>
              <DifficultyLabel tier={m.tier} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function TypingCard({ typing }: { typing: Portfolio["typing"] }) {
  return (
    <Card className="pb-5">
      <CardTitle icon={<Keyboard size={18} className="text-cyan" aria-hidden />}>Code typing</CardTitle>
      {typing ? (
        <div className="grid grid-cols-3 gap-2 px-4 pt-4 text-center">
          <div className="rounded-lc bg-panel py-2">
            <p className="text-lg font-semibold tabular-nums text-text-1">{Math.round(typing.best_cpm)}</p>
            <p className="text-[11px] text-text-3">Best CPM</p>
          </div>
          <div className="rounded-lc bg-panel py-2">
            <p className="text-lg font-semibold tabular-nums text-text-1">{Math.round(typing.accuracy * 100)}%</p>
            <p className="text-[11px] text-text-3">Accuracy</p>
          </div>
          <div className="rounded-lc bg-panel py-2">
            <p className="text-lg font-semibold tabular-nums text-text-1">{typing.runs}</p>
            <p className="text-[11px] text-text-3">Runs</p>
          </div>
        </div>
      ) : (
        <p className="px-4 pt-2 text-sm text-text-3">No typing runs yet.</p>
      )}
    </Card>
  );
}
