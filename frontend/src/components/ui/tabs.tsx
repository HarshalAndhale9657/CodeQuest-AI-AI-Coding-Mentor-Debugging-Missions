"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface Props<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
}

/** LeetCode panel tabs, separated by thin dividers. Arrow/Home/End keys move focus (roving tabindex). */
export function Tabs<T extends string>({ tabs, value, onChange, label, idPrefix }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, index: number) {
    let target = -1;
    if (e.key === "ArrowRight") target = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") target = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = tabs.length - 1;
    if (target < 0) return;
    e.preventDefault();
    onChange(tabs[target].id);
    refs.current[target]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex min-w-0 items-center overflow-x-auto">
      {tabs.map((tab, i) => {
        const active = tab.id === value;
        return (
          <div key={tab.id} className="flex shrink-0 items-center">
            {i > 0 && <span className="mx-1 h-4 w-px bg-line-strong" aria-hidden />}
            <button
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cx(
                "inline-flex h-7 items-center gap-1.5 rounded-lc-sm px-2 text-sm transition-colors",
                active ? "font-medium text-text-1" : "text-text-2 hover:bg-fill-3 hover:text-text-1",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idPrefix,
  id,
  active,
  children,
  className,
}: {
  idPrefix: string;
  id: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} hidden={!active} className={cx(active && "cq-fade-in", className)}>
      {active && children}
    </div>
  );
}
