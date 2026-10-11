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
  visible_tests: VisibleTestSpec[];
  hidden_test_count: number;
  max_hint_level: number;
  hints: HintState;
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
  runner: string;
  events: SubmissionEvents;
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
  };
  imports: Partial<Record<ImportPlatform, ImportRow>>;
  typing: { best_cpm: number; accuracy: number; runs: number } | null;
}
