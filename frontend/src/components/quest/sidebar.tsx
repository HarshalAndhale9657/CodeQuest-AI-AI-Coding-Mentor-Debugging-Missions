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
        "flex h-11 items-center gap-3 rounded-lc px-3 text-[15px] font-medium transition-colors",
        active ? "bg-hover text-text-1" : "text-text-1/90 hover:bg-hover",
      )}
    >
      <Icon size={20} aria-hidden /> {label}
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

/** LeetCode's left library sidebar. */
export function QuestSidebar({ handle, recurring, debugCount, debugActive, onDebug }: Props) {
  return (
    <aside className="hidden lg:block" aria-label="Library">
      <div className="sticky top-[74px] space-y-1">
        <Item href="/home" icon={Compass} label="Quest" active />
        <Item href="/roadmap" icon={MapIcon} label="My Roadmap" />
        <Item href="/typing" icon={Keyboard} label="Syntax Warm-up" />
        <Item href="/arena" icon={ShieldCheck} label="Sandbox Arena" />
        <Item href={handle ? `/u/${handle}` : "/profile"} icon={UserRound} label="Profile" />
        <Item href="/settings" icon={Settings} label="Settings" />
        <div className="my-4 h-px bg-line" />
        <p className="px-3 pb-1 text-[15px] text-text-2">My Lists</p>
        <a href="#memory" className="flex h-11 items-center gap-3 rounded-lc px-3 text-sm text-text-1 transition-colors hover:bg-hover">
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
            "flex h-11 w-full items-center gap-3 rounded-lc px-3 text-sm text-text-1 transition-colors hover:bg-hover",
            debugActive && "bg-hover",
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
