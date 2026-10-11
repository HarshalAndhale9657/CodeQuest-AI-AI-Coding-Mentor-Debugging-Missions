"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { Logo } from "./logo";
import { buttonClass } from "./ui/button";
import { cx } from "./ui/cx";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/home", label: "Quest" },
  { href: "/roadmap", label: "Roadmap", match: ["/roadmap", "/onboarding"] },
  { href: "/typing", label: "Warm-up" },
  { href: "/arena", label: "Arena" },
  { href: "/profile", label: "Profile", match: ["/profile", "/u/"] },
  { href: "/settings", label: "Settings" },
];

function AiPill() {
  const ai = useQuery({ queryKey: ["ai"], queryFn: api.aiStatus, staleTime: 30_000 });
  if (!ai.data) return null;
  // "On" only when the switch is on and the server actually has a provider; otherwise every hint is deterministic.
  const on = ai.data.enabled && ai.data.available;
  return (
    <Link
      href="/settings#ai"
      className="hidden h-7 items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 text-xs text-text-2 ring-1 ring-inset ring-white/[0.06] transition-colors hover:text-text-1 sm:inline-flex"
      title={
        on
          ? "AI wording is on: hints are reworded by AI, then leak-checked"
          : ai.data.available
            ? "AI wording is off: every hint is deterministic"
            : "No AI provider on the server: every hint is deterministic"
      }
    >
      <span className={cx("size-1.5 rounded-full", on ? "bg-green shadow-[0_0_8px_var(--cq-mint)]" : "bg-text-3")} aria-hidden />
      AI {on ? "on" : "off"}
    </Link>
  );
}

function SolvedChip() {
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  if (!me.data) return null;
  const n = me.data.solved.length;
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full px-1.5 text-sm font-semibold text-text-1" title="Missions solved">
      <Flame size={17} className={n ? "fill-brand/25 text-brand" : "text-text-3"} aria-hidden />
      <span className="tabular-nums">{n}</span>
      <span className="sr-only">missions solved</span>
    </span>
  );
}

function NavLinks({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <nav aria-label="Main" className={className}>
      {NAV.map((item) => {
        const active = (item.match ?? [item.href]).some((m) => pathname.startsWith(m));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-sm transition-colors",
              active ? "bg-white/[0.08] font-semibold text-text-1" : "text-text-2 hover:bg-white/[0.04] hover:text-text-1",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
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
        "sticky top-0 z-30 shrink-0",
        workspace ? "bg-bg-ws" : "border-b border-line/80 bg-bg/80 backdrop-blur-xl backdrop-saturate-150",
      )}
    >
      <div className={cx("relative flex items-center gap-3 px-4 sm:gap-5", workspace ? "h-12" : "h-14 sm:px-6")}>
        <Logo compact={workspace} />
        {left}
        {!center && <NavLinks pathname={pathname} className="hidden items-center gap-0.5 md:flex" />}
        {center && <div className="flex items-center gap-1 md:absolute md:left-1/2 md:-translate-x-1/2">{center}</div>}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {name ? (
            <>
              <AiPill />
              <SolvedChip />
              <UserMenu name={name} handle={me.data?.user.handle} />
            </>
          ) : (
            <Link href="/" className={buttonClass("primary", "sm")}>
              Start your quest
            </Link>
          )}
        </div>
      </div>
      {!center && (
        <NavLinks
          pathname={pathname}
          className="flex items-center gap-0.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        />
      )}
    </header>
  );
}
