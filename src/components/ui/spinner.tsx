import { cn } from "@/lib/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-espresso/70", className)} role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-terracotta border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
