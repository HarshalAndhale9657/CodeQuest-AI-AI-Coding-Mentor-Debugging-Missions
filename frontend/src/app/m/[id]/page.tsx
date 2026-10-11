"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, CheckCircle2, Lock, Play } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdaptationPanel } from "@/components/adaptation-panel";
import { AppShell } from "@/components/app-shell";
import { CodeEditor } from "@/components/code-editor";
import { HintLadder } from "@/components/hint-ladder";
import { ResultsBoard } from "@/components/results-board";
import { ApiError, api } from "@/lib/api";
import { conceptLabel, TIER_NAME } from "@/lib/format";
import { isJudgeResult, type ChallengeDetail, type HintEntry, type JudgeResult } from "@/lib/types";

const DRAFT_PREFIX = "codequest.draft.";

function readDraft(id: string): string | null {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + id);
  } catch {
    return null;
  }
}

function writeDraft(id: string, code: string): void {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + id, code);
  } catch {
    // storage unavailable: drafts are a convenience only
  }
}

function formatArgs(args: unknown[]): string {
  return args.map((a) => JSON.stringify(a)).join(", ");
}

export default function MissionPage() {
  return (
    <AppShell>
      <Mission />
    </AppShell>
  );
}

function Mission() {
  const { id } = useParams<{ id: string }>();
  const challenge = useQuery({ queryKey: ["challenge", id], queryFn: () => api.challenge(id) });

  if (challenge.isPending) return <p className="text-muted">Loading mission…</p>;
  if (challenge.isError) {
    return (
      <p role="alert" className="text-error">
        {challenge.error instanceof ApiError ? challenge.error.message : "Could not load this mission."}{" "}
        <Link href="/home" className="underline">
          Back to your quest
        </Link>
      </p>
    );
  }
  return <Workspace key={challenge.data.id} challenge={challenge.data} />;
}

function Workspace({ challenge }: { challenge: ChallengeDetail }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(() => readDraft(challenge.id) ?? challenge.starter_code);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusRegion, setFocusRegion] = useState<[number, number] | null>(null);
  const [ladder, setLadder] = useState<HintEntry[]>(challenge.hints.ladder);
  const [hintError, setHintError] = useState<string | null>(null);

  const submission = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => api.submission(submissionId as string),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "error" ? false : 400;
    },
  });

  const finished = submission.data?.status === "done" || submission.data?.status === "error";
  const judging = !!submissionId && !finished;
  const result: JudgeResult | null =
    submission.data?.status === "done" && isJudgeResult(submission.data.result) ? submission.data.result : null;
  const judgeError =
    submission.data?.status === "error" && submission.data.result && "error" in submission.data.result
      ? submission.data.result.error
      : null;

  // Once a verdict lands, the hint gate and the learner profile have changed on the server.
  useEffect(() => {
    if (!finished) return;
    void queryClient.invalidateQueries({ queryKey: ["challenge", challenge.id] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [finished, submissionId, queryClient, challenge.id]);

  const submit = useMutation({
    mutationFn: () => api.submit(challenge.id, code),
    onMutate: () => setSubmitError(null),
    onSuccess: (data) => setSubmissionId(data.submission_id),
    onError: (err) => setSubmitError(err instanceof ApiError ? err.message : "Submission failed. Please try again."),
  });

  const hint = useMutation({
    mutationFn: () => api.hint(challenge.id),
    onMutate: () => setHintError(null),
    onSuccess: (data) => {
      setLadder(data.ladder);
      setFocusRegion(data.hint.region);
      void queryClient.invalidateQueries({ queryKey: ["challenge", challenge.id] });
    },
    onError: (err) => {
      setHintError(err instanceof ApiError ? err.message : "Could not load a hint.");
      void queryClient.invalidateQueries({ queryKey: ["challenge", challenge.id] });
    },
  });

  const liveChallenge = useQuery({
    queryKey: ["challenge", challenge.id],
    queryFn: () => api.challenge(challenge.id),
    initialData: challenge,
  });

  const onChange = useCallback(
    (value: string) => {
      setCode(value);
      writeDraft(challenge.id, value);
    },
    [challenge.id],
  );

  const doSubmit = useCallback(() => {
    if (!judging && !submit.isPending) submit.mutate();
  }, [judging, submit]);

  const crash = useMemo(() => {
    const test = result?.tests.find((t) => t.visibility === "visible" && t.status === "runtime_error" && t.line);
    return test && test.visibility === "visible" ? { line: test.line, message: test.explanation } : null;
  }, [result]);

  const region = focusRegion ?? ladder.at(-1)?.region ?? null;
  const adaptation = result?.events?.adaptation ?? null;
  const solved = result?.all_passed ?? false;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* Problem */}
      <section className="space-y-3 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>
            Tier {challenge.tier} · {TIER_NAME[challenge.tier]}
          </span>
          {challenge.type === "debug" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-wrong/15 px-2 py-0.5 text-wrong">
              <Bug size={12} aria-hidden /> Debugging mission
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{challenge.title}</h1>
        <p className="whitespace-pre-line leading-relaxed text-muted">{challenge.description}</p>
        {challenge.max_changed_lines && (
          <p className="text-sm text-wrong">Fix it by changing at most {challenge.max_changed_lines} lines.</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {challenge.concepts.map((c) => (
            <span key={c} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              {conceptLabel(c)}
            </span>
          ))}
        </div>
        <div className="rounded-xl border border-line bg-panel p-3">
          <h2 className="mb-2 text-sm font-medium">Examples (visible tests)</h2>
          <ul className="space-y-1.5 font-mono text-xs">
            {challenge.visible_tests.map((t) => (
              <li key={t.id} className="break-all">
                {challenge.function}({formatArgs(t.args)}) → <span className="text-pass">{JSON.stringify(t.expected)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
            <Lock size={12} aria-hidden /> plus {challenge.hidden_test_count} hidden tests
          </p>
        </div>
        {challenge.edge_cases.length > 0 && (
          <div className="rounded-xl border border-line bg-panel p-3 text-sm">
            <h2 className="mb-1 font-medium">Things to consider</h2>
            <ul className="list-disc space-y-0.5 pl-5 text-muted">
              {challenge.edge_cases.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Editor */}
      <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-line bg-panel lg:h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <span className="font-mono text-xs text-muted">{challenge.id}.py</span>
          <button
            type="button"
            onClick={doSubmit}
            disabled={judging || submit.isPending}
            title="Submit to the judge (Ctrl+Enter)"
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            <Play size={14} aria-hidden /> {judging || submit.isPending ? "Judging…" : "Submit"}
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor
            path={`${challenge.id}.py`}
            defaultValue={code}
            onChange={onChange}
            onSubmitShortcut={doSubmit}
            region={region}
            crashLine={crash?.line ?? null}
            crashMessage={crash?.message ?? null}
          />
        </div>
      </section>

      {/* Feedback */}
      <section className="space-y-3 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        {(submitError ?? judgeError) && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-3 text-sm">
            {submitError ?? judgeError}
          </p>
        )}
        {solved && (
          <div className="flex items-center gap-2 rounded-xl border border-pass/40 bg-pass/10 p-3 text-sm">
            <CheckCircle2 size={18} className="text-pass" aria-hidden />
            Mission complete! Every test passed, including the hidden ones.
            <Link href="/home" className="ml-auto underline">
              Next mission
            </Link>
          </div>
        )}
        {adaptation && <AdaptationPanel adaptation={adaptation} />}
        {!solved && (
          <HintLadder
            ladder={ladder}
            maxLevel={challenge.max_hint_level}
            next={liveChallenge.data.hints.next}
            nextFetchedAt={liveChallenge.dataUpdatedAt}
            canAsk={!!result && !result.all_passed && !judging}
            busy={hint.isPending}
            error={hintError}
            onAsk={() => hint.mutate()}
            onFocusRegion={setFocusRegion}
          />
        )}
        {judging && <p className="text-sm text-muted">Running every test in the sandbox…</p>}
        {result ? (
          <ResultsBoard result={result} />
        ) : (
          !judging && (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
              Write your solution, then press <strong>Submit</strong> (Ctrl+Enter). Every test gets its own verdict.
            </p>
          )
        )}
      </section>
    </div>
  );
}
