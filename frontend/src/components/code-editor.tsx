"use client";

import dynamic from "next/dynamic";
import { EditorPlaceholder } from "./editor-placeholder";

export type { CodeEditorProps } from "./code-editor-inner";

const loadInner = () => import("./code-editor-inner");

// Monaco touches `window`, so it must never render on the server.
export const CodeEditor = dynamic(loadInner, { ssr: false, loading: EditorPlaceholder });

let preloaded = false;

/** Fetches the editor bundle and Monaco itself ahead of time (idempotent; safe to call on every hover). */
export function preloadEditor() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  void loadInner()
    .then((m) => m.preloadMonaco())
    .catch(() => {
      preloaded = false;
    });
}
