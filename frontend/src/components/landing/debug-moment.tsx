"use client";

import { Brain, Lightbulb } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "../ui/cx";

/* LeetCode's editor colours (VS Code Dark+), as in the Monaco theme. */
const K = ({ children }: { children: ReactNode }) => <span className="text-[#c586c0]">{children}</span>;
const F = ({ children }: { children: ReactNode }) => <span className="text-[#dcdcaa]">{children}</span>;
const B = ({ children }: { children: ReactNode }) => <span className="text-[#dcdcaa]">{children}</span>;
const N = ({ children }: { children: ReactNode }) => <span className="text-[#b5cea8]">{children}</span>;
const C = ({ children }: { children: ReactNode }) => <span className="text-[#6a9955]">{children}</span>;

const LINES: ReactNode[] = [
  <>
    <K>def</K> <F>class_average</F>(scores):
  </>,
  <>
    {"    "}
    <C># -1 means the student was absent</C>
  </>,
  <>
    {"    "}real = [s <K>for</K> s <K>in</K> scores <K>if</K> s != -<N>1</N>]
  </>,
  <>
    {"    "}
    <K>return</K> <B>sum</B>(real) / <B>len</B>(real)
  </>,
];

const CRASH_LINE = 4;
const HINT_LINES = [3, 4];

// One orchestrated sequence: submit, verdict, the crash line, the reason, a hint, then Mistake Memory adapts.
const AT = { verdict: 0.9, crash: 1.5, reason: 2.1, hint: 2.9, memory: 3.7 };

const TESTS = Array.from({ length: 10 }, (_, i) => i !== 6);

/** The landing hero: one failing submission, explained the CodeQuest way. Decorative; the copy beside it says the same. */
export function DebugMoment() {
  const reduce = useReducedMotion();
  const show = (delay: number, y = 6) =>
    reduce
      ? { initial: false as const }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } };
  const fadeIn = (delay: number) =>
    reduce ? { initial: false as const } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.5 } };

  return (
    <div className="cq-lamp relative overflow-hidden rounded-lc-lg" aria-hidden>
      {/* file tab */}
      <div className="flex h-11 items-center gap-3 border-b border-white/[0.06] px-4 text-[13px]">
        <span className="font-mono text-text-1">class_average.py</span>
        <span className="text-text-3">Python 3</span>
        <motion.span
          {...(reduce
            ? { initial: false as const }
            : {
                initial: { scale: 1 },
                animate: { scale: [1, 0.94, 1] },
                transition: { delay: AT.verdict - 0.35, duration: 0.35 },
              })}
          className="ml-auto inline-flex h-7 items-center rounded-full bg-green px-3 text-xs font-semibold text-bg-ws"
        >
          Submit
        </motion.span>
      </div>

      {/* code */}
      <div className="relative overflow-x-auto py-3 font-mono text-[12.5px] leading-[26px] [scrollbar-width:none] sm:text-[13.5px]">
        {LINES.map((line, i) => {
          const n = i + 1;
          const hinted = HINT_LINES.includes(n);
          return (
            <div key={n} className="relative flex min-w-max">
              {n === CRASH_LINE && (
                <motion.span {...fadeIn(AT.crash)} className="absolute inset-0 bg-red/[0.13]" />
              )}
              {hinted && (
                <motion.span {...fadeIn(AT.hint)} className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
              )}
              <span className="relative w-11 shrink-0 select-none pr-4 text-right text-gutter">{n}</span>
              <span className="relative whitespace-pre text-[#d4d4d4]">{line}</span>
              {n === CRASH_LINE && (
                <motion.span
                  {...show(AT.crash, 4)}
                  className="relative ml-auto mr-4 hidden self-center rounded-md bg-red/15 px-2 py-0.5 font-sans text-[11px] font-semibold leading-4 text-red ring-1 ring-red/30 sm:block"
                >
                  ZeroDivisionError
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      {/* result */}
      <div className="space-y-3 border-t border-white/[0.06] bg-black/20 p-4 sm:p-5">
        <motion.div {...show(AT.verdict)} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-display text-xl font-bold tracking-[-0.01em] text-medium">Runtime error</span>
          <span className="text-[13px] text-text-2">9 of 10 tests passed</span>
          <span className="ml-auto flex items-center gap-1">
            {TESTS.map((ok, i) => (
              <motion.span
                key={i}
                {...(reduce
                  ? { initial: false as const }
                  : { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, transition: { delay: AT.verdict + i * 0.04, duration: 0.25 } })}
                className={cx("size-2.5 rounded-[3px]", ok ? "bg-green" : "bg-medium")}
              />
            ))}
          </span>
        </motion.div>

        <motion.p {...show(AT.reason)} className="rounded-lc-sm bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text-1">
          <span className="font-mono text-[12.5px] text-text-2">class_average([])</span> crashed on line 4. With no real scores,{" "}
          <span className="font-mono text-[12.5px]">len(real)</span> is 0, and dividing by zero is undefined. What should the average of
          nothing be?
        </motion.p>

        <motion.div {...show(AT.hint)} className="flex items-start gap-2.5 text-[13px]">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-medium text-[11px] font-bold text-bg-ws">2</span>
          <span className="text-text-2">
            <span className="font-semibold text-medium">Hint 2 of 4.</span> Look at lines 3–4: handle the case where{" "}
            <span className="font-mono text-[12px] text-text-1">real</span> ends up empty.
          </span>
          <Lightbulb size={15} className="ml-auto mt-0.5 shrink-0 text-medium" />
        </motion.div>

        <motion.div
          {...(reduce
            ? { initial: false as const }
            : {
                initial: { opacity: 0, scale: 0.96 },
                animate: { opacity: 1, scale: 1 },
                transition: { delay: AT.memory, type: "spring", stiffness: 260, damping: 20 },
              })}
          className="flex items-center gap-3 rounded-lc-sm bg-brand/[0.12] px-3.5 py-2.5 ring-1 ring-inset ring-brand/30"
        >
          <Brain size={18} className="shrink-0 text-brand" />
          <span className="text-[13px] leading-snug text-text-1">
            <span className="font-semibold text-brand">Mistake Memory:</span> unhandled empty input, now in 2 missions. Your next
            mission is built around it.
          </span>
        </motion.div>
      </div>
    </div>
  );
}
