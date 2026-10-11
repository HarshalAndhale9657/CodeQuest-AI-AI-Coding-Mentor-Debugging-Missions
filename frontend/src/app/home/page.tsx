"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConceptPills } from "@/components/quest/concept-pills";
import { MissionTable, MissionTableSkeleton, type MissionRow } from "@/components/quest/mission-table";
import { QuestRail } from "@/components/quest/right-rail";
import { QuestSidebar } from "@/components/quest/sidebar";
import { cx } from "@/components/ui/cx";
import { ProgressRing } from "@/components/ui/progress-ring";
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

  const solved = rows.filter((m) => m.solved).length;
  const pickRandom = () => {
    const unsolved = visible.filter((m) => !m.solved);
    const pool = unsolved.length ? unsolved : visible;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(`/m/${pick.id}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
      <QuestSidebar
        handle={me.data?.user.handle}
        recurring={me.data?.mistakes.recurring.length ?? 0}
        debugCount={rows.filter((m) => m.type === "debug").length}
        debugActive={type === "debug"}
        onDebug={() => setType((t) => (t === "debug" ? "all" : "debug"))}
      />

      <section aria-label="Quest map" className="min-w-0 space-y-4">
        {missions.isPending ? <Skeleton className="h-9 w-full rounded-full" /> : <ConceptPills concepts={concepts} value={concept} onChange={setConcept} />}
        <div className="h-px bg-line" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex h-9 w-full items-center sm:w-64">
            <span className="sr-only">Search missions</span>
            <Search size={16} className="pointer-events-none absolute left-3 text-text-2" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search missions"
              className="h-full w-full rounded-lc bg-hover pl-9 pr-3 text-sm text-text-1 placeholder:text-text-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-line-strong"
            />
          </label>
          <div role="radiogroup" aria-label="Mission type" className="flex h-9 items-center rounded-full bg-fill-2 p-1">
            {(["all", "build", "debug"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cx(
                  "h-7 rounded-full px-3 text-xs capitalize transition-colors",
                  type === t ? "bg-fill-4 font-medium text-text-1" : "text-text-2 hover:text-text-1",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm text-text-2">
            <span className="inline-flex items-center gap-2">
              <ProgressRing value={solved} total={rows.length} label={`${solved} of ${rows.length} missions solved`} />
              <span className="tabular-nums">
                {solved}/{rows.length} Solved
              </span>
            </span>
            <button
              type="button"
              onClick={pickRandom}
              disabled={visible.length === 0}
              className="grid size-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-fill-2 hover:text-text-1 disabled:opacity-40"
              aria-label="Pick a random unsolved mission"
              title="Pick one for me"
            >
              <Shuffle size={16} aria-hidden />
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
