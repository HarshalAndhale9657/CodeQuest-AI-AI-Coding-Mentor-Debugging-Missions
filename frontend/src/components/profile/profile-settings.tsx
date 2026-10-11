"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Map as MapIcon, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api, clearSession, setStoredName } from "@/lib/api";
import type { ProfileInput, ProfileView } from "@/lib/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ErrorState, Skeleton } from "../ui/states";
import { GoalField, LevelField, NameField, PremiumField, PrivacyNote, TimeFields, TopicsField, cleanInput, draftFrom } from "./profile-fields";

/** Settings card: edit the onboarding answers in one form. Saving offers to re-plan the roadmap. */
export function ProfileCard() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  return (
    <Card id="profile" aria-labelledby="profile-title" className="scroll-mt-20 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lc bg-blue/15">
          <UserRound size={20} className="text-blue" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="profile-title" className="text-base font-semibold text-text-1">
            Your profile &amp; goals
          </h2>
          <p className="mt-0.5 text-sm text-text-2">Your roadmap is planned from these answers and from what you actually solve.</p>
        </div>
      </div>
      {profile.isError && <ErrorState className="mt-5" message="Could not load your profile." onRetry={() => void profile.refetch()} />}
      {profile.isPending && <Skeleton className="mt-5 h-80 rounded-lc" />}
      {profile.data && <ProfileForm view={profile.data} />}
    </Card>
  );
}

function ProfileForm({ view }: { view: ProfileView }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProfileInput>(() => draftFrom(view));
  const save = useMutation({
    mutationFn: () => api.updateProfile(cleanInput(draft)),
    onSuccess: async (saved) => {
      setStoredName(saved.name);
      queryClient.setQueryData(["profile"], saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["roadmap"] }),
      ]);
    },
  });
  const patch = (p: Partial<ProfileInput>) => {
    setDraft((d) => ({ ...d, ...p }));
    if (save.isSuccess || save.isError) save.reset();
  };

  return (
    <form
      className="mt-5 space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <NameField draft={draft} patch={patch} />
      <GoalField draft={draft} patch={patch} view={view} />
      <TimeFields draft={draft} patch={patch} />
      <LevelField draft={draft} patch={patch} view={view} />
      <TopicsField draft={draft} patch={patch} view={view} />
      <PremiumField draft={draft} patch={patch} />
      <PrivacyNote />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button type="submit" variant="primary" loading={save.isPending}>
          {view.onboarded ? "Save changes" : "Save and plan"}
        </Button>
        {save.isSuccess && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-green">
            <Check size={15} aria-hidden /> Saved.{" "}
            <Link href="/roadmap" className="inline-flex items-center gap-1 text-brand hover:underline">
              <MapIcon size={14} aria-hidden /> Update your roadmap
            </Link>
          </span>
        )}
        {save.isError && (
          <span role="alert" className="text-sm text-red">
            {save.error instanceof ApiError ? save.error.message : "Could not save your profile."}
          </span>
        )}
      </div>
    </form>
  );
}

/** Data rights: download everything, or erase it. */
export function DataCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const exportData = useMutation({
    mutationFn: api.exportData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `codequest-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  const remove = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      router.replace("/");
    },
  });

  return (
    <Card id="data" aria-labelledby="data-title" className="scroll-mt-20 p-5">
      <h2 id="data-title" className="text-base font-semibold text-text-1">
        Your data
      </h2>
      <p className="mt-0.5 text-sm text-text-2">
        Download everything CodeQuest stores about you (profile, attempts, code, typing runs, roadmap), or erase it for good.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => exportData.mutate()} loading={exportData.isPending}>
          {!exportData.isPending && <Download size={15} aria-hidden />} Export my data
        </Button>
        {!confirming && (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden /> Delete my account
          </Button>
        )}
      </div>
      {confirming && (
        <div role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-text" className="mt-4 rounded-lc border border-red/40 bg-red/5 p-4">
          <p id="delete-title" className="text-sm font-medium text-text-1">
            Delete your account and all your data?
          </p>
          <p id="delete-text" className="mt-1 text-sm text-text-2">
            Your missions, mistakes, roadmap, typing runs and public portfolio are erased immediately. This can&apos;t be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => remove.mutate()} loading={remove.isPending}>
              Yes, delete everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={remove.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {(exportData.error ?? remove.error) && (
        <p role="alert" className="mt-3 text-sm text-red">
          {errorMessage(exportData.error ?? remove.error)}
        </p>
      )}
    </Card>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
