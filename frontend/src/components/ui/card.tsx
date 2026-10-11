import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** A LeetCode list-page card (#282828). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-lc bg-layer-1", className)} {...rest} />;
}

export function CardTitle({ icon, children, action, id }: { icon?: ReactNode; children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4">
      {icon}
      <h2 id={id} className="text-[15px] font-medium text-text-1">
        {children}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** A LeetCode workspace panel (#262626 body, #333333 header). */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cx("flex min-h-0 flex-col overflow-hidden rounded-lc bg-panel", className)} {...rest} />;
}

export function PanelHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("flex h-9 shrink-0 items-center gap-1 bg-panel-header px-2 text-sm", className)}>{children}</div>;
}

export function PanelBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("min-h-0 flex-1 overflow-y-auto", className)} {...rest} />;
}
