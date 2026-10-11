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
      className="rounded-lc bg-linear-to-br from-brand-bg-2 to-brand-bg p-4"
    >
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-brand" aria-hidden />
        <h2 className="text-sm font-semibold text-brand">Mistake Memory: a pattern spotted</h2>
      </div>
      <p className="mt-1.5 text-sm text-text-1">
        You have now made the same kind of mistake in more than one mission:{" "}
        <strong>{adaptation.recurring.map(mistakeLabel).join(", ")}</strong>. CodeQuest changed your path to help you beat it.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {adaptation.debug_mission && (
          <Link
            href={`/m/${adaptation.debug_mission.id}`}
            className="flex items-start gap-2 rounded-lc-sm bg-black/25 p-3 text-sm text-text-1 transition-colors hover:bg-black/35"
          >
            <Bug size={16} className="mt-0.5 text-medium" aria-hidden />
            <span>
              <span className="block text-xs text-text-2">New debugging mission</span>
              {adaptation.debug_mission.title}
            </span>
          </Link>
        )}
        {adaptation.next_up[0] && (
          <Link
            href={`/m/${adaptation.next_up[0].challenge_id}`}
            className="flex items-start gap-2 rounded-lc-sm bg-black/25 p-3 text-sm text-text-1 transition-colors hover:bg-black/35"
          >
            <ListChecks size={16} className="mt-0.5 text-green" aria-hidden />
            <span>
              <span className="block text-xs text-text-2">Your next mission</span>
              {adaptation.next_up[0].title}
              <span className="block text-xs text-text-2">{adaptation.next_up[0].reason}</span>
            </span>
          </Link>
        )}
      </div>
      {adaptation.preflight.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-text-2">
          {adaptation.preflight.map((p) => (
            <li key={p}>✓ {p}</li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
