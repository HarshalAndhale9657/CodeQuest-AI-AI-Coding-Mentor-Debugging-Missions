"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Code2,
  FileText,
  Lightbulb,
  List,
  Lock,
  RotateCcw,
  SquareCheck,
  Tags,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Group, Panel as ResizablePanel, Separator, useDefaultLayout, useGroupRef } from "react-resizable-panels";
import { AdaptationPanel } from "@/components/adaptation-panel";
import { WorkspaceFrame, WorkspaceGate } from "@/components/app-shell";
import { CodeEditor } from "@/components/code-editor";
import { HintLadder } from "@/components/hint-ladder";
import { ResultsBoard } from "@/components/results-board";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { ErrorState, Kbd, Skeleton } from "@/components/ui/states";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { DifficultyLabel, Tag } from "@/components/ui/tag";
import { ApiError, api } from "@/lib/api";
import { conceptLabel } from "@/lib/format";
import { isJudgeResult, type ChallengeDetail, type ChallengeSummary, type HintEntry, type JudgeResult } from "@/lib/types";
import { useMediaQuery } from "@/lib/use-media-query";

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
    <WorkspaceGate>
      <Mission />
    </WorkspaceGate>
  );
}

function Breadcrumb({ list, id }: { list: ChallengeSummary[] | undefined; id: string }) {
  const index = list?.findIndex((m) => m.id === id) ?? -1;
  const prev = index > 0 ? list?.[index - 1] : undefined;
  const next = index >= 0 ? list?.[index + 1] : undefined;
  const arrow = (target: ChallengeSummary | undefined, label: string, icon: ReactNode) =>
    target ? (
      <Link href={`/m/${target.id}`} aria-label={`${label}: ${target.title}`} title={target.title} className="grid size-8 place-items-center rounded-lc-sm text-text-2 hover:bg-fill-2 hover:text-text-1">
        {icon}
      </Link>
    ) : (
      <span className="grid size-8 place-items-center text-text-3/40" aria-hidden>
        {icon}
      </span>
    );
  return (
    <div className="hidden items-center gap-1 sm:flex">
      <span className="mx-1 h-4 w-px bg-line-strong" aria-hidden />
      <Link href="/home" className="flex h-8 items-center gap-2 rounded-lc-sm px-2 text-[15px] font-medium text-text-1 hover:bg-fill-2">
        <List size={18} aria-hidden /> Quest
      </Link>
      {arrow(prev, "Previous mission", <ChevronLeft size={18} />)}
      {arrow(next, "Next mission", <ChevronRight size={18} />)}
    </div>
  );
}

function Mission() {
  const { id } = useParams<{ id: string }>();
  const challenge = useQuery({ queryKey: ["challenge", id], queryFn: () => api.challenge(id) });
  const list = useQuery({ queryKey: ["challenges"], queryFn: api.challenges });

  if (challenge.isError) {
    return (
      <WorkspaceFrame left={<Breadcrumb list={list.data} id={id} />}>
        <div className="m-auto w-full max-w-lg">
          <ErrorState
            message={challenge.error instanceof ApiError ? challenge.error.message : "Could not load this mission."}
            onRetry={() => void challenge.refetch()}
          />
        </div>
      </WorkspaceFrame>
    );
  }
  if (challenge.isPending) {
    return (
      <WorkspaceFrame left={<Breadcrumb list={list.data} id={id} />}>
        <div className="grid flex-1 gap-2 lg:grid-cols-[2fr_3fr]" aria-busy="true">
          <Skeleton className="h-full min-h-64 rounded-lc bg-panel" />
          <Skeleton className="h-full min-h-64 rounded-lc bg-panel" />
        </div>
      </WorkspaceFrame>
    );
  }
  const summary = list.data?.find((m) => m.id === id);
  const number = list.data ? list.data.findIndex((m) => m.id === id) + 1 : null;
  return (
    <Workspace
      key={challenge.data.id}
      challenge={challenge.data}
      number={number || null}
      solvedBefore={!!summary?.solved}
      breadcrumb={<Breadcrumb list={list.data} id={id} />}
    />
  );
}

type LeftTab = "description" | "hints";
type BottomTab = "testcase" | "result";

function Workspace({
  challenge,
  number,
  solvedBefore,
  breadcrumb,
}: {
  challenge: ChallengeDetail;
  number: number | null;
  solvedBefore: boolean;
  breadcrumb: ReactNode;
}) {
  const queryClient = useQueryClient();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [code, setCode] = useState(() => readDraft(challenge.id) ?? challenge.starter_code);
  const [editorKey, setEditorKey] = useState(0);
  const [cursor, setCursor] = useState<[number, number]>([1, 1]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusRegion, setFocusRegion] = useState<[number, number] | null>(null);
  const [ladder, setLadder] = useState<HintEntry[]>(challenge.hints.ladder);
  const [hintError, setHintError] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [bottomTab, setBottomTab] = useState<BottomTab>("testcase");

  const submission = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => api.submission(submissionId as string),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "error" ? false : 400;
    },
    // Keep polling while the learner looks at another tab (e.g. LeetCode); otherwise the verdict waits for focus.
    refetchIntervalInBackground: true,
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
    void queryClient.invalidateQueries({ queryKey: ["challenges"] });
  }, [finished, submissionId, queryClient, challenge.id]);

  const submit = useMutation({
    mutationFn: () => api.submit(challenge.id, code),
    onMutate: () => {
      setSubmitError(null);
      setBottomTab("result");
    },
    onSuccess: (data) => setSubmissionId(data.submission_id),
    onError: (err) => setSubmitError(err instanceof ApiError ? err.message : "Submission failed. Please try again."),
  });

  const hint = useMutation({
    mutationFn: () => api.hint(challenge.id),
    onMutate: () => {
      setHintError(null);
      setLeftTab("hints");
    },
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
  const onCursor = useCallback((line: number, col: number) => setCursor([line, col]), []);

  const doSubmit = useCallback(() => {
    if (!judging && !submit.isPending) submit.mutate();
  }, [judging, submit]);

  const resetCode = () => {
    setCode(challenge.starter_code);
    writeDraft(challenge.id, challenge.starter_code);
    setEditorKey((k) => k + 1);
  };

  const crash = useMemo(() => {
    const test = result?.tests.find((t) => t.visibility === "visible" && t.status === "runtime_error" && t.line);
    return test && test.visibility === "visible" ? { line: test.line, message: test.explanation } : null;
  }, [result]);

  const region = focusRegion ?? ladder.at(-1)?.region ?? null;
  const adaptation = result?.events?.adaptation ?? null;
  const solved = result?.all_passed ?? false;
  const canHint = !!result && !result.all_passed && !judging;
  const busy = judging || submit.isPending;

  const actions = (
    <div className="flex items-center overflow-hidden rounded-lc bg-btn-dark">
      <button
        type="button"
        onClick={() => (canHint ? hint.mutate() : setLeftTab("hints"))}
        disabled={hint.isPending}
        className="flex h-8 items-center gap-1.5 px-3 text-sm text-text-2 transition-colors hover:bg-hover hover:text-text-1 disabled:opacity-50"
        title={canHint ? "Get the next hint" : "Open the hint ladder"}
      >
        <Lightbulb size={16} className="text-medium" aria-hidden />
        <span className="hidden sm:inline">Hint</span>
      </button>
      <span className="h-5 w-px bg-line-strong" aria-hidden />
      <button
        type="button"
        onClick={doSubmit}
        disabled={busy}
        title="Submit to the judge (Ctrl+Enter)"
        className="flex h-8 items-center gap-1.5 px-3 text-sm font-medium text-green-submit transition-colors hover:bg-hover disabled:opacity-60"
      >
        <CloudUpload size={16} className={busy ? "animate-pulse" : ""} aria-hidden />
        {busy ? "Judging…" : "Submit"}
      </button>
    </div>
  );

  const description = (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">
          {number ? `${number}. ` : ""}
          {challenge.title}
        </h1>
        {(solvedBefore || solved) && (
          <span className="mt-1.5 inline-flex shrink-0 items-center gap-1 text-sm text-green">
            Solved <CheckCircle2 size={16} aria-hidden />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyLabel tier={challenge.tier} pill />
        {challenge.type === "debug" && (
          <Tag icon={<Bug size={12} aria-hidden />} className="text-medium">
            Debugging mission
          </Tag>
        )}
        {challenge.concepts.map((c) => (
          <Tag key={c} icon={<Tags size={12} aria-hidden />}>
            {conceptLabel(c)}
          </Tag>
        ))}
      </div>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-text-1">{challenge.description}</p>
      {challenge.max_changed_lines && (
        <p className="rounded-lc bg-medium/10 px-3 py-2 text-sm text-medium">
          Fix it by changing at most {challenge.max_changed_lines} lines.
        </p>
      )}
      {challenge.visible_tests.map((t, i) => (
        <div key={t.id} className="space-y-2">
          <p className="font-semibold text-text-1">Example {i + 1}:</p>
          <div className="border-l-2 border-line-strong pl-4 font-mono text-[13px] leading-6">
            <p className="break-all">
              <span className="font-sans font-semibold text-text-1">Input: </span>
              <span className="text-text-2">
                {challenge.function}({formatArgs(t.args)})
              </span>
            </p>
            <p className="break-all">
              <span className="font-sans font-semibold text-text-1">Output: </span>
              <span className="text-text-2">{JSON.stringify(t.expected)}</span>
            </p>
          </div>
        </div>
      ))}
      <p className="inline-flex items-center gap-1.5 text-sm text-text-3">
        <Lock size={14} aria-hidden /> plus {challenge.hidden_test_count} hidden tests
      </p>
      {challenge.edge_cases.length > 0 && (
        <div>
          <p className="mb-2 font-semibold text-text-1">Things to consider:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-2 marker:text-text-3">
            {challenge.edge_cases.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const left = (
    <Panel className="h-full" aria-label="Problem">
      <PanelHeader>
        <Tabs
          idPrefix="left"
          label="Problem"
          value={leftTab}
          onChange={setLeftTab}
          tabs={[
            { id: "description", label: "Description", icon: <FileText size={15} className="text-blue" aria-hidden /> },
            {
              id: "hints",
              label: "Hints",
              icon: <Lightbulb size={15} className="text-medium" aria-hidden />,
              badge: ladder.length ? <span className="text-xs text-text-3">{ladder.length}</span> : undefined,
            },
          ]}
        />
      </PanelHeader>
      <PanelBody>
        <TabPanel idPrefix="left" id="description" active={leftTab === "description"}>
          {description}
        </TabPanel>
        <TabPanel idPrefix="left" id="hints" active={leftTab === "hints"} className="p-5">
          {solved ? (
            <p className="text-sm text-text-2">Mission complete: no hints needed.</p>
          ) : (
            <HintLadder
              ladder={ladder}
              maxLevel={challenge.max_hint_level}
              next={liveChallenge.data.hints.next}
              nextFetchedAt={liveChallenge.dataUpdatedAt}
              canAsk={canHint}
              busy={hint.isPending}
              error={hintError}
              onAsk={() => hint.mutate()}
              onFocusRegion={setFocusRegion}
            />
          )}
        </TabPanel>
      </PanelBody>
    </Panel>
  );

  const editor = (
    <Panel className={wide ? "h-full" : "h-[28rem]"} aria-label="Code">
      <PanelHeader>
        <span className="inline-flex h-7 items-center gap-1.5 px-2 font-medium text-text-1">
          <Code2 size={16} className="text-green" aria-hidden /> Code
        </span>
      </PanelHeader>
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3 text-sm text-text-2">
        <span>Python 3</span>
        <span className="inline-flex items-center gap-1 text-text-3">
          <Lock size={12} aria-hidden /> Sandboxed
        </span>
        <span className="ml-auto font-mono text-xs text-text-3">{challenge.id}.py</span>
        <button
          type="button"
          onClick={resetCode}
          className="grid size-7 place-items-center rounded-lc-sm text-text-2 hover:bg-fill-3 hover:text-text-1"
          aria-label="Reset to the starter code"
          title="Reset to the starter code"
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor
          key={editorKey}
          path={`${challenge.id}.py`}
          defaultValue={code}
          onChange={onChange}
          onSubmitShortcut={doSubmit}
          onCursor={onCursor}
          region={region}
          crashLine={crash?.line ?? null}
          crashMessage={crash?.message ?? null}
        />
      </div>
      <div className="flex h-7 shrink-0 items-center gap-3 px-3 text-xs text-text-3">
        <span>Saved</span>
        <span className="hidden sm:inline">
          <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to submit
        </span>
        <span className="ml-auto tabular-nums">
          Ln {cursor[0]}, Col {cursor[1]}
        </span>
      </div>
    </Panel>
  );

  const resultBody = (() => {
    if (submitError ?? judgeError) {
      return (
        <p role="alert" className="rounded-lc bg-red/10 px-3 py-2 text-sm text-text-1">
          {submitError ?? judgeError}
        </p>
      );
    }
    if (busy) {
      return (
        <div className="space-y-3" aria-busy="true">
          <p className="text-sm text-text-2" aria-live="polite">
            Running every test in the sandbox…
          </p>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }
    if (!result) {
      return (
        <p className="grid h-full min-h-32 place-items-center text-center text-sm text-text-3">
          You must submit your code first.
        </p>
      );
    }
    return (
      <div className="space-y-4">
        {solved && (
          <div className="flex flex-wrap items-center gap-2 rounded-lc bg-green/10 px-3 py-2 text-sm text-text-1">
            <CheckCircle2 size={18} className="text-green" aria-hidden />
            Mission complete! Every test passed, including the hidden ones.
            <Link href="/home" className="ml-auto font-medium text-green hover:underline">
              Next mission →
            </Link>
          </div>
        )}
        <ResultsBoard key={submissionId} result={result}>
          {adaptation && <AdaptationPanel adaptation={adaptation} />}
        </ResultsBoard>
      </div>
    );
  })();

  const bottom = (
    <Panel className="h-full" aria-label="Tests">
      <PanelHeader>
        <Tabs
          idPrefix="bottom"
          label="Tests"
          value={bottomTab}
          onChange={setBottomTab}
          tabs={[
            { id: "testcase", label: "Testcase", icon: <SquareCheck size={15} className="text-green" aria-hidden /> },
            { id: "result", label: "Test Result", icon: <Terminal size={15} className="text-green" aria-hidden /> },
          ]}
        />
      </PanelHeader>
      <PanelBody className="p-4">
        <TabPanel idPrefix="bottom" id="testcase" active={bottomTab === "testcase"}>
          <TestcaseView challenge={challenge} />
        </TabPanel>
        <TabPanel idPrefix="bottom" id="result" active={bottomTab === "result"} className="h-full">
          {resultBody}
        </TabPanel>
      </PanelBody>
    </Panel>
  );

  return (
    <WorkspaceFrame left={breadcrumb} center={actions}>
      {wide ? <ResizableWorkspace left={left} editor={editor} bottom={bottom} resultKey={result ? submissionId : null} /> : (
        <div className="flex flex-col gap-2">
          <div className="max-h-[70vh]">{left}</div>
          {editor}
          <div className="min-h-64">{bottom}</div>
        </div>
      )}
    </WorkspaceFrame>
  );
}

function ResizableWorkspace({
  left,
  editor,
  bottom,
  resultKey,
}: {
  left: ReactNode;
  editor: ReactNode;
  bottom: ReactNode;
  /** Changes when a new verdict arrives; the Test Result pane then grows so the verdict is readable. */
  resultKey: string | null;
}) {
  const horizontal = useDefaultLayout({ id: "cq-mission-h" });
  const vertical = useDefaultLayout({ id: "cq-mission-v" });
  const verticalRef = useGroupRef();
  useEffect(() => {
    const group = verticalRef.current;
    if (!resultKey || !group) return;
    if ((group.getLayout().tests ?? 0) < 55) group.setLayout({ code: 40, tests: 60 });
  }, [resultKey, verticalRef]);
  return (
    <Group orientation="horizontal" className="min-h-0 flex-1" defaultLayout={horizontal.defaultLayout} onLayoutChanged={horizontal.onLayoutChanged}>
      <ResizablePanel id="problem" defaultSize="42" minSize="22">
        {left}
      </ResizablePanel>
      <Separator className="cq-handle" />
      <ResizablePanel id="work" minSize="30">
        <Group
          orientation="vertical"
          className="h-full"
          groupRef={verticalRef}
          defaultLayout={vertical.defaultLayout}
          onLayoutChanged={vertical.onLayoutChanged}
        >
          <ResizablePanel id="code" defaultSize="60" minSize="20">
            {editor}
          </ResizablePanel>
          <Separator className="cq-handle" />
          <ResizablePanel id="tests" minSize="12">
            {bottom}
          </ResizablePanel>
        </Group>
      </ResizablePanel>
    </Group>
  );
}

function TestcaseView({ challenge }: { challenge: ChallengeDetail }) {
  const [selected, setSelected] = useState(0);
  const test = challenge.visible_tests[selected];
  if (!test) return <p className="text-sm text-text-3">This mission has no visible examples.</p>;
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Example cases" className="flex flex-wrap gap-2">
        {challenge.visible_tests.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={cx(
              "h-8 rounded-lc px-3 text-sm transition-colors",
              i === selected ? "bg-fill-3 text-text-1" : "text-text-2 hover:bg-fill-2",
            )}
          >
            Case {i + 1}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-text-3">Call</p>
        <div className="break-all rounded-lc bg-fill-2 px-3 py-2 font-mono text-[13px] text-text-1">
          {challenge.function}({formatArgs(test.args)})
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-text-3">Expected</p>
        <div className="break-all rounded-lc bg-fill-2 px-3 py-2 font-mono text-[13px] text-text-1">{JSON.stringify(test.expected)}</div>
      </div>
      <p className="text-xs text-text-3">Submitting runs these plus {challenge.hidden_test_count} hidden tests.</p>
    </div>
  );
}
