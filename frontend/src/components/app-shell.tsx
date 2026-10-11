"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useHydratedSession } from "@/lib/session";
import { TopBar } from "./top-bar";
import { cx } from "./ui/cx";
import { Skeleton } from "./ui/states";

function ShellSkeleton({ workspace }: { workspace?: boolean }) {
  return (
    <div className={cx("flex min-h-screen flex-col", workspace ? "bg-bg-ws" : "cq-night")} aria-busy="true">
      <div className={cx(workspace ? "h-12 bg-bg-ws" : "h-14 border-b border-line/80")} />
      <div className="mx-auto w-full max-w-[1440px] flex-1 space-y-3 px-4 py-8 sm:px-6">
        <span className="sr-only">Loading your quest…</span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/** Redirects to the landing page once we know there is no session. */
function useAuthGuard(required: boolean) {
  const session = useHydratedSession();
  const router = useRouter();
  useEffect(() => {
    if (required && session.hydrated && !session.token) router.replace("/");
  }, [required, session.hydrated, session.token, router]);
  return session;
}

/** List-page shell: a translucent top bar over the night page. */
export function AppShell({ children, requireAuth = true, wide = false }: { children: ReactNode; requireAuth?: boolean; wide?: boolean }) {
  const { token, name, hydrated } = useAuthGuard(requireAuth);
  if (!hydrated || (requireAuth && !token)) return <ShellSkeleton />;
  return (
    <div className="cq-night flex min-h-screen flex-col">
      <TopBar name={token ? name : null} />
      <main className={cx("mx-auto w-full flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8", wide ? "max-w-[1600px]" : "max-w-[1440px]")}>{children}</main>
    </div>
  );
}

/** Renders children only once a session exists (workspace pages build their own frame inside). */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { token, hydrated } = useAuthGuard(true);
  if (!hydrated || !token) return <ShellSkeleton workspace />;
  return <>{children}</>;
}

/** Workspace frame: the deepest ink behind the panels, with a centred action group. Use inside WorkspaceGate. */
export function WorkspaceFrame({ children, left, center }: { children: ReactNode; left?: ReactNode; center?: ReactNode }) {
  const { name } = useHydratedSession();
  return (
    <div className="flex min-h-screen flex-col bg-bg-ws lg:h-screen lg:overflow-hidden">
      <TopBar name={name} left={left} center={center} workspace />
      <main className="flex min-h-0 flex-1 flex-col px-2 pb-2">{children}</main>
    </div>
  );
}
