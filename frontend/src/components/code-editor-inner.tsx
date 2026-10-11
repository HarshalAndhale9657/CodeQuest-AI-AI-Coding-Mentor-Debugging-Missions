"use client";

import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import { EditorPlaceholder } from "./editor-placeholder";

loader.config({ paths: { vs: "/monaco/vs" } });

/** Starts downloading Monaco before the editor mounts; the editor reuses the same instance. */
export function preloadMonaco(): Promise<unknown> {
  return loader.init();
}

type Monaco = Parameters<OnMount>[1];

// LeetCode's editor: VS Code Dark+ syntax on the #262626 panel (hex is required here: Monaco cannot read CSS variables).
const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("codequest-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#262626",
      "editor.lineHighlightBackground": "#2f2f2f",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#858585",
      "editorLineNumber.activeForeground": "#f5f5f5",
      "editorGutter.background": "#262626",
      "editor.selectionBackground": "#264f78",
      "editorCursor.foreground": "#f5f5f5",
      "editorIndentGuide.background1": "#3c3c3c",
      "editorWidget.background": "#303030",
      "editorWidget.border": "#464646",
      "editorHoverWidget.background": "#303030",
      "editorHoverWidget.border": "#464646",
      "scrollbarSlider.background": "#46464680",
      "scrollbarSlider.hoverBackground": "#464646",
    },
  });
};

export interface CodeEditorProps {
  onCursor?: (line: number, column: number) => void;
  path: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onSubmitShortcut?: () => void;
  region: [number, number] | null;
  crashLine: number | null;
  crashMessage?: string | null;
}

export default function CodeEditorInner({
  path,
  defaultValue,
  onChange,
  onSubmitShortcut,
  region,
  crashLine,
  crashMessage,
  onCursor,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const submitRef = useRef(onSubmitShortcut);
  const cursorRef = useRef(onCursor);

  useEffect(() => {
    submitRef.current = onSubmitShortcut;
    cursorRef.current = onCursor;
  }, [onSubmitShortcut, onCursor]);

  const handleMount: OnMount = (instance, monaco) => {
    editorRef.current = instance;
    monacoRef.current = monaco;
    decorationsRef.current = instance.createDecorationsCollection([]);
    instance.addAction({
      id: "codequest.submit",
      label: "Submit to the judge",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => submitRef.current?.(),
    });
    instance.onDidChangeCursorPosition((e) => cursorRef.current?.(e.position.lineNumber, e.position.column));
  };

  useEffect(() => {
    const instance = editorRef.current;
    const monaco = monacoRef.current;
    const collection = decorationsRef.current;
    if (!instance || !monaco || !collection) return;
    const model = instance.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    const decorations: editor.IModelDeltaDecoration[] = [];
    if (region) {
      const start = Math.max(1, Math.min(region[0], lineCount));
      const end = Math.max(start, Math.min(region[1], lineCount));
      decorations.push({
        range: new monaco.Range(start, 1, end, 1),
        options: { isWholeLine: true, className: "cq-region-line", linesDecorationsClassName: "cq-region-gutter" },
      });
      instance.revealLinesInCenterIfOutsideViewport(start, end);
    }
    if (crashLine && crashLine <= lineCount) {
      decorations.push({ range: new monaco.Range(crashLine, 1, crashLine, 1), options: { isWholeLine: true, className: "cq-crash-line" } });
    }
    collection.set(decorations);
    monaco.editor.setModelMarkers(
      model,
      "codequest",
      crashLine && crashLine <= lineCount
        ? [
            {
              startLineNumber: crashLine,
              endLineNumber: crashLine,
              startColumn: model.getLineFirstNonWhitespaceColumn(crashLine) || 1,
              endColumn: model.getLineMaxColumn(crashLine),
              message: crashMessage ?? "Your code crashed on this line.",
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        : [],
    );
  }, [region, crashLine, crashMessage]);

  return (
    <Editor
      path={path}
      defaultLanguage="python"
      defaultValue={defaultValue}
      theme="codequest-dark"
      beforeMount={defineTheme}
      onMount={handleMount}
      onChange={(value) => onChange(value ?? "")}
      loading={<EditorPlaceholder />}
      options={{
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        lineHeight: 21,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 4,
        insertSpaces: true,
        renderLineHighlight: "line",
        padding: { top: 12 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        overviewRulerBorder: false,
        guides: { indentation: true },
      }}
    />
  );
}
