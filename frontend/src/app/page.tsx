"use client";

import { ArrowRight, Brain, CheckCircle2, Lock, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ApiError, startSession } from "@/lib/api";

const PILLARS = [
  { icon: Lock, tone: "text-medium bg-medium/15", title: "Hints that never give the answer", text: "Four steps, each more specific, every one machine-checked against the solution." },
  { icon: Brain, tone: "text-brand bg-brand/15", title: "Mistake Memory", text: "CodeQuest notices the bugs you keep making and builds your next missions around them." },
  { icon: ShieldCheck, tone: "text-green bg-green/15", title: "Safe by design", text: "Your code runs in a locked sandbox. Hidden tests stay hidden, always." },
];

const DEMO_TESTS = [
  { label: "Case 1", ok: true },
  { label: "Case 2", ok: true },
  { label: "Case 3", ok: false },
];

/** A static, animated preview of the Test Result panel. */
function HeroPreview() {
  const reduce = useReducedMotion();
  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.3 + i * 0.15, duration: 0.3 },
  });
  return (
    <div className="overflow-hidden rounded-lc bg-panel shadow-menu ring-1 ring-line" aria-hidden>
      <div className="flex h-9 items-center gap-2 bg-panel-header px-3 text-sm">
        <span className="font-medium text-text-1">Test Result</span>
        <span className="ml-auto flex gap-1.5">
          <span className="size-2.5 rounded-full bg-fill-3" />
          <span className="size-2.5 rounded-full bg-fill-3" />
          <span className="size-2.5 rounded-full bg-fill-3" />
        </span>
      </div>
      <div className="space-y-4 p-5">
        <motion.div {...item(0)} className="flex items-baseline gap-3">
          <span className="text-xl font-semibold text-medium">Runtime Error</span>
          <span className="text-sm text-text-3">9 / 10 testcases passed</span>
        </motion.div>
        <motion.div {...item(1)} className="flex gap-2">
          {DEMO_TESTS.map((t, i) => (
            <span key={t.label} className={`inline-flex h-8 items-center gap-1.5 rounded-lc px-3 text-sm ${i === 2 ? "bg-fill-3 text-text-1" : "text-text-2"}`}>
              <span className={`size-1.5 rounded-full ${t.ok ? "bg-green" : "bg-medium"}`} />
              {t.label}
            </span>
          ))}
        </motion.div>
        <motion.div {...item(2)} className="space-y-1.5">
          <p className="text-xs font-medium text-text-3">Input</p>
          <div className="rounded-lc bg-fill-2 px-3 py-2 font-mono text-[13px] text-text-1">class_average([])</div>
        </motion.div>
        <motion.div {...item(3)} className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-3">Error</p>
            <div className="flex items-center gap-1.5 rounded-lc bg-fill-2 px-3 py-2 font-mono text-[13px] text-red">
              <XCircle size={14} /> ZeroDivisionError
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-text-3">Expected</p>
            <div className="flex items-center gap-1.5 rounded-lc bg-fill-2 px-3 py-2 font-mono text-[13px] text-text-1">
              <CheckCircle2 size={14} className="text-green" /> 0.0
            </div>
          </div>
        </motion.div>
        <motion.p {...item(4)} className="rounded-lc border-l-2 border-brand bg-brand/5 px-3 py-2 text-sm leading-relaxed text-text-1">
          An empty class has no scores, so dividing by its length divides by zero. What should the average of nothing be?
        </motion.p>
        <motion.div {...item(5)} className="flex items-center gap-2 rounded-lc bg-linear-to-br from-brand-bg-2 to-brand-bg px-3 py-2 text-sm">
          <Brain size={16} className="text-brand" />
          <span className="text-text-1">
            Pattern spotted: <strong className="text-brand">Unhandled empty input</strong>. Next mission adapted.
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState<"priya" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function begin(persona: "priya" | "guest") {
    setBusy(persona);
    setError(null);
    try {
      await startSession(persona);
      // New learners answer four questions first so their roadmap is personal from day one.
      router.push(persona === "priya" ? "/m/class_average" : "/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-layer-1">
        <div className="mx-auto flex h-[50px] max-w-6xl items-center gap-2 px-6">
          <LogoMark />
          <span className="text-[17px] font-semibold tracking-tight text-text-1">CodeQuest</span>
          <span className="ml-auto text-sm text-text-2">AI coding mentor</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <section className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-bg-2 px-3 py-1 text-xs font-medium text-brand">
            <Sparkles size={14} aria-hidden /> AI coding mentor &amp; debugging missions
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-text-1 sm:text-5xl xl:text-[56px]">
            The mentor that never gives you the answer <span className="text-brand">and never forgets your mistakes.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-text-2">
            Other platforms tell you <em>that</em> you are wrong. CodeQuest shows you <em>where to look</em>, explains{" "}
            <em>why</em> in plain language, and turns your repeated bugs into your next missions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" className="h-11 px-5 text-[15px]" onClick={() => begin("priya")} disabled={busy !== null} loading={busy === "priya"}>
              {busy === "priya" ? "Loading Priya's quest…" : "Try the demo as Priya"} {busy !== "priya" && <ArrowRight size={18} aria-hidden />}
            </Button>
            <Button className="h-11 px-5 text-[15px]" onClick={() => begin("guest")} disabled={busy !== null} loading={busy === "guest"}>
              {busy === "guest" ? "Starting…" : "Start my own quest"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
        </section>
        <HeroPreview />
      </main>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {PILLARS.map(({ icon: Icon, tone, title, text }) => (
          <div key={title} className="rounded-lc bg-layer-1 p-5 transition-colors hover:bg-hover">
            <span className={`grid size-10 place-items-center rounded-lc ${tone}`}>
              <Icon size={20} aria-hidden />
            </span>
            <h2 className="mt-4 font-medium text-text-1">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-text-2">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
