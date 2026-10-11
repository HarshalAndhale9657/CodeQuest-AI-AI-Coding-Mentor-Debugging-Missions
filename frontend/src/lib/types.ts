export type Verdict = "passed" | "wrong_output" | "runtime_error" | "timeout";

export interface VisibleTestSpec {
  id: string;
  args: unknown[];
  expected: unknown;
  tags: string[];
}

export interface ChallengeSummary {
  id: string;
  type: "build" | "debug";
  tier: number;
  title: string;
  concepts: string[];
  hidden_test_count: number;
  solved: boolean;
}

export interface HintEntry {
  level: number;
  title: string;
  text: string;
  region: [number, number] | null;
  source: string;
}

export interface HintGate {
  next_level: number | null;
  available: boolean;
  unlocks_in_s: number | null;
  reason: string;
}

export interface HintState {
  ladder: HintEntry[];
  max_level: number;
  next: HintGate | null;
}

export interface ChallengeDetail {
  id: string;
  type: "build" | "debug";
  tier: number;
  title: string;
  concepts: string[];
  function: string;
  description: string;
  edge_cases: string[];
  starter_code: string;
  max_changed_lines: number | null;
  /** Calls the mission forbids, e.g. ["max"] or [".sort"]. */
  forbidden_calls: string[];
  visible_tests: VisibleTestSpec[];
  hidden_test_count: number;
  max_hint_level: number;
  hints: HintState;
  /** This attempt's Predict Before You Run question; null once answered or skipped. */
  prediction: PredictionPrompt | null;
}

/* ---------------------------------------------------------------- learning signals */

export interface PredictionPrompt {
  prompt_id: string;
  call: string;
}

export interface PredictionInput {
  prompt_id: string;
  answer?: string;
  crash?: boolean;
  skipped?: boolean;
}

/** P = prediction, A = what the code returned, E = the correct answer. */
export type PredictionState = "aligned" | "slip" | "misconception" | "lucky" | "lost";

export type PredictionResult =
  | {
      state: PredictionState;
      prompt_id: string;
      call: string;
      traced: boolean;
      predicted: string;
      actual: string;
      /** Only shown when the learner already knows it (slip) or their code produced it. */
      expected: string | null;
      message: string;
    }
  | { state: "unrun"; prompt_id: string; call: string; message: string };

export type Robustness =
  | { status: "checking" }
  | { status: "unchecked" }
  | { status: "robust"; checked: number; message: string }
  | {
      status: "fragile";
      checked: number;
      failed: number;
      counterexample: { call: string; expected: string; got: string | null; error: string | null };
      message: string;
    };

export interface RuleViolation {
  call: string;
  line: number;
}

export type StepKind = "first" | "progress" | "regression" | "sideways" | "resubmit" | "revert" | "solved";

export interface DiffRow {
  t: " " | "+" | "-";
  a: number | null;
  b: number | null;
  text: string;
}

export interface JourneyStep {
  index: number;
  submission_id: string;
  created: number;
  kind: StepKind;
  revert_of: number | null;
  passed: number;
  total: number;
  hidden_passed: number;
  hidden_total: number;
  all_passed: boolean;
  syntax_error: boolean;
  failing: string[];
  error_line: number | null;
  mistakes: string[];
  delta: number | null;
  change: { added: number; removed: number; focused: boolean; hunks: { rows: DiffRow[] }[]; truncated: boolean } | null;
  code: string;
}

export type JourneyStyle = "first_try" | "single" | "quick_fix" | "too_short" | "methodical" | "exploratory" | "trial_and_error";
export type SelfReport = "systematic" | "mixed" | "random";
export type Agreement = "agrees" | "close" | "differs";

export interface JourneySummary {
  submissions: number;
  solved: boolean;
  productive: number;
  regressions: number;
  resubmits: number;
  reverts: number;
  productive_ratio: number | null;
  focused_share: number | null;
  error_quotient: number | null;
  style: JourneyStyle | null;
}

export interface Journey {
  attempt: { id: string; created: number; open: boolean; solved: boolean } | null;
  attempts: { id: string; created: number; open: boolean; submissions: number }[];
  steps: JourneyStep[];
  summary: JourneySummary | null;
  reflection: { strategy: SelfReport; note: string | null; t: number } | null;
  agreement: Agreement | null;
}

export interface Growth {
  solves: {
    count: number;
    hint_free: number;
    first_try: number;
    series: {
      challenge_id: string;
      title: string;
      tier: number;
      type: "build" | "debug";
      t: number;
      hints: number;
      submissions: number;
      hint_free: boolean;
      first_try: boolean;
      robust: boolean | null;
    }[];
    rolling: { n: number; hint_free_rate: number; first_try_rate: number }[];
    trend: "up" | "down" | "steady" | null;
  };
  struggle: {
    challenge_id: string;
    title: string;
    tier: number;
    type: "build" | "debug";
    state: "solved" | "stuck" | "untouched";
    effort: "clean" | "worked" | "hard" | null;
    submissions: number;
    hints: number;
  }[];
  lanes: {
    attempts: { n: number; number: number; ref: string; title: string }[];
    lanes: { key: string; hits: number[]; state: "recurring" | "seen" | "beaten" }[];
  };
  prediction: {
    total: number;
    traced: number;
    knew_answer: number;
    by_state: Record<PredictionState, number>;
    by_concept: { concept: string; total: number; traced: number; lucky: number; flag: "lucky_passes" | "untraced_skill" | null }[];
  } | null;
  debugging: {
    journeys: number;
    styles: Partial<Record<JourneyStyle, number>>;
    series: { challenge_id: string; title: string; style: JourneyStyle; productive_ratio: number | null; error_quotient: number | null; t: number }[];
    productive_ratio: number | null;
    error_quotient: number | null;
    self_report: Partial<Record<Agreement, number>>;
  };
  robustness: { checked: number; robust: number; fragile: number };
}

export interface VisibleTestResult {
  test_id: string;
  index: number;
  visibility: "visible";
  status: Verdict;
  category: string;
  subtype: string | null;
  input: string;
  expected: string;
  actual: string | null;
  exception_type: string | null;
  raw_message: string | null;
  line: number | null;
  locals: Record<string, string>;
  label: string | null;
  stdout: string;
  explanation: string;
}

export interface HiddenTestResult {
  test_id: string;
  index: number;
  visibility: "hidden";
  status: Verdict;
  category: string;
  explanation: string;
}

export type TestResult = VisibleTestResult | HiddenTestResult;

export interface NextUpItem {
  challenge_id: string;
  title: string;
  type: "build" | "debug";
  tier: number;
  score: number;
  predicted_success: number;
  reason: string;
}

export interface Adaptation {
  recurring: string[];
  debug_mission: { id: string; title: string } | null;
  next_up: NextUpItem[];
  preflight: string[];
}

export interface SubmissionEvents {
  mistakes: string[];
  newly_recurring: string[];
  solved: boolean;
  score?: number;
  skill_changes: Record<string, number>;
  adaptation: Adaptation | null;
}

export interface JudgeResult {
  challenge_id: string;
  counts: Record<Verdict, number>;
  all_passed: boolean;
  syntax_error: { message: string; line: number | null; offset: number | null; explanation: string } | null;
  summary: string;
  tests: TestResult[];
  notes: { line: number; message: string; key: string }[];
  /** Mission rules the passing code breaks ("without max()"): the attempt is not complete. */
  rule_violations?: RuleViolation[];
  runner: string;
  events: SubmissionEvents;
  prediction?: PredictionResult | null;
  /** Small-input search beyond the tests, run after a pass; "checking" until it finishes. */
  robustness?: Robustness | null;
}

export interface SubmissionView {
  submission_id: string;
  status: "queued" | "running" | "done" | "error";
  challenge_id: string;
  result?: JudgeResult | { error: string };
}

export interface SkillBand {
  concept: string;
  band: "ready" | "learning" | "almost" | "mastered";
  attempts: number;
  verified: number;
  p_median: number;
}

export interface Me {
  user: { id: string; name: string; handle: string };
  skills: SkillBand[];
  mistakes: {
    recurring: string[];
    beaten: string[];
    strength: Record<string, number>;
    history: string[][];
  };
  solved: string[];
  next_up: NextUpItem[];
  profile: Profile | null;
  onboarded: boolean;
}

export interface HintResponse {
  hint: HintEntry;
  ladder: HintEntry[];
  max_level: number;
  next: HintGate;
}

export interface ArenaAttack {
  index: number;
  id: string;
  title: string;
  code: string;
}

export interface ArenaResult {
  index: number;
  id: string;
  title: string;
  verdict: Verdict;
  subtype: string | null;
  detail: string;
  contained: boolean;
  runner: string;
  sandboxed: boolean;
}

export function isJudgeResult(value: SubmissionView["result"]): value is JudgeResult {
  return !!value && "tests" in value;
}

export interface AiStatus {
  enabled: boolean;
  available: boolean;
  provider: string | null;
  budget_left_usd: number;
  rephrased: number;
  leaks_blocked: number;
}

export type ImportPlatform = "codeforces" | "leetcode";

export interface ImportRow {
  status: "ok" | "stale" | "error" | "queued";
  handle: string;
  error: string | null;
  fetched: number | null;
  rating?: number | null;
  max_rating?: number | null;
  rank?: string | null;
  solved?: number | { easy: number; medium: number; hard: number; total: number };
  top_tags?: [string, number][];
  concepts?: string[];
}

export interface MistakeTimelineRow {
  key: string;
  label: string;
  first_seen: number | null;
  last_seen: number | null;
  times: number;
  recurring: boolean;
  beaten: boolean;
}

export interface Portfolio {
  handle: string;
  name: string;
  verified: {
    concepts: SkillBand[];
    all_concepts: SkillBand[];
    mistakes: MistakeTimelineRow[];
    stats: {
      solved: number;
      missions_total: number;
      hints_per_solve: number | null;
      debug_missions: number;
      attempts: number;
    };
    solved: { id: string; title: string; tier: number }[];
    growth: Growth;
  };
  imports: Partial<Record<ImportPlatform, ImportRow>>;
  typing: TypingSummary | null;
}

/* ---------------------------------------------------------------- personal profile */

export type GoalId = "learn_python" | "service_placement" | "product_placement" | "faang" | "competitive";
export type LevelId = "new" | "basics" | "some_leetcode" | "intermediate" | "advanced";

export interface Profile {
  goal: GoalId;
  deadline_weeks: number | null;
  hours_per_week: number;
  level: LevelId;
  premium_ok: boolean;
  comfortable: string[];
  updated?: number;
}

export interface ProfileInput extends Omit<Profile, "updated"> {
  name?: string;
}

export interface TopicOption {
  id: string;
  label: string;
  layer: "python" | "dsa";
}

export interface ProfileView {
  name: string;
  handle: string;
  profile: Profile | null;
  onboarded: boolean;
  options: {
    goals: { id: GoalId; label: string }[];
    levels: { id: LevelId; label: string }[];
    topics: TopicOption[];
  };
}

/* ---------------------------------------------------------------- roadmap */

export interface RoadmapItem {
  id: string;
  kind: "mission" | "leetcode" | "warmup";
  title: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  minutes: number;
  url: string;
  reason: string;
  lists: string[];
  trap: boolean;
  premium?: boolean;
  mission_type?: "build" | "debug";
  done: boolean;
}

export interface RoadmapWeek {
  week: number;
  focus: string[];
  items: RoadmapItem[];
  minutes: number;
  review_minutes: number;
  review: string;
  done: number;
  note: string;
}

export interface RoadmapTopic {
  id: string;
  label: string;
  layer: "python" | "dsa";
  status: "planned" | "mastered" | "skipped" | "trimmed";
  reason: string;
  source: "verified" | "level" | "self-reported" | "imported";
  items?: number;
}

export interface Roadmap {
  version: number;
  created: number | null;
  goal_label: string;
  level_label: string;
  profile: Profile;
  weekly_minutes: number;
  pace: number;
  topics: RoadmapTopic[];
  warnings: string[];
  compressed: boolean;
  weeks: RoadmapWeek[];
  current_week: number | null;
  progress: { done: number; total: number; minutes_left: number };
  coach: { summary: string; tips: string[]; source: "ai" | "template"; model: string | null };
  replan: { suggested: boolean; reasons: string[] };
  ai: { available: boolean; enabled: boolean };
}

/* ---------------------------------------------------------------- Syntax Warm-up */

export interface TypingDrill {
  id: string;
  title: string;
  concept: string;
  code: string;
  source: "corpus" | "own";
  lines: number;
  chars: number;
  reason: string;
  recommended: boolean;
}

export interface TypingRunPoint {
  cpm: number;
  wpm: number;
  accuracy: number;
  snippet_id: string;
  created: number;
}

export interface TypingSummary {
  best_cpm: number;
  best_wpm: number;
  accuracy: number;
  syntax_accuracy: number | null;
  runs: number;
  pace_cpm: number | null;
  top_errors: [string, number][];
  recent: TypingRunPoint[];
}

export interface TypingDrills {
  drills: TypingDrill[];
  focus: { syntax: string[]; concepts: string[] };
  summary: TypingSummary | null;
}

export interface TypingRunInput {
  snippet_id: string;
  auto_indent: boolean;
  duration_ms: number;
  errors: Record<string, number>;
  syntax_errors: number;
}

export interface TypingRunResult {
  run: {
    cpm: number;
    wpm: number;
    accuracy: number;
    syntax_accuracy: number | null;
    chars: number;
    errors: number;
    duration_ms: number;
    personal_best: boolean;
  };
  summary: TypingSummary;
}
