import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "amber" | "sage" | "terracotta" | "gold" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-espresso/8 text-espresso",
  amber: "bg-amber-100 text-amber-900",
  sage: "bg-sage/15 text-sage",
  terracotta: "bg-terracotta/15 text-terracotta-dark",
  gold: "bg-gold-light text-espresso",
  dark: "bg-espresso text-cream",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
