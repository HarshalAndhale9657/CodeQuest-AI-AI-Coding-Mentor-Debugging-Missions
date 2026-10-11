interface Props {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  /** Tailwind stroke colour class for the filled arc. */
  tone?: string;
  label?: string;
}

/** Circular progress like LeetCode's "154/4073 Solved". A total of 0 renders an empty ring. */
export function ProgressRing({ value, total, size = 20, stroke = 2.5, tone = "stroke-green", label }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${value} of ${total}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-fill-3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        className={`${tone} transition-[stroke-dashoffset] duration-700`}
      />
    </svg>
  );
}
