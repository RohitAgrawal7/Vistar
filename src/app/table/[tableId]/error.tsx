"use client";

import Link from "next/link";
import { useEffect } from "react";

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

  return (
    <div className="grid min-h-dvh place-items-center bg-cream px-6 text-espresso">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl italic">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-espresso/70">
          This table page hit an unexpected error. Retry or go home.
        </p>
        {error?.message ? (
          <p className="mt-3 break-words rounded-2xl bg-espresso/5 px-3 py-2 text-left text-xs text-espresso/60">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
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
