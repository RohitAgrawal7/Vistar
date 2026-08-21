"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-[#f4eee4] text-[#1c120c]">
        <div className="max-w-md px-6 text-center">
          <h1 className="font-serif text-3xl italic">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 opacity-70">
            The table interface hit an unexpected error. You can retry or return home.
          </p>
          {error?.message ? (
            <p className="mt-3 break-words rounded-2xl bg-black/5 px-3 py-2 text-left text-xs text-black/60">
              {error.message}
            </p>
          ) : null}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center rounded-full bg-[#c24e1d] px-5 text-sm font-medium text-white"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-black/10 px-4 text-sm"
            >
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
