"use client";

import dynamic from "next/dynamic";

export type { CodeEditorProps } from "./code-editor-inner";

// Monaco touches `window`, so it must never render on the server.
export const CodeEditor = dynamic(() => import("./code-editor-inner"), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-text-3">Loading editor…</div>,
});
