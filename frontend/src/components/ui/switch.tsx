"use client";

import { cx } from "./cx";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function Switch({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ring-1 ring-inset transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-green ring-green" : "bg-fill-3 ring-line-strong",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "inline-block size-5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-transform duration-200",
          checked ? "translate-x-[22px] bg-white" : "translate-x-0.5 bg-text-2",
        )}
      />
    </button>
  );
}
