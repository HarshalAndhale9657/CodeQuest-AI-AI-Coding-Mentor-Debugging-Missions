"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck, Swords } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { VerdictBadge } from "@/components/verdict-badge";
import { ApiError, api } from "@/lib/api";
import type { ArenaResult } from "@/lib/types";

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
    onSuccess: (r) => setResults((prev) => ({ ...prev, [r.index]: r })),
    onError: (err) => setError(err instanceof ApiError ? err.message : "The attack could not be run."),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Swords size={22} className="text-error" aria-hidden /> Sandbox Arena
        </h1>
        <p className="max-w-3xl text-muted">
          Learner code comes from strangers, so CodeQuest treats it as hostile. Launch a real attack: it runs through the
          same sandbox as every submission.
        </p>
        {health.data && (
          <p className={`text-sm ${health.data.sandboxed ? "text-pass" : "text-wrong"}`}>
            Runner: {health.data.runner}
            {!health.data.sandboxed && " (development mode: deploy with the Docker runner for the full OS sandbox)"}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </header>
      {attacks.isPending && <p className="text-muted">Loading attacks…</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {attacks.data?.map((a) => {
          const r = results[a.index];
          const pending = run.isPending && run.variables === a.index;
          return (
            <article key={a.id} className="flex flex-col rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{a.title}</h2>
                {r && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`ml-auto inline-flex items-center gap-1 text-sm ${r.contained ? "text-pass" : "text-error"}`}
                  >
                    {r.contained ? <ShieldCheck size={16} aria-hidden /> : <ShieldAlert size={16} aria-hidden />}
                    {r.contained ? "Blocked" : "NOT contained"}
                  </motion.span>
                )}
              </div>
              <pre className="mt-2 flex-1 overflow-x-auto rounded-lg bg-panel-2 p-2 text-xs text-muted">{a.code}</pre>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => run.mutate(a.index)}
                  disabled={run.isPending}
                  className="rounded-lg border border-error/50 px-3 py-1.5 text-sm text-error transition hover:bg-error/10 disabled:opacity-50"
                >
                  {pending ? "Attacking…" : "Launch attack"}
                </button>
                {r && <VerdictBadge verdict={r.verdict} />}
                {r?.detail && <span className="truncate text-xs text-muted">{r.detail}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
