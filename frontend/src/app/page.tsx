"use client";

import { ArrowRight, BadgeCheck, Brain, Keyboard, Map as MapIcon, Puzzle, ShieldCheck, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DebugMoment } from "@/components/landing/debug-moment";
import { LogoMark, Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ApiError, startSession } from "@/lib/api";

const STEPS = [
  {
    title: "Write it",
    text: "Solve a Python mission in a real editor. You see the examples; hidden tests check the rest.",
  },
  {
    title: "See why it failed",
    text: "Every test gets a verdict (wrong output, crash or timeout) and a plain-language reason that points at your code.",
  },
  {
    title: "Climb the hint ladder",
    text: "Four hints, each more specific than the last. Every one is checked against the solution, so none of them gives it away.",
  },
  {
    title: "Beat your patterns",
    text: "Mistake Memory notices the bugs you repeat and builds your next missions, even a debugging mission, around them.",
  },
];

const EXTRAS = [
  { icon: MapIcon, tone: "text-blue", title: "Personal roadmap", text: "A week-by-week plan from your goal, your hours and your real mistakes." },
  { icon: Brain, tone: "text-brand", title: "Predict before you run", text: "Say what your code returns before the judge does. Tracing beats guessing." },
  { icon: Keyboard, tone: "text-cyan", title: "Syntax Warm-up", text: "Typing drills of real Python, accuracy first, picked from your weak spots." },
  { icon: Swords, tone: "text-red", title: "Sandbox Arena", text: "Launch real attacks at the sandbox and watch every one get contained." },
  { icon: Puzzle, tone: "text-green", title: "LeetCode Companion", text: "The same mentor in a side panel on LeetCode, feeding the same memory." },
  { icon: BadgeCheck, tone: "text-purple", title: "Verified portfolio", text: "Skills proven by hidden tests, next to your LeetCode and Codeforces stats." },
];

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

  const ctas = (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
      <Button variant="primary" size="lg" onClick={() => begin("priya")} disabled={busy !== null} loading={busy === "priya"}>
        {busy === "priya" ? "Loading Priya's quest…" : "Try the demo as Priya"} {busy !== "priya" && <ArrowRight size={18} aria-hidden />}
      </Button>
      <Button size="lg" onClick={() => begin("guest")} disabled={busy !== null} loading={busy === "guest"}>
        {busy === "guest" ? "Starting…" : "Start my own quest"}
      </Button>
    </div>
  );

  return (
    <div className="cq-night min-h-screen overflow-x-clip">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-5 sm:px-8">
        <LogoMark size={28} />
        <Wordmark />
        <a href="#how" className="ml-auto rounded-full px-3 py-1.5 text-sm text-text-2 transition-colors hover:bg-white/[0.05] hover:text-text-1">
          How it works
        </a>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-28 lg:pt-16">
          <div>
            <h1
              className="font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] text-text-1 sm:text-[60px] xl:text-[68px]"
              style={{ fontStretch: "88%" }}
            >
              The mentor that never gives you the answer, and never forgets your mistakes.
            </h1>
            <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-text-2">
              Most judges only tell you that you&apos;re wrong. CodeQuest shows you where to look, explains why in plain language, and
              turns the bugs you keep making into your next missions.
            </p>
            <div className="mt-8">{ctas}</div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-red">
                {error}
              </p>
            )}
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-3">
              <li className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-green" aria-hidden /> Code runs in a locked sandbox
              </li>
              <li className="flex items-center gap-1.5">
                <BadgeCheck size={15} className="text-blue" aria-hidden /> Hints are leak-checked
              </li>
              <li className="flex items-center gap-1.5">
                <Brain size={15} className="text-brand" aria-hidden /> Works with or without AI
              </li>
            </ul>
          </div>
          <DebugMoment />
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-8 border-t border-line/70 bg-bg-ws/60">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 id="how-title" className="max-w-xl font-display text-3xl font-bold tracking-[-0.025em] text-text-1 sm:text-[40px] sm:leading-[1.05]">
              How a mission works
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-text-2">
              The loop every mission follows, from your first submission to the next mission it shapes.
            </p>
            <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
              <span className="absolute left-[19px] top-10 bottom-4 w-px bg-linear-to-b from-brand/60 via-line-strong to-transparent md:left-5 md:right-0 md:top-5 md:bottom-auto md:h-px md:w-auto md:bg-linear-to-r" aria-hidden />
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-4 md:block">
                  <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-bg-ws font-display text-[15px] font-bold text-brand ring-1 ring-brand/40">
                    {i + 1}
                  </span>
                  <div className="md:mt-5 md:pr-4">
                    <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-text-1">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-2">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="extras-title" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 id="extras-title" className="max-w-xl font-display text-3xl font-bold tracking-[-0.025em] text-text-1 sm:text-[40px] sm:leading-[1.05]">
            Around the missions
          </h2>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-lc-lg bg-line/70 ring-1 ring-line/70 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRAS.map(({ icon: Icon, tone, title, text }) => (
              <li key={title} className="bg-bg p-6">
                <Icon size={22} className={tone} aria-hidden />
                <h3 className="mt-4 font-display text-[17px] font-semibold text-text-1">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-2">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="cq-lamp flex flex-col items-start gap-6 rounded-lc-lg p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-text-1 sm:text-3xl">Start with a real mistake</h2>
              <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-text-2">
                Priya&apos;s demo quest is already under way, so Mistake Memory and her roadmap have something to show. Or start fresh
                with a plan built around you.
              </p>
            </div>
            {ctas}
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-8 text-[13px] text-text-3 sm:px-8">
          <LogoMark size={20} />
          <span>CodeQuest AI, a coding mentor for Python learners.</span>
        </div>
      </footer>
    </div>
  );
}
