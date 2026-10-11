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
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-green" : "bg-fill-3",
      )}
    >
      <span
        aria-hidden
        className={cx("inline-block size-5 rounded-full bg-text-1 shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")}
      />
    </button>
  );
}
