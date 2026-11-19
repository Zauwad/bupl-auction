"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Live Auction Unhandled Error Caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6 flex size-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
        <AlertOctagon className="size-10" />
      </div>

      <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-red-400">
        Disaster Recovery Active
      </p>
      <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-zinc-100 sm:text-4xl">
        Auction Room Interrupted
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        A temporary display interruption occurred. Your tournament database state is safe in the cloud and was not affected.
      </p>

      {error.message && (
        <pre className="mt-4 max-w-lg rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs text-zinc-400">
          {error.message}
        </pre>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-black uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300"
        >
          <RotateCcw className="size-4" />
          Recover Auction Room
        </button>

        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10"
        >
          <Home className="size-4" />
          Return to Home
        </Link>
      </div>
    </div>
  );
}

