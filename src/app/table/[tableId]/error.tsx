"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

function explainTableScanError(message: string) {
  if (/chunk|dynamically imported module|Loading CSS chunk/i.test(message)) {
    return {
      title: "App update needed",
      body: "Your phone is holding an old copy of the page (common after we deploy). Close this tab, scan the QR again, or tap Try again once.",
    };
  }
  if (/localhost|127\.0\.0\.1|192\.168\.|10\.\d/i.test(message)) {
    return {
      title: "QR points to the wrong address",
      body: "This QR was printed with localhost or a Wi‑Fi IP. Guest phones cannot reach that. Reprint cards using your live site URL (NEXT_PUBLIC_APP_URL).",
    };
  }
  if (/offline|could not reach|failed to fetch|network/i.test(message)) {
    return {
      title: "Kitchen unreachable",
      body: "The phone could not reach the café server. Check mobile data or Wi‑Fi, then scan again.",
    };
  }
  return {
    title: "Something went wrong",
    body: "This table page hit an unexpected error. Retry or go home and scan again.",
  };
}

export default function TableError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const hostHint =
    typeof window !== "undefined" &&
    /localhost|127\.0\.0\.1|^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./i.test(
      window.location.hostname,
    )
      ? "This link uses a local address — most guest phones cannot open it. Reprint QR with your public site URL."
      : null;

  const explained = useMemo(
    () => explainTableScanError(error?.message ?? ""),
    [error?.message],
  );

  return (
    <div className="grid min-h-dvh place-items-center bg-cream px-6 text-espresso">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl italic">{explained.title}</h1>
        <p className="mt-3 text-sm leading-6 text-espresso/70">{explained.body}</p>
        {hostHint ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
            {hostHint}
          </p>
        ) : null}
        {error?.message ? (
          <p className="mt-3 break-words rounded-2xl bg-espresso/5 px-3 py-2 text-left text-xs text-espresso/60">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (/chunk|dynamically imported module/i.test(error?.message ?? "")) {
                window.location.reload();
                return;
              }
              reset();
            }}
            className="inline-flex h-11 items-center rounded-full bg-terracotta px-5 text-sm font-medium text-cream"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-espresso/15 px-4 text-sm"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
