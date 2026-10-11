"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConnectExtension } from "@/components/connect-extension";
import { DataCard, ProfileCard } from "@/components/profile/profile-settings";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { ApiError, api } from "@/lib/api";
import type { AiStatus } from "@/lib/types";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="font-display text-[30px] font-bold tracking-[-0.025em] text-text-1">Settings</h1>
          <p className="mt-1 text-sm text-text-2">Your profile and goals, the AI mentor, the LeetCode Companion and your data.</p>
        </header>
        <ProfileCard />
        <AiCard />
        <ConnectExtension />
        <DataCard />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lc bg-panel px-3 py-2.5">
      <p className="text-xs text-text-3">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums text-text-1">{value}</p>
    </div>
  );
}

function AiCard() {
  const queryClient = useQueryClient();
  const ai = useQuery({ queryKey: ["ai"], queryFn: api.aiStatus });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.setAi(enabled),
    onSuccess: (status: AiStatus) => queryClient.setQueryData(["ai"], status),
  });

  return (
    <Card id="ai" aria-labelledby="ai-title" className="scroll-mt-20 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lc bg-brand/15">
          <Sparkles size={20} className="text-brand" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ai-title" className="font-display text-[17px] font-semibold text-text-1">
            AI Mentor wording
          </h2>
          <p className="mt-0.5 text-sm text-text-2">
            Hints and explanations are always written by CodeQuest&apos;s deterministic engine. When this is on, an AI rewords them
            in friendlier language, and every rewording is leak-checked against the solution before you see it.
          </p>
        </div>
        {ai.data && (
          <Switch
            label="AI wording"
            checked={ai.data.enabled}
            disabled={!ai.data.available || toggle.isPending}
            onChange={(next) => toggle.mutate(next)}
          />
        )}
      </div>

      {ai.isPending && (
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lc" />
          ))}
        </div>
      )}
      {ai.isError && <ErrorState className="mt-5" message="Could not load the AI status." onRetry={() => void ai.refetch()} />}
      {ai.data && (
        <>
          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            <Stat label="Provider" value={ai.data.provider ?? "None"} />
            <Stat label="Budget left" value={`$${ai.data.budget_left_usd.toFixed(2)}`} />
            <Stat label="Hints reworded" value={String(ai.data.rephrased)} />
            <Stat label="Leaks blocked" value={String(ai.data.leaks_blocked)} />
          </div>
          {!ai.data.available && (
            <p className="mt-3 text-xs text-medium">
              No AI provider is configured on the server, so CodeQuest runs fully deterministic. Everything still works.
            </p>
          )}
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-3">
            <ShieldCheck size={14} className="text-green" aria-hidden /> Hidden tests and reference solutions are never sent to the AI.
          </p>
        </>
      )}
      {toggle.isError && (
        <p role="alert" className="mt-3 text-xs text-red">
          {toggle.error instanceof ApiError ? toggle.error.message : "Could not change the AI setting."}
        </p>
      )}
    </Card>
  );
}
