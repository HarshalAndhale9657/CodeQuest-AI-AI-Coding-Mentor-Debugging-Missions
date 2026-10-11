"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Cpu, ShieldAlert, ShieldCheck, Swords } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { VerdictBadge } from "@/components/verdict-badge";
import { ApiError, api } from "@/lib/api";
import type { ArenaAttack, ArenaResult } from "@/lib/types";

export default function ArenaPage() {
  return (
    <AppShell>
      <Arena />
    </AppShell>
  );
}

function Arena() {
  const attacks = useQuery({ queryKey: ["attacks"], queryFn: api.attacks, staleTime: Infinity });
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });
  const [results, setResults] = useState<Record<number, ArenaResult>>({});
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({
    mutationFn: (index: number) => api.runAttack(index),
    onMutate: () => setError(null),
    onSuccess: (r) => setResults((prev) => ({ ...prev, [r.index]: r })),
    onError: (err) => setError(err instanceof ApiError ? err.message : "The attack could not be run."),
  });
  const done = Object.values(results);
  const blocked = done.filter((r) => r.contained).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-text-1">
          <Swords size={24} className="text-red" aria-hidden /> Sandbox Arena
        </h1>
        <p className="max-w-3xl text-[15px] text-text-2">
          Learner code comes from strangers, so CodeQuest treats it as hostile. Launch a real attack: it runs through the
          same sandbox as every submission.
        </p>
      </header>

      <Card className="grid gap-4 p-4 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lc bg-blue/15">
            <Cpu size={20} className="text-blue" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-text-3">Runner</p>
            {health.data ? <p className="font-medium text-text-1">{health.data.runner}</p> : <Skeleton className="mt-1 h-4 w-20" />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cx("grid size-10 place-items-center rounded-lc", health.data?.sandboxed ? "bg-green/15" : "bg-medium/15")}>
            <ShieldCheck size={20} className={health.data?.sandboxed ? "text-green" : "text-medium"} aria-hidden />
          </span>
          <div>
            <p className="text-xs text-text-3">Isolation</p>
            {health.data ? (
              <p className={cx("font-medium", health.data.sandboxed ? "text-green" : "text-medium")}>
                {health.data.sandboxed ? "OS sandbox" : "Development mode"}
              </p>
            ) : (
              <Skeleton className="mt-1 h-4 w-24" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lc bg-brand/15">
            <Swords size={20} className="text-brand" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-text-3">Attacks blocked</p>
            <p className="font-medium tabular-nums text-text-1">
              {blocked} / {done.length || 0}
            </p>
          </div>
        </div>
        {health.data && !health.data.sandboxed && (
          <p className="text-xs text-medium sm:col-span-3">Deploy with the Docker runner for the full OS sandbox.</p>
        )}
      </Card>

      {error && (
        <p role="alert" className="rounded-lc bg-red/10 px-3 py-2 text-sm text-text-1">
          {error}
        </p>
      )}

      {attacks.isError ? (
        <ErrorState message="Could not load the attack list." onRetry={() => void attacks.refetch()} />
      ) : attacks.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lc" />
          ))}
        </div>
      ) : (
        <ol className="space-y-2">
          {attacks.data.map((a, i) => (
            <AttackRow
              key={a.id}
              attack={a}
              striped={i % 2 === 0}
              result={results[a.index]}
              pending={run.isPending && run.variables === a.index}
              disabled={run.isPending}
              onRun={() => run.mutate(a.index)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function AttackRow({
  attack,
  striped,
  result,
  pending,
  disabled,
  onRun,
}: {
  attack: ArenaAttack;
  striped: boolean;
  result?: ArenaResult;
  pending: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cx("rounded-lc", striped ? "bg-row-alt" : "bg-layer-1/40")}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown size={16} className={cx("shrink-0 text-text-3 transition-transform", open && "rotate-180")} aria-hidden />
          <span className="truncate font-medium text-text-1">{attack.title}</span>
        </button>
        {result && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cx(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              result.contained ? "bg-green/15 text-green" : "bg-red/15 text-red",
            )}
          >
            {result.contained ? <ShieldCheck size={14} aria-hidden /> : <ShieldAlert size={14} aria-hidden />}
            {result.contained ? "Contained" : "Escaped"}
          </motion.span>
        )}
        {result && <VerdictBadge verdict={result.verdict} />}
        <Button size="sm" variant="danger" onClick={onRun} disabled={disabled} loading={pending}>
          {pending ? "Attacking…" : result ? "Run again" : "Launch attack"}
        </Button>
      </div>
      {(open || result?.detail) && (
        <div className="space-y-2 px-4 pb-3">
          {result?.detail && <p className="text-sm text-text-2">{result.detail}</p>}
          {open && <pre className="overflow-x-auto rounded-lc bg-panel p-3 font-mono text-xs leading-5 text-text-2">{attack.code}</pre>}
        </div>
      )}
    </li>
  );
}
