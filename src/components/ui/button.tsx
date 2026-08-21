import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg" | "bar";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-terracotta text-white hover:bg-terracotta-dark focus-visible:ring-terracotta shadow-sm",
  secondary:
    "bg-white text-espresso border border-espresso/10 hover:border-espresso/25 hover:bg-paper",
  ghost: "bg-transparent text-espresso hover:bg-espresso/5",
  dark: "bg-espresso text-cream hover:bg-ink focus-visible:ring-gold",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 h-11 px-3 text-sm",
  md: "min-h-11 h-11 px-4 text-sm",
  lg: "min-h-12 h-12 px-5 text-base",
  bar: "min-h-12 h-12 px-3 text-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-full font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : icon ? (
        <span className="inline-flex shrink-0 items-center">{icon}</span>
      ) : null}
      {children != null ? <span className="min-w-0 truncate">{children}</span> : null}
    </button>
  );
}
