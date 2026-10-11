"use client";

import { Binary, Braces, ChevronsRight, GitBranch, Hash, LayoutGrid, ListTree, Repeat, Sigma, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { conceptLabel } from "@/lib/format";
import { cx } from "../ui/cx";

// Each concept gets a steady icon and colour so it is recognisable across the page.
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

/** Concept filter pills; the active one turns solid white. */
export function ConceptPills({ concepts, value, onChange }: Props) {
  const pill = (active: boolean) =>
    cx(
      "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13.5px] ring-1 ring-inset transition-colors",
      active ? "bg-text-1 font-semibold text-bg ring-text-1" : "bg-fill-2/70 text-text-1 ring-line hover:bg-fill-3",
    );
  const row = useRef<HTMLDivElement>(null);
  return (
    <div className="relative">
      <div
        ref={row}
        className="flex gap-2 overflow-x-auto pr-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by concept"
      >
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
      {/* A fade plus a scroll button at the end of the row */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-end bg-linear-to-l from-bg via-bg/90 to-transparent">
        <button
          type="button"
          onClick={() => row.current?.scrollBy({ left: 320, behavior: "smooth" })}
          className="pointer-events-auto grid size-8 place-items-center rounded-full bg-fill-2 text-text-2 ring-1 ring-line hover:bg-fill-3 hover:text-text-1"
          aria-label="Show more concepts"
        >
          <ChevronsRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
