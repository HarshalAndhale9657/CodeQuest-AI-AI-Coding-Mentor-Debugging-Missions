import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** A raised ink surface for list pages. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-lc bg-layer-1 shadow-card ring-1 ring-line/70", className)} {...rest} />;
}

export function CardTitle({ icon, children, action, id }: { icon?: ReactNode; children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-5">
      {icon}
      <h2 id={id} className="font-display text-[16px] font-semibold tracking-[-0.01em] text-text-1">
        {children}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** A workspace panel: an ink body under a slightly lighter tab header. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cx("flex min-h-0 flex-col overflow-hidden rounded-lc bg-panel ring-1 ring-line/70", className)} {...rest} />;
}

export function PanelHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("flex h-10 shrink-0 items-center gap-1 border-b border-line bg-panel-header/70 px-2 text-sm", className)}>{children}</div>
  );
}

export function PanelBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("min-h-0 flex-1 overflow-y-auto", className)} {...rest} />;
}
