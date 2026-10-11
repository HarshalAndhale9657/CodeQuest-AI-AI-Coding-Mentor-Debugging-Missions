import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { VERDICT_LABEL } from "@/lib/format";
import type { Verdict } from "@/lib/types";

const STYLE: Record<Verdict, { icon: typeof CheckCircle2; className: string }> = {
  passed: { icon: CheckCircle2, className: "text-pass bg-pass/10 border-pass/30" },
  wrong_output: { icon: XCircle, className: "text-wrong bg-wrong/10 border-wrong/30" },
  runtime_error: { icon: AlertTriangle, className: "text-error bg-error/10 border-error/30" },
  timeout: { icon: Clock, className: "text-timeout bg-timeout/10 border-timeout/30" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { icon: Icon, className } = STYLE[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <Icon size={14} aria-hidden />
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
