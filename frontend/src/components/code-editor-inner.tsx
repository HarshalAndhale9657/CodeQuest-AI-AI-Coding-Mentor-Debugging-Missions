"use client";

import Editor, { loader, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";

loader.config({ paths: { vs: "/monaco/vs" } });

type Monaco = Parameters<OnMount>[1];

export interface CodeEditorProps {
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
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const submitRef = useRef(onSubmitShortcut);

  useEffect(() => {
    submitRef.current = onSubmitShortcut;
  }, [onSubmitShortcut]);

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
      theme="vs-dark"
      onMount={handleMount}
      onChange={(value) => onChange(value ?? "")}
      loading={<div className="p-4 text-sm text-muted">Loading editor…</div>}
      options={{
        fontSize: 15,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 4,
        insertSpaces: true,
        renderLineHighlight: "line",
        padding: { top: 12 },
      }}
    />
  );
}
