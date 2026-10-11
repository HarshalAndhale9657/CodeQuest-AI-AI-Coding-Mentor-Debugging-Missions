import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { VERDICT_LABEL, VERDICT_TEXT } from "@/lib/format";
import type { Verdict } from "@/lib/types";
import { cx } from "./ui/cx";

export const VERDICT_ICON: Record<Verdict, typeof CheckCircle2> = {
  passed: CheckCircle2,
  wrong_output: XCircle,
  runtime_error: AlertTriangle,
  timeout: Clock,
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const Icon = VERDICT_ICON[verdict];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full bg-fill-3 px-2 py-0.5 text-xs font-medium", VERDICT_TEXT[verdict])}>
      <Icon size={13} aria-hidden />
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
