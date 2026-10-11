"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";

/** `/profile` forwards to the signed-in learner's public portfolio. */
export default function ProfileRedirect() {
  return (
    <AppShell>
      <Forward />
    </AppShell>
  );
}

function Forward() {
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const handle = me.data?.user.handle;
  useEffect(() => {
    if (handle) router.replace(`/u/${handle}`);
  }, [handle, router]);
  if (me.isError) {
    return <ErrorState message={me.error instanceof ApiError ? me.error.message : "Could not load your profile."} onRetry={() => void me.refetch()} />;
  }
  return <Skeleton className="h-64 w-full rounded-lc" />;
}
