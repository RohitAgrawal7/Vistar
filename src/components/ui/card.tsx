import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-espresso/8 bg-white/90 shadow-[0_10px_40px_-24px_rgba(44,24,16,0.45)]",
        className,
      )}
      {...props}
    />
  );
}
