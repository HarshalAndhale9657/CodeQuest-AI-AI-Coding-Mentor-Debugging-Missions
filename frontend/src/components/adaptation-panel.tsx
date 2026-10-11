"use client";

import { Brain, Bug, ListChecks } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { mistakeLabel } from "@/lib/format";
import type { Adaptation } from "@/lib/types";

export function AdaptationPanel({ adaptation }: { adaptation: Adaptation }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      aria-live="polite"
      className="rounded-xl border border-accent/50 bg-accent/10 p-4"
    >
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-accent" aria-hidden />
        <h2 className="font-medium">Mistake Memory: a pattern spotted</h2>
      </div>
      <p className="mt-1 text-sm">
        You have now made the same kind of mistake in more than one mission:{" "}
        <strong>{adaptation.recurring.map(mistakeLabel).join(", ")}</strong>. CodeQuest changed your path to help you beat it.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {adaptation.debug_mission && (
          <Link
            href={`/m/${adaptation.debug_mission.id}`}
            className="flex items-start gap-2 rounded-lg bg-panel p-3 text-sm transition hover:bg-panel-2"
          >
            <Bug size={16} className="mt-0.5 text-wrong" aria-hidden />
            <span>
              <span className="block text-xs text-muted">New debugging mission</span>
              {adaptation.debug_mission.title}
            </span>
          </Link>
        )}
        {adaptation.next_up[0] && (
          <Link
            href={`/m/${adaptation.next_up[0].challenge_id}`}
            className="flex items-start gap-2 rounded-lg bg-panel p-3 text-sm transition hover:bg-panel-2"
          >
            <ListChecks size={16} className="mt-0.5 text-pass" aria-hidden />
            <span>
              <span className="block text-xs text-muted">Your next mission</span>
              {adaptation.next_up[0].title}
              <span className="block text-xs text-muted">{adaptation.next_up[0].reason}</span>
            </span>
          </Link>
        )}
      </div>
      {adaptation.preflight.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {adaptation.preflight.map((p) => (
            <li key={p}>✓ {p}</li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
