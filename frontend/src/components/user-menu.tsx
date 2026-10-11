"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Compass, Keyboard, LogOut, Map as MapIcon, Puzzle, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearSession } from "@/lib/api";
import { initials } from "@/lib/format";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand to-medium font-display font-bold text-bg"
    >
      {initials(name)}
    </span>
  );
}

function Tile({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Menu.Item asChild>
      <Link
        href={href}
        className="flex flex-col items-center justify-center gap-2 rounded-lc-sm bg-white/[0.04] px-2 py-3 text-xs font-medium text-text-2 outline-none ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-white/[0.08] hover:text-text-1 data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-text-1"
      >
        {icon}
        {label}
      </Link>
    </Menu.Item>
  );
}

const rowClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-lc-sm px-3 py-2 text-sm text-text-2 outline-none transition-colors hover:bg-white/[0.06] hover:text-text-1 data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-text-1";

function Row({ href, icon, label, className }: { href: string; icon: ReactNode; label: string; className?: string }) {
  return (
    <Menu.Item asChild>
      <Link href={href} className={`${rowClass} ${className ?? ""}`}>
        {icon}
        {label}
      </Link>
    </Menu.Item>
  );
}

/** Avatar dropdown modelled on LeetCode's: profile header, a tile grid, then a list. */
export function UserMenu({ name, handle }: { name: string; handle?: string }) {
  const router = useRouter();
  const profileHref = handle ? `/u/${handle}` : "/profile";
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className="rounded-full outline-none ring-offset-2 ring-offset-bg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={`Account menu for ${name}`}
      >
        <Avatar name={name} size={30} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[300px] rounded-lc-lg bg-menu p-4 shadow-menu"
        >
          <div className="flex items-center gap-3">
            <Avatar name={name} size={48} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-text-1">{name}</p>
              <Link href={profileHref} className="text-xs text-brand hover:underline">
                View your public profile
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Tile href={profileHref} label="Profile" icon={<UserRound size={22} className="text-blue" aria-hidden />} />
            <Tile href="/settings#extension" label="Extension" icon={<Puzzle size={22} className="text-green" aria-hidden />} />
            <Tile href="/settings#ai" label="AI Mentor" icon={<Sparkles size={22} className="text-brand" aria-hidden />} />
          </div>
          <Menu.Separator className="my-3 h-px bg-line" />
          <Row href="/home" label="Quest" className="md:hidden" icon={<Compass size={18} aria-hidden />} />
          <Row href="/roadmap" label="My Roadmap" icon={<MapIcon size={18} aria-hidden />} />
          <Row href="/typing" label="Syntax Warm-up" className="md:hidden" icon={<Keyboard size={18} aria-hidden />} />
          <Row href="/arena" label="Sandbox Arena" className="md:hidden" icon={<ShieldCheck size={18} aria-hidden />} />
          <Row href="/settings" label="Settings" icon={<Settings size={18} aria-hidden />} />
          <Menu.Item
            className={rowClass}
            onSelect={() => {
              clearSession();
              router.replace("/");
            }}
          >
            <LogOut size={18} aria-hidden /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
