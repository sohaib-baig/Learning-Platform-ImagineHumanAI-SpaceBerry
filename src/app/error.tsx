"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Global error boundary for App Router pages.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-[#f8fafc] text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Something went wrong
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            We hit a snag loading this page.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Please try again. If the problem persists, contact support with the
            error reference below.
          </p>
          {error.digest && (
            <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700">
              Ref: {error.digest}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Retry
            </button>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
