import { cn } from "@/lib/utils";
import type { AuctionStatus } from "@/types";

const STATUS_CONFIG: Record<
  AuctionStatus,
  { label: string; classes: string; pulse: boolean }
> = {
  not_started: {
    label: "Not started",
    classes: "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    pulse: false,
  },
  live: {
    label: "Live",
    classes:
      "border-emerald-400/60 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-400",
    pulse: true,
  },
  paused: {
    label: "Paused",
    classes:
      "border-amber-400/60 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-400",
    pulse: false,
  },
  completed: {
    label: "Completed",
    classes:
      "border-sky-400/60 bg-sky-100 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-400",
    pulse: false,
  },
};

/** Pill showing the current auction lifecycle status. */
export function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]",
        config.classes,
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full bg-current",
          config.pulse && "animate-pulse",
        )}
        aria-hidden
      />
      {config.label}
    </span>
  );
}
