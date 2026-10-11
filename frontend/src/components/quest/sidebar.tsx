"use client";

import { Brain, Bug, Compass, Keyboard, Map as MapIcon, Settings, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cx } from "../ui/cx";
import { CountBadge } from "../ui/tag";

function Item({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-10 items-center gap-3 rounded-lc-sm px-3 text-[14.5px] transition-colors",
        active ? "bg-white/[0.07] font-semibold text-text-1" : "text-text-2 hover:bg-white/[0.04] hover:text-text-1",
      )}
    >
      <Icon size={18} className={active ? "text-brand" : undefined} aria-hidden /> {label}
    </Link>
  );
}

interface Props {
  handle?: string;
  recurring: number;
  debugCount: number;
  debugActive: boolean;
  onDebug: () => void;
}

/** Left navigation for the Quest page, plus two shortcuts into the list. */
export function QuestSidebar({ handle, recurring, debugCount, debugActive, onDebug }: Props) {
  return (
    <aside className="hidden lg:block" aria-label="Library">
      <div className="sticky top-[88px] space-y-0.5">
        <Item href="/home" icon={Compass} label="Quest" active />
        <Item href="/roadmap" icon={MapIcon} label="My Roadmap" />
        <Item href="/typing" icon={Keyboard} label="Syntax Warm-up" />
        <Item href="/arena" icon={ShieldCheck} label="Sandbox Arena" />
        <Item href={handle ? `/u/${handle}` : "/profile"} icon={UserRound} label="Profile" />
        <Item href="/settings" icon={Settings} label="Settings" />
        <div className="!my-4 h-px bg-line/70" />
        <p className="px-3 pb-1 text-[13px] font-medium text-text-3">Shortcuts</p>
        <a href="#memory" className="flex h-10 items-center gap-3 rounded-lc-sm px-3 text-sm text-text-1 transition-colors hover:bg-white/[0.04]">
          <span className="grid size-6 place-items-center rounded-lc-sm bg-brand/15">
            <Brain size={14} className="text-brand" aria-hidden />
          </span>
          Mistake Memory
          <span className="ml-auto">
            <CountBadge tone={recurring ? "brand" : "muted"}>{recurring}</CountBadge>
          </span>
        </a>
        <button
          type="button"
          onClick={onDebug}
          aria-pressed={debugActive}
          className={cx(
            "flex h-10 w-full items-center gap-3 rounded-lc-sm px-3 text-sm text-text-1 transition-colors hover:bg-white/[0.04]",
            debugActive && "bg-white/[0.07] font-semibold",
          )}
        >
          <span className="grid size-6 place-items-center rounded-lc-sm bg-medium/15">
            <Bug size={14} className="text-medium" aria-hidden />
          </span>
          Debug missions
          <span className="ml-auto">
            <CountBadge tone="muted">{debugCount}</CountBadge>
          </span>
        </button>
      </div>
    </aside>
  );
}
