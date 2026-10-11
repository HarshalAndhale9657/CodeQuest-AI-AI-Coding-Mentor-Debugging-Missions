"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { Logo } from "./logo";
import { cx } from "./ui/cx";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/home", label: "Quest" },
  { href: "/roadmap", label: "Roadmap", match: ["/roadmap", "/onboarding"] },
  { href: "/typing", label: "Typing" },
  { href: "/arena", label: "Arena" },
  { href: "/profile", label: "Profile", match: ["/profile", "/u/"] },
  { href: "/settings", label: "Settings" },
];

function AiPill() {
  const ai = useQuery({ queryKey: ["ai"], queryFn: api.aiStatus, staleTime: 30_000 });
  if (!ai.data) return null;
  const on = ai.data.enabled;
  return (
    <Link
      href="/settings#ai"
      className="hidden items-center gap-1.5 rounded-full bg-fill-2 px-2.5 py-1 text-xs text-text-2 transition-colors hover:text-text-1 sm:inline-flex"
      title={on ? "AI wording is on: hints are reworded by AI, then leak-checked" : "AI wording is off: every hint is deterministic"}
    >
      <span className={cx("size-1.5 rounded-full", on ? "bg-green" : "bg-text-3")} aria-hidden />
      AI {on ? "on" : "off"}
    </Link>
  );
}

function SolvedChip() {
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  if (!me.data) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-text-2" title="Missions solved">
      <Flame size={18} className={me.data.solved.length ? "text-brand" : "text-text-3"} aria-hidden />
      <span className="tabular-nums">{me.data.solved.length}</span>
      <span className="sr-only">missions solved</span>
    </span>
  );
}

interface Props {
  name: string | null;
  /** Centre slot (workspace action group). When set, the nav links are hidden. */
  center?: ReactNode;
  /** Left slot after the logo (workspace breadcrumb). */
  left?: ReactNode;
  workspace?: boolean;
}

export function TopBar({ name, center, left, workspace = false }: Props) {
  const pathname = usePathname();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, enabled: !!name });
  return (
    <header
      className={cx(
        "sticky top-0 z-30 flex h-[50px] shrink-0 items-center gap-4 px-4",
        workspace ? "bg-bg-ws" : "border-b border-line bg-layer-1",
      )}
    >
      <Logo compact={workspace} />
      {left}
      {!center && (
        <nav aria-label="Main" className="hidden h-full items-stretch gap-1 md:flex">
          {NAV.map((item) => {
            const active = (item.match ?? [item.href]).some((m) => pathname.startsWith(m));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex items-center px-3 text-[15px] transition-colors",
                  active ? "font-medium text-text-1" : "text-text-2 hover:text-text-1",
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-text-1" aria-hidden />}
              </Link>
            );
          })}
        </nav>
      )}
      {center && <div className="flex items-center gap-1 md:absolute md:left-1/2 md:-translate-x-1/2">{center}</div>}
      <div className="ml-auto flex items-center gap-4">
        {name ? (
          <>
            <AiPill />
            <SolvedChip />
            <UserMenu name={name} handle={me.data?.user.handle} />
          </>
        ) : (
          <Link href="/" className="rounded-lc-sm bg-brand-bg-2 px-3 py-1.5 text-sm font-medium text-brand hover:brightness-110">
            Start your quest
          </Link>
        )}
      </div>
    </header>
  );
}
