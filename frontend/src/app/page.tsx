"use client";

import { ArrowRight, Brain, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, startSession } from "@/lib/api";

const PILLARS = [
  { icon: Lock, title: "Hints that never give the answer", text: "Four steps, each more specific, every one machine-checked against the solution." },
  { icon: Brain, title: "Mistake Memory", text: "CodeQuest notices the bugs you keep making and builds your next missions around them." },
  { icon: ShieldCheck, title: "Safe by design", text: "Your code runs in a locked sandbox. Hidden tests stay hidden, always." },
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
      router.push(persona === "priya" ? "/m/class_average" : "/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16">
      <section className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted">
          <Sparkles size={14} aria-hidden /> AI coding mentor &amp; debugging missions
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          The mentor that never gives you the answer
          <span className="text-accent"> and never forgets your mistakes.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Other platforms tell you <em>that</em> you are wrong. CodeQuest shows you <em>where to look</em>,
          explains <em>why</em> in plain language, and turns your repeated bugs into your next missions.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => begin("priya")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {busy === "priya" ? "Loading Priya's quest…" : "Try the demo as Priya"} <ArrowRight size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => begin("guest")}
            disabled={busy !== null}
            className="rounded-xl border border-line px-5 py-3 font-medium transition hover:bg-panel disabled:opacity-60"
          >
            {busy === "guest" ? "Starting…" : "Start my own quest"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-line bg-panel p-5">
            <Icon className="text-accent" size={22} aria-hidden />
            <h2 className="mt-3 font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
