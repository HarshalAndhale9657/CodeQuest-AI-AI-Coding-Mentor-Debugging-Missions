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
