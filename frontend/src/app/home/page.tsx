"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConceptPills } from "@/components/quest/concept-pills";
import { MissionTable, MissionTableSkeleton, type MissionRow } from "@/components/quest/mission-table";
import { QuestHeader } from "@/components/quest/quest-header";
import { QuestRail } from "@/components/quest/right-rail";
import { QuestSidebar } from "@/components/quest/sidebar";
import { cx } from "@/components/ui/cx";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";

type TypeFilter = "all" | "build" | "debug";

export default function HomePage() {
  return (
    <AppShell wide>
      <Home />
    </AppShell>
  );
}

function Home() {
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const missions = useQuery({ queryKey: ["challenges"], queryFn: api.challenges });
  const [concept, setConcept] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  const rows: MissionRow[] = useMemo(
    () => (missions.data ?? []).map((m, i) => ({ ...m, number: i + 1 })),
    [missions.data],
  );
  const concepts = useMemo(() => [...new Set(rows.flatMap((m) => m.concepts))].sort(), [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (m) =>
        (concept === null || m.concepts.includes(concept)) &&
        (type === "all" || m.type === type) &&
        (!q || m.title.toLowerCase().includes(q) || String(m.number) === q),
    );
  }, [rows, concept, type, query]);
  const recommended = useMemo(() => new Set(me.data?.next_up.map((n) => n.challenge_id)), [me.data]);

  const error = me.error ?? missions.error;
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : "Could not load your quest."}
        onRetry={() => {
          void me.refetch();
          void missions.refetch();
        }}
      />
    );
  }

  const pickRandom = () => {
    const unsolved = visible.filter((m) => !m.solved);
    const pool = unsolved.length ? unsolved : visible;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(`/m/${pick.id}`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[208px_minmax(0,1fr)] xl:grid-cols-[208px_minmax(0,1fr)_336px] xl:gap-8">
      <QuestSidebar
        handle={me.data?.user.handle}
        recurring={me.data?.mistakes.recurring.length ?? 0}
        debugCount={rows.filter((m) => m.type === "debug").length}
        debugActive={type === "debug"}
        onDebug={() => setType((t) => (t === "debug" ? "all" : "debug"))}
      />

      <section aria-label="Quest map" className="min-w-0 space-y-5">
        {me.data && missions.data ? (
          <QuestHeader me={me.data} missions={missions.data} />
        ) : (
          <div className="space-y-3 pb-1" aria-hidden>
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-96 max-w-full" />
            <Skeleton className="h-8 w-80 max-w-full" />
          </div>
        )}
        <div className="h-px bg-line/70" />
        {missions.isPending ? <Skeleton className="h-9 w-full rounded-full" /> : <ConceptPills concepts={concepts} value={concept} onChange={setConcept} />}
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex h-9 w-full items-center sm:w-64">
            <span className="sr-only">Search missions</span>
            <Search size={16} className="pointer-events-none absolute left-3 text-text-3" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or number"
              className="h-full w-full rounded-full bg-fill-2/80 pl-9 pr-3 text-sm text-text-1 ring-1 ring-inset ring-line transition-shadow placeholder:text-text-3 focus:outline-none focus-visible:ring-brand/50"
            />
          </label>
          <div role="radiogroup" aria-label="Mission type" className="flex h-9 items-center rounded-full bg-fill-2/80 p-1 ring-1 ring-inset ring-line">
            {(["all", "build", "debug"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cx(
                  "h-7 rounded-full px-3.5 text-[13px] capitalize transition-colors",
                  type === t ? "bg-fill-4 font-semibold text-text-1 shadow-sm" : "text-text-2 hover:text-text-1",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[13px] text-text-3">
            <span className="tabular-nums" aria-live="polite">
              {visible.length} {visible.length === 1 ? "mission" : "missions"}
            </span>
            <button
              type="button"
              onClick={pickRandom}
              disabled={visible.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-text-2 transition-colors hover:bg-white/[0.05] hover:text-text-1 disabled:opacity-40"
              title="Open a random unsolved mission from this list"
            >
              <Shuffle size={15} aria-hidden /> Surprise me
            </button>
          </div>
        </div>
        {missions.isPending ? <MissionTableSkeleton /> : <MissionTable rows={visible} recommended={recommended} />}
      </section>

      {me.data ? (
        <QuestRail me={me.data} />
      ) : (
        <div className="space-y-4 lg:col-start-2 xl:col-start-auto">
          <Skeleton className="h-48 w-full rounded-lc" />
          <Skeleton className="h-32 w-full rounded-lc" />
        </div>
      )}
    </div>
  );
}
