"use client";

import { ChevronDown, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { JudgeResult, TestResult, Verdict } from "@/lib/types";
import { VERDICT_LABEL } from "@/lib/format";
import { VerdictBadge } from "./verdict-badge";

const ORDER: Verdict[] = ["passed", "wrong_output", "runtime_error", "timeout"];

export function ResultsBoard({ result }: { result: JudgeResult }) {
  const total = result.tests.length;
  return (
    <section aria-label="Test results" className="space-y-3">
      <div className="rounded-xl border border-line bg-panel p-3">
        <p className="text-sm font-medium" aria-live="polite">
          {result.summary}
        </p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden>
          {ORDER.map((v) =>
            result.counts[v] ? (
              <div
                key={v}
                style={{ width: `${(result.counts[v] / total) * 100}%` }}
                className={{ passed: "bg-pass", wrong_output: "bg-wrong", runtime_error: "bg-error", timeout: "bg-timeout" }[v]}
              />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
          {ORDER.map((v) => (
            <span key={v}>
              {VERDICT_LABEL[v]}: <strong className="text-text">{result.counts[v]}</strong>
            </span>
          ))}
        </div>
      </div>

      {result.syntax_error && (
        <div role="alert" className="rounded-xl border border-error/40 bg-error/10 p-3 text-sm">
          {result.syntax_error.explanation}
        </div>
      )}

      <ol className="space-y-2">
        {result.tests.map((test, i) => (
          <motion.li
            key={test.test_id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
          >
            <TestCard test={test} />
          </motion.li>
        ))}
      </ol>

      {result.notes.length > 0 && !result.all_passed && (
        <div className="rounded-xl border border-line bg-panel p-3 text-sm">
          <p className="mb-1 font-medium">Things worth checking in your code</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {result.notes.map((n) => (
              <li key={`${n.key}-${n.line}`}>
                Line {n.line}: {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TestCard({ test }: { test: TestResult }) {
  const [open, setOpen] = useState(test.status !== "passed" && test.visibility === "visible");
  const hidden = test.visibility === "hidden";
  return (
    <div className="rounded-xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="w-16 shrink-0 text-xs text-muted">
          {hidden ? (
            <span className="inline-flex items-center gap-1">
              <Lock size={12} aria-hidden /> Hidden
            </span>
          ) : (
            `Test ${test.index}`
          )}
        </span>
        <VerdictBadge verdict={test.status} />
        <span className="truncate text-xs text-muted">{test.category}</span>
        <ChevronDown size={16} className={`ml-auto shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line px-3 py-3 text-sm">
          {test.visibility === "visible" ? (
            <>
              <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                <dt className="text-muted">Input</dt>
                <dd className="break-all">{test.input}</dd>
                <dt className="text-muted">Expected</dt>
                <dd className="break-all text-pass">{test.expected}</dd>
                {test.actual !== null && (
                  <>
                    <dt className="text-muted">Got</dt>
                    <dd className={`break-all ${test.status === "passed" ? "text-pass" : "text-wrong"}`}>{test.actual}</dd>
                  </>
                )}
                {test.exception_type && (
                  <>
                    <dt className="text-muted">Error</dt>
                    <dd className="break-all text-error">
                      {test.exception_type}
                      {test.raw_message ? `: ${test.raw_message}` : ""}
                      {test.line ? ` (line ${test.line})` : ""}
                    </dd>
                  </>
                )}
              </dl>
              {Object.keys(test.locals).length > 0 && (
                <div className="rounded-lg bg-panel-2 p-2 font-mono text-xs">
                  <p className="mb-1 font-sans text-muted">Variables at the crash</p>
                  {Object.entries(test.locals).map(([k, v]) => (
                    <div key={k}>
                      {k} = <span className="text-accent">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {test.stdout && (
                <pre className="max-h-32 overflow-auto rounded-lg bg-panel-2 p-2 text-xs text-muted">{test.stdout}</pre>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">
              Hidden tests check that your code works in general, so their data is never shown, not even to the AI.
            </p>
          )}
          {test.explanation && <p className="leading-relaxed">{test.explanation}</p>}
        </div>
      )}
    </div>
  );
}
