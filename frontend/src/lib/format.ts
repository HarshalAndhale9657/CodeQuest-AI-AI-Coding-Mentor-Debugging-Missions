import type { Verdict } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  passed: "Passed",
  wrong_output: "Wrong output",
  runtime_error: "Runtime error",
  timeout: "Timeout",
};

export const MISTAKE_LABEL: Record<string, string> = {
  off_by_one: "Off-by-one",
  empty_input: "Unhandled empty input",
  print_vs_return: "Print instead of return",
  missing_return: "Missing return",
  infinite_loop: "Loop that never ends",
  base_case: "Missing base case",
  bad_initial_value: "Bad starting value",
  mutate_while_iterating: "Changing a list while looping",
  shadow_builtin: "Hidden built-in name",
  int_division: "Division mix-up",
};

export function mistakeLabel(key: string): string {
  if (key.startsWith("syntax:")) return `Syntax: ${key.slice(7).replaceAll("_", " ")}`;
  return MISTAKE_LABEL[key] ?? key.replaceAll("_", " ");
}

export function conceptLabel(key: string): string {
  return key.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

export const TIER_NAME: Record<number, string> = {
  1: "Foundations",
  2: "Lists & Logic",
  3: "Data Shapes",
  4: "Algorithms",
  5: "Recursion",
};

export type Difficulty = "Easy" | "Medium" | "Hard";

/** LeetCode-style difficulty for a mission tier: 1–2 Easy, 3 Medium, 4–5 Hard. */
export function difficultyForTier(tier: number): Difficulty {
  if (tier <= 2) return "Easy";
  if (tier === 3) return "Medium";
  return "Hard";
}

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

export const VERDICT_TEXT: Record<Verdict, string> = {
  passed: "text-green",
  wrong_output: "text-red",
  runtime_error: "text-medium",
  timeout: "text-purple",
};

export const VERDICT_BG: Record<Verdict, string> = {
  passed: "bg-green",
  wrong_output: "bg-red",
  runtime_error: "bg-medium",
  timeout: "bg-purple",
};

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
