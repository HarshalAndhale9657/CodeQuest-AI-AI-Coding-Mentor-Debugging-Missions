import type { Agreement, JourneyStyle, PredictionState, SelfReport, StepKind } from "./types";

/** Predict Before You Run: what each cell of the prediction / code / answer matrix means. */
export const PREDICTION_COPY: Record<PredictionState | "unrun", { title: string; short: string }> = {
  aligned: { title: "Spot on", short: "Knew the code and the answer" },
  slip: { title: "Your code surprised you", short: "Knew the answer, the code did something else" },
  misconception: { title: "Matched your code, not the task", short: "Traced the code, but the plan was off" },
  lucky: { title: "Right answer, unexpected reason", short: "Passed, but not as predicted" },
  lost: { title: "Worth tracing by hand", short: "Prediction, code and answer all differ" },
  unrun: { title: "Prediction saved for next time", short: "The code didn't run" },
};

export const PREDICTION_TONE: Record<PredictionState | "unrun", string> = {
  aligned: "text-green",
  slip: "text-medium",
  misconception: "text-red",
  lucky: "text-purple",
  lost: "text-red",
  unrun: "text-text-3",
};

export const STEP_LABEL: Record<StepKind, string> = {
  first: "First submission",
  progress: "Closer",
  regression: "Further away",
  sideways: "No progress",
  resubmit: "Same code again",
  revert: "Went back",
  solved: "Solved",
};

/** Dot colour per step kind (status semantics: good, bad, neutral), always paired with a text label. */
export const STEP_DOT: Record<StepKind, string> = {
  first: "bg-blue",
  progress: "bg-green",
  regression: "bg-red",
  sideways: "bg-fill-4",
  resubmit: "bg-fill-4",
  revert: "bg-purple",
  solved: "bg-green",
};

export const STYLE_COPY: Record<JourneyStyle, { title: string; text: string }> = {
  first_try: { title: "First try", text: "Solved on the first submission." },
  quick_fix: { title: "Quick fix", text: "One small, targeted change after the first submission." },
  methodical: { title: "Methodical", text: "Small changes, each one moving the tests forward: one idea at a time." },
  exploratory: { title: "Exploratory", text: "A mix of targeted fixes and broader changes." },
  trial_and_error: {
    title: "Trial and error",
    text: "Resubmitting or flipping back and forth without the results changing. Next time, read one failing test and decide what should change before you edit.",
  },
  too_short: { title: "Too short to read", text: "One change isn't enough to see a pattern yet." },
  single: { title: "One submission", text: "Submit again after a change and the journey appears here." },
};

export const SELF_REPORT_COPY: Record<SelfReport, { title: string; text: string }> = {
  systematic: { title: "Systematic", text: "I tested one idea at a time" },
  mixed: { title: "Mixed", text: "Some targeted, some guessing" },
  random: { title: "Trial and error", text: "I changed things to see what happens" },
};

export const AGREEMENT_COPY: Record<Agreement, string> = {
  agrees: "Your read matches the data.",
  close: "Close: the data reads one step different.",
  differs: "The data tells a different story.",
};

export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function percent(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : "–";
}
