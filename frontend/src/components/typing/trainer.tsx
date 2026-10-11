"use client";

import { MousePointerClick } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from "react";
import type { TypingDrill, TypingRunInput } from "@/lib/types";
import { cx } from "../ui/cx";
import { Kbd } from "../ui/states";

/** Must match the server's SYNTAX_CHARS (backend/codequest/typing_drills.py). */
export const SYNTAX_CHARS = new Set([":", "(", ")", "[", "]", "{", "}", "'", '"', "=", ","]);

interface RunState {
  pos: number;
  typed: number;
  errors: Record<string, number>;
  syntaxErrors: number;
  startedAt: number | null;
  finishedAt: number | null;
  lastWrongAt: number;
}

type Action = { type: "key"; key: string; now: number } | { type: "reset" };

/** In auto-indent mode the caret jumps over a line's leading spaces: Python indentation is typed for you. */
function skipIndent(code: string, pos: number, autoIndent: boolean): number {
  if (!autoIndent || (pos > 0 && code[pos - 1] !== "\n")) return pos;
  while (pos < code.length && code[pos] === " ") pos += 1;
  return pos;
}

function initial(code: string, autoIndent: boolean): RunState {
  return { pos: skipIndent(code, 0, autoIndent), typed: 0, errors: {}, syntaxErrors: 0, startedAt: null, finishedAt: null, lastWrongAt: 0 };
}

function makeReducer(code: string, autoIndent: boolean) {
  return function reduce(state: RunState, action: Action): RunState {
    if (action.type === "reset") return initial(code, autoIndent);
    if (state.finishedAt !== null || state.pos >= code.length) return state;
    const startedAt = state.startedAt ?? action.now;
    const expected = code[state.pos];

    // Tab types a full 4-space indent when the next four characters are exactly that.
    if (action.key === "\t" && !autoIndent && code.startsWith("    ", state.pos)) {
      const pos = state.pos + 4;
      return { ...state, pos, typed: state.typed + 4, startedAt, finishedAt: pos >= code.length ? action.now : null };
    }
    if (action.key === expected) {
      const pos = skipIndent(code, state.pos + 1, autoIndent && expected === "\n");
      return { ...state, pos, typed: state.typed + 1, startedAt, finishedAt: pos >= code.length ? action.now : null };
    }
    // Accuracy first: a wrong key never moves the caret. It's counted against the character you missed.
    return {
      ...state,
      startedAt,
      errors: { ...state.errors, [expected]: (state.errors[expected] ?? 0) + 1 },
      syntaxErrors: state.syntaxErrors + (SYNTAX_CHARS.has(expected) ? 1 : 0),
      lastWrongAt: action.now,
    };
  };
}

export interface LiveStats {
  elapsedMs: number;
  wpm: number;
  accuracy: number;
}

export function liveStats(typed: number, errors: number, elapsedMs: number): LiveStats {
  const minutes = elapsedMs / 60_000;
  return {
    elapsedMs,
    wpm: minutes > 0 ? typed / 5 / minutes : 0,
    accuracy: typed + errors > 0 ? typed / (typed + errors) : 1,
  };
}

interface Props {
  drill: TypingDrill;
  autoIndent: boolean;
  /** Personal pace caret in characters per minute; null hides it. */
  paceCpm: number | null;
  onFinish: (run: TypingRunInput, errors: Record<string, number>) => void;
  onNext?: () => void;
}

export function Trainer({ drill, autoIndent, paceCpm, onFinish, onNext }: Props) {
  const code = drill.code;
  const reduceMotion = useReducedMotion();
  const reducer = useMemo(() => makeReducer(code, autoIndent), [code, autoIndent]);
  const [state, dispatch] = useReducer(reducer, undefined, () => initial(code, autoIndent));
  const [now, setNow] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reported = useRef(false);

  // Character positions that have to be typed (indentation is excluded in auto-indent mode).
  const typable = useMemo(() => {
    const out: number[] = [];
    let pos = skipIndent(code, 0, autoIndent);
    while (pos < code.length) {
      out.push(pos);
      pos = skipIndent(code, pos + 1, autoIndent && code[pos] === "\n");
    }
    return out;
  }, [code, autoIndent]);

  const running = state.startedAt !== null && state.finishedAt === null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (state.finishedAt === null || state.startedAt === null || reported.current) return;
    reported.current = true;
    const errors = state.errors;
    onFinish(
      {
        snippet_id: drill.id,
        auto_indent: autoIndent,
        duration_ms: Math.max(1000, Math.round(state.finishedAt - state.startedAt)),
        errors,
        syntax_errors: state.syntaxErrors,
      },
      errors,
    );
  }, [state.finishedAt, state.startedAt, state.errors, state.syntaxErrors, drill.id, autoIndent, onFinish]);

  const focus = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    focus();
  }, [focus]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
    if (e.key === "Escape") {
      e.preventDefault();
      reported.current = false;
      dispatch({ type: "reset" });
      return;
    }
    if (state.finishedAt !== null) {
      if (e.key === "Enter" && onNext) {
        e.preventDefault();
        onNext();
      }
      return;
    }
    const key = e.key === "Enter" ? "\n" : e.key === "Tab" ? "\t" : e.key.length === 1 ? e.key : null;
    if (key === null) return; // Shift, arrows, Backspace (nothing to delete: wrong keys never advance)
    e.preventDefault();
    const t = Date.now();
    setNow(t);
    dispatch({ type: "key", key, now: t });
  }

  const elapsed = state.startedAt === null ? 0 : (state.finishedAt ?? now) - state.startedAt;
  const errorCount = Object.values(state.errors).reduce((a, b) => a + b, 0);
  const stats = liveStats(state.typed, errorCount, Math.max(0, elapsed));
  const ghostPos =
    paceCpm && running ? typable[Math.min(typable.length - 1, Math.floor((elapsed / 60_000) * paceCpm))] ?? code.length : null;
  const wrong = now - state.lastWrongAt < 220 && state.lastWrongAt > 0;
  const progress = typable.length ? Math.min(1, state.typed / typable.length) : 0;
  const caretTransition = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 900, damping: 50, mass: 0.4 };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" aria-live="off">
        <Stat label="WPM" value={state.startedAt ? Math.round(stats.wpm).toString() : "–"} strong />
        <Stat label="Accuracy" value={state.startedAt ? `${Math.round(stats.accuracy * 100)}%` : "–"} />
        <Stat label="Time" value={`${(stats.elapsedMs / 1000).toFixed(1)}s`} />
        <Stat label="Mistakes" value={String(errorCount)} />
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-text-3 sm:inline-flex">
          <Kbd>Esc</Kbd> restart
        </span>
      </div>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-fill-2" aria-hidden>
        <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${progress * 100}%` }} transition={{ duration: reduceMotion ? 0 : 0.15 }} />
      </div>

      <div
        role="application"
        aria-label={`Typing drill: ${drill.title}. Type the code shown.`}
        onMouseDown={(e) => {
          e.preventDefault();
          focus();
        }}
        className={cx(
          "relative cursor-text rounded-lc bg-bg-ws p-4 ring-1 transition-shadow sm:p-5",
          focused ? "ring-line-strong" : "ring-line",
          wrong && "ring-red/60",
        )}
      >
        <textarea
          ref={inputRef}
          aria-label="Type here"
          value=""
          onChange={() => {}}
          onKeyDown={onKeyDown}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="absolute left-0 top-0 size-px resize-none opacity-0"
        />
        <CodeView code={code} pos={state.pos} ghostPos={ghostPos} autoIndent={autoIndent} wrong={wrong} caretTransition={caretTransition} />
        {!focused && state.finishedAt === null && (
          <div className="absolute inset-0 grid place-items-center rounded-lc bg-bg-ws/80 backdrop-blur-[2px]">
            <p className="inline-flex items-center gap-2 text-sm text-text-1">
              <MousePointerClick size={16} aria-hidden /> Click here to {state.startedAt ? "continue" : "start typing"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cx("font-semibold tabular-nums", strong ? "text-xl text-brand" : "text-base text-text-1")}>{value}</span>
      <span className="text-xs text-text-3">{label}</span>
    </span>
  );
}

interface CodeViewProps {
  code: string;
  pos: number;
  ghostPos: number | null;
  autoIndent: boolean;
  wrong: boolean;
  caretTransition: object;
}

/** The snippet, one span per character: typed, current (with the caret) and still to type. */
const CodeView = memo(function CodeView({ code, pos, ghostPos, autoIndent, wrong, caretTransition }: CodeViewProps) {
  const chars = useMemo(() => {
    const out: { ch: string; indent: boolean }[] = [];
    let lineStart = true;
    for (const ch of code) {
      out.push({ ch, indent: lineStart && ch === " " });
      if (ch === "\n") lineStart = true;
      else if (ch !== " ") lineStart = false;
    }
    return out;
  }, [code]);

  return (
    <pre className="relative whitespace-pre-wrap break-all font-mono text-[15px] leading-7 sm:text-base" aria-hidden>
      {chars.map(({ ch, indent }, i) => {
        const done = i < pos;
        const current = i === pos;
        const autoSkipped = autoIndent && indent;
        return (
          <span
            key={i}
            className={cx(
              "relative",
              done ? "text-text-1" : autoSkipped ? "text-transparent" : SYNTAX_CHARS.has(ch) ? "text-medium/70" : "text-text-3/70",
              current && wrong && "rounded-[2px] bg-red/30 text-red",
            )}
          >
            {current && (
              <motion.span
                layoutId="cq-caret"
                transition={caretTransition}
                className={cx("absolute bottom-1 left-0 top-1 w-[2px] rounded-full", wrong ? "bg-red" : "bg-brand", "animate-pulse")}
              />
            )}
            {ghostPos === i && !current && (
              <motion.span layoutId="cq-ghost" transition={caretTransition} className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full bg-blue/60" />
            )}
            {ch === "\n" ? (
              <>
                <span className={cx("select-none", done ? "text-text-3/40" : "text-text-3/50")}>↵</span>
                {"\n"}
              </>
            ) : !autoIndent && indent && !done ? (
              <span className="text-text-3/30">·</span>
            ) : (
              ch
            )}
          </span>
        );
      })}
      {pos >= code.length && <motion.span layoutId="cq-caret" transition={caretTransition} className="inline-block h-5 w-[2px] translate-y-1 rounded-full bg-green" />}
    </pre>
  );
});
