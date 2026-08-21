import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  icon,
  action,
  className,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-espresso/15 bg-white/50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="text-terracotta">{icon}</div> : null}
      <h3 className="font-display text-xl text-espresso">{title}</h3>
      <p className="max-w-sm text-sm leading-6 text-espresso/70">{body}</p>
      {action}
    </div>
  );
}
