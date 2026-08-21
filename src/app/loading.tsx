import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-cream">
      <Spinner label="Loading…" />
    </div>
  );
}
