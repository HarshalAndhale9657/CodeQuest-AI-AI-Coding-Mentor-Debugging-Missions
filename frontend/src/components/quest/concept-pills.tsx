"use client";

import { Binary, Braces, GitBranch, Hash, LayoutGrid, ListTree, Repeat, Sigma, type LucideIcon } from "lucide-react";
import { conceptLabel } from "@/lib/format";
import { cx } from "../ui/cx";

// LeetCode colours its topic icons (Algorithms orange, Database blue, Shell green, Concurrency purple, JS cyan).
const ICONS: LucideIcon[] = [Braces, Repeat, ListTree, Hash, GitBranch, Binary, Sigma];
const TONES = ["text-brand", "text-blue", "text-green", "text-purple", "text-cyan", "text-medium", "text-easy"];

export function conceptIcon(index: number): { Icon: LucideIcon; tone: string } {
  return { Icon: ICONS[index % ICONS.length], tone: TONES[index % TONES.length] };
}

interface Props {
  concepts: string[];
  value: string | null;
  onChange: (concept: string | null) => void;
}

/** Topic pills row ("All Topics", "Algorithms", ...). Active pill is white like LeetCode's. */
export function ConceptPills({ concepts, value, onChange }: Props) {
  const pill = (active: boolean) =>
    cx(
      "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors",
      active ? "bg-text-1 font-medium text-bg" : "bg-fill-2 text-text-1 hover:bg-fill-3",
    );
  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Filter by concept">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={pill(value === null)}>
          <LayoutGrid size={16} aria-hidden /> All Concepts
        </button>
        {concepts.map((c, i) => {
          const { Icon, tone } = conceptIcon(i);
          const active = value === c;
          return (
            <button key={c} type="button" aria-pressed={active} onClick={() => onChange(active ? null : c)} className={pill(active)}>
              <Icon size={16} className={active ? "" : tone} aria-hidden /> {conceptLabel(c)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
