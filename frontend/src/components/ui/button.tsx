import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "success" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-ink font-semibold hover:brightness-110 active:brightness-95",
  success: "bg-btn-dark text-green-submit font-semibold hover:bg-hover",
  secondary: "bg-fill-3 text-text-1 ring-1 ring-inset ring-white/[0.04] hover:bg-fill-4",
  ghost: "text-text-2 hover:bg-hover hover:text-text-1",
  danger: "bg-red/10 text-red font-medium ring-1 ring-inset ring-red/20 hover:bg-red/20",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-[15px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lc-sm transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/** The same look for a link that acts as a button (Next.js `Link` or `<a>`). */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string): string {
  return cx(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lc-sm transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}
