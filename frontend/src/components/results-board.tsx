"use client";

import { Lock } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { VERDICT_BG, VERDICT_LABEL, VERDICT_TEXT } from "@/lib/format";
import type { HiddenTestResult, JudgeResult, Verdict, VisibleTestResult } from "@/lib/types";
import { cx } from "./ui/cx";

const HEADLINE: Record<Verdict, string> = {
  passed: "Accepted",
  wrong_output: "Wrong Output",
  runtime_error: "Runtime Error",
  timeout: "Time Limit Exceeded",
};

function Field({ label, children, tone }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-text-3">{label}</p>
      <div className={cx("whitespace-pre-wrap break-all rounded-lc-sm bg-fill-2 px-3 py-2 font-mono text-[13px] text-text-1", tone)}>{children}</div>
    </div>
  );
}

function VisibleCase({ test }: { test: VisibleTestResult }) {
  return (
    <div className="space-y-3">
      <Field label="Input">{test.input}</Field>
      {test.actual !== null && (
        <Field label="Output" tone={test.status === "passed" ? undefined : VERDICT_TEXT[test.status]}>
          {test.actual}
        </Field>
      )}
      <Field label="Expected">{test.expected}</Field>
      {test.exception_type && (
        <Field label="Error" tone="text-red">
          {test.exception_type}
          {test.raw_message ? `: ${test.raw_message}` : ""}
          {test.line ? ` (line ${test.line})` : ""}
        </Field>
      )}
      {Object.keys(test.locals).length > 0 && (
        <Field label="Variables at the crash">
          {Object.entries(test.locals).map(([k, v]) => (
            <div key={k}>
              {k} = <span className="text-brand">{v}</span>
            </div>
          ))}
        </Field>
      )}
      {test.stdout && <Field label="Stdout">{test.stdout}</Field>}
      {test.explanation && (
        <p className="rounded-r-lc-sm border-l-2 border-brand bg-brand/[0.06] px-3.5 py-2.5 text-sm leading-relaxed text-text-1">{test.explanation}</p>
      )}
    </div>
  );
}

function HiddenGrid({ tests }: { tests: HiddenTestResult[] }) {
  // `index` counts visible tests too; learners should see "Hidden 2", not "Hidden 6".
  const numbered = tests.map((t, i) => ({ ...t, n: i + 1 }));
  const failing = numbered.filter((t) => t.status !== "passed");
  return (
    <section aria-label="Hidden tests" className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-text-3">
        <Lock size={12} aria-hidden /> Hidden tests · {tests.length - failing.length}/{tests.length} passed
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {numbered.map((t) => (
          <li key={t.test_id}>
            <span
              className={cx("block size-3.5 rounded-[3px]", VERDICT_BG[t.status])}
              title={`Hidden test ${t.n}: ${VERDICT_LABEL[t.status]}`}
              aria-label={`Hidden test ${t.n}: ${VERDICT_LABEL[t.status]}`}
              role="img"
            />
          </li>
        ))}
      </ul>
      {failing.length > 0 && (
        <ul className="space-y-1.5">
          {failing.map((t) => (
            <li key={t.test_id} className="rounded-lc-sm bg-fill-2 px-3 py-2 text-sm">
              <span className={cx("text-xs font-medium", VERDICT_TEXT[t.status])}>
                Hidden {t.n} · {t.category}
              </span>
              {t.explanation && <p className="mt-0.5 leading-relaxed text-text-2">{t.explanation}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-text-3">Hidden test data is never shown, not even to the AI.</p>
    </section>
  );
}

/** LeetCode-style Test Result: verdict headline, case tabs for visible tests, a dot grid for hidden ones. */
export function ResultsBoard({ result, children }: { result: JudgeResult; children?: React.ReactNode }) {
  const visible = result.tests.filter((t): t is VisibleTestResult => t.visibility === "visible");
  const hidden = result.tests.filter((t): t is HiddenTestResult => t.visibility === "hidden");
  const firstFail = result.tests.find((t) => t.status !== "passed");
  const headline: Verdict = result.all_passed ? "passed" : (firstFail?.status ?? "wrong_output");
  const passed = result.counts.passed;
  const [selected, setSelected] = useState(() => Math.max(0, visible.findIndex((t) => t.status !== "passed")));
  const current = visible[Math.min(selected, visible.length - 1)];

  return (
    <section aria-label="Test results" className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1" aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className={cx("font-display text-[22px] font-bold tracking-[-0.01em]", result.syntax_error ? "text-red" : VERDICT_TEXT[headline])}>
            {result.syntax_error ? "Syntax Error" : HEADLINE[headline]}
          </h2>
          <span className="text-sm text-text-3">
            {passed} / {result.tests.length} testcases passed
          </span>
        </div>
        <p className="text-sm text-text-2">{result.summary}</p>
      </motion.div>

      {/* e.g. the Mistake Memory adaptation: right under the verdict, above the per-test detail */}
      {children}

      {result.syntax_error && (
        <p role="alert" className="rounded-lc bg-red/10 px-3 py-2 text-sm text-text-1">
          {result.syntax_error.explanation}
        </p>
      )}

      {visible.length > 0 && current && (
        <div className="space-y-3">
          <div role="tablist" aria-label="Visible test cases" className="flex flex-wrap gap-2">
            {visible.map((t, i) => (
              <button
                key={t.test_id}
                type="button"
                role="tab"
                aria-selected={i === selected}
                onClick={() => setSelected(i)}
                className={cx(
                  "inline-flex h-8 items-center gap-1.5 rounded-lc-sm px-3 text-sm transition-colors",
                  i === selected ? "bg-fill-3 text-text-1" : "text-text-2 hover:bg-fill-2",
                )}
              >
                <span className={cx("size-1.5 rounded-full", VERDICT_BG[t.status])} aria-hidden />
                Case {t.index}
                <span className="sr-only">: {VERDICT_LABEL[t.status]}</span>
              </button>
            ))}
          </div>
          <VisibleCase test={current} />
        </div>
      )}

      {hidden.length > 0 && <HiddenGrid tests={hidden} />}

      {result.notes.length > 0 && !result.all_passed && (
        <section aria-label="Things worth checking" className="rounded-lc bg-fill-2 px-3 py-2 text-sm">
          <p className="mb-1 font-medium text-text-1">Things worth checking in your code</p>
          <ul className="list-disc space-y-1 pl-5 text-text-2">
            {result.notes.map((n) => (
              <li key={`${n.key}-${n.line}`}>
                Line {n.line}: {n.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
