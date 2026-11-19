import { Trophy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Renders a smaller mark-only variant. */
  compact?: boolean;
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5 select-none", className)}
      aria-label="BUPL Cricket Auction — home"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-amber-400 text-zinc-950 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
        <Trophy className="size-5" strokeWidth={2.25} aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400">
            BUPL
          </span>
          <span className="text-sm font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
            Cricket Auction
          </span>
        </span>
      )}
    </Link>
  );
}
