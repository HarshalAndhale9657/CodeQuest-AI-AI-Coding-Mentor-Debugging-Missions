"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Map as MapIcon, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  GoalField,
  LevelField,
  NameField,
  PremiumField,
  PrivacyNote,
  TimeFields,
  TopicsField,
  cleanInput,
  draftFrom,
} from "@/components/profile/profile-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { ApiError, api, setStoredName } from "@/lib/api";
import type { ProfileInput, ProfileView } from "@/lib/types";

const STEPS = ["You & your goal", "Your time", "Your level", "Fine-tune"] as const;

export default function OnboardingPage() {
  return (
    <AppShell>
      <Onboarding />
    </AppShell>
  );
}

function Onboarding() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  if (profile.isError) {
    return (
      <ErrorState
        message={profile.error instanceof ApiError ? profile.error.message : "Could not load your profile."}
        onRetry={() => void profile.refetch()}
      />
    );
  }
  if (!profile.data) return <Skeleton className="mx-auto h-[520px] w-full max-w-2xl rounded-lc" />;
  return <Wizard view={profile.data} />;
}

function Wizard({ view }: { view: ProfileView }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<ProfileInput>(() => draftFrom(view));
  const patch = (p: Partial<ProfileInput>) => setDraft((d) => ({ ...d, ...p }));

  const finish = useMutation({
    mutationFn: async () => {
      const saved = await api.updateProfile(cleanInput(draft));
      setStoredName(saved.name);
      queryClient.setQueryData(["profile"], saved);
      try {
        // AI coach notes are best-effort: the deterministic plan is built either way.
        queryClient.setQueryData(["roadmap"], await api.replan(true));
      } catch {
        await queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.replace("/roadmap");
    },
  });

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };
  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-bg-2 px-3 py-1 text-xs font-medium text-brand">
          <MapIcon size={14} aria-hidden /> Personal roadmap
        </p>
        <h1 className="mt-3 font-display text-[30px] font-bold tracking-[-0.025em] text-text-1">{view.onboarded ? "Update your plan" : "Let's plan your quest"}</h1>
        <p className="mt-1 text-sm text-text-2">Four quick steps. CodeQuest turns your answers and your real mistakes into a week-by-week plan.</p>
      </header>

      <ol className="mb-4 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <div className="h-1 overflow-hidden rounded-full bg-fill-3">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: reduce ? 0 : 0.3 }}
              />
            </div>
            <p className={`mt-1.5 hidden text-xs sm:block ${i === step ? "text-text-1" : "text-text-3"}`}>{label}</p>
          </li>
        ))}
      </ol>

      <Card className="overflow-hidden p-5 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (last) finish.mutate();
            else go(step + 1);
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={reduce ? false : { opacity: 0, x: 24 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
              transition={{ duration: 0.18 }}
              className="min-h-[340px] space-y-6"
            >
              <h2 className="sr-only">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
              </h2>
              {step === 0 && (
                <>
                  <NameField draft={draft} patch={patch} />
                  <GoalField draft={draft} patch={patch} view={view} />
                </>
              )}
              {step === 1 && <TimeFields draft={draft} patch={patch} />}
              {step === 2 && <LevelField draft={draft} patch={patch} view={view} />}
              {step === 3 && (
                <>
                  <TopicsField draft={draft} patch={patch} view={view} />
                  <PremiumField draft={draft} patch={patch} />
                  <PrivacyNote />
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {finish.isError && (
            <p role="alert" className="mt-4 text-sm text-red">
              {finish.error instanceof ApiError ? finish.error.message : "Could not save your plan. Please try again."}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
            {step > 0 && (
              <Button variant="ghost" onClick={() => go(step - 1)} disabled={finish.isPending}>
                <ArrowLeft size={16} aria-hidden /> Back
              </Button>
            )}
            <span className="ml-auto text-xs text-text-3 tabular-nums">
              {step + 1} / {STEPS.length}
            </span>
            <Button type="submit" variant="primary" loading={finish.isPending}>
              {last ? (
                finish.isPending ? (
                  "Building your roadmap…"
                ) : (
                  <>
                    <Sparkles size={16} aria-hidden /> Build my roadmap
                  </>
                )
              ) : (
                <>
                  Next <ArrowRight size={16} aria-hidden />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
