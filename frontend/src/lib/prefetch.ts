"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { preloadEditor } from "@/components/code-editor";
import { api } from "./api";

/** Warms a mission's data and the code editor (call on hover/focus) so opening it shows no loading state. */
export function usePrefetchMission() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      void queryClient.prefetchQuery({ queryKey: ["challenge", id], queryFn: () => api.challenge(id) });
      preloadEditor();
    },
    [queryClient],
  );
}
