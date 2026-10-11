import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-lc-sm bg-fill-2/80", className)} />;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      {icon && <div className="mb-1 grid size-12 place-items-center rounded-full bg-fill-2 text-text-3 ring-1 ring-line">{icon}</div>}
      <p className="font-display text-[15px] font-semibold text-text-1">{title}</p>
      {text && <p className="max-w-sm text-sm leading-relaxed text-text-3">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cx("flex flex-col items-center gap-3 rounded-lc bg-layer-1 px-6 py-10 text-center ring-1 ring-red/20", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-red/10">
        <AlertTriangle size={20} className="text-red" aria-hidden />
      </span>
      <p className="max-w-md text-sm leading-relaxed text-text-1">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RotateCw size={14} aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong border-b-2 bg-fill-2 px-1 font-mono text-[10.5px] text-text-2">
      {children}
    </kbd>
  );
}
