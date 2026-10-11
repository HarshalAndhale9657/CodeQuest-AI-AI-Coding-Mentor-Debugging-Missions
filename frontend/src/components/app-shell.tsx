"use client";

import { Compass, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { clearSession, getName, getToken } from "@/lib/api";

const noop = () => () => {};

function useHydratedSession() {
  const token = useSyncExternalStore(noop, getToken, () => null);
  const name = useSyncExternalStore(noop, getName, () => null);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return { token, name, hydrated };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token, name, hydrated } = useHydratedSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !token) router.replace("/");
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return <div className="grid min-h-screen place-items-center text-muted">Loading your quest…</div>;
  }

  const link = (href: string, label: string, Icon: typeof Compass) => (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        pathname.startsWith(href) ? "bg-panel-2 text-text" : "text-muted hover:text-text"
      }`}
    >
      <Icon size={16} aria-hidden /> {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/home" className="font-semibold tracking-tight">
            Code<span className="text-accent">Quest</span> AI
          </Link>
          <nav className="flex gap-1" aria-label="Main">
            {link("/home", "Quest", Compass)}
            {link("/arena", "Sandbox Arena", ShieldCheck)}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted">
            <span>{name}</span>
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.replace("/");
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 hover:text-text"
              aria-label="Sign out"
            >
              <LogOut size={16} aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
