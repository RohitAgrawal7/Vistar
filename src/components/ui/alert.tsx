import { cn } from "@/lib/cn";

export function Alert({
  message,
  tone = "error",
  className,
  id,
}: {
  message: string;
  tone?: "error" | "info";
  className?: string;
  id?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        tone === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-950",
        className,
      )}
    >
      {message}
    </p>
  );
}
