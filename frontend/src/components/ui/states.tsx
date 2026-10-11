import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-lc-sm bg-fill-2", className)} />;
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
    <div className={cx("flex flex-col items-center justify-center gap-2 px-4 py-8 text-center", className)}>
      {icon && <div className="text-text-3">{icon}</div>}
      <p className="text-sm font-medium text-text-1">{title}</p>
      {text && <p className="max-w-sm text-sm text-text-3">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cx("flex flex-col items-center gap-3 rounded-lc bg-layer-1 px-4 py-8 text-center", className)}>
      <AlertTriangle size={22} className="text-red" aria-hidden />
      <p className="max-w-md text-sm text-text-1">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RotateCw size={14} aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-fill-2 px-1 font-mono text-[11px] text-text-2">{children}</kbd>;
}
