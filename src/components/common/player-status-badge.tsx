import { cn } from "@/lib/utils";
import type { PlayerStatus } from "@/types";

const STATUS_CONFIG: Record<PlayerStatus, { label: string; classes: string }> = {
  upcoming: {
    label: "Upcoming",
    classes:
      "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  current: {
    label: "On the block",
    classes:
      "border-amber-400/60 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-400",
  },
  sold: {
    label: "Sold",
    classes:
      "border-emerald-400/60 bg-emerald-100 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  unsold: {
    label: "Unsold",
    classes:
      "border-red-300/70 bg-red-50 text-red-600 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-400",
  },
};

/** Pill for the player lifecycle status. */
export function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]",
        config.classes,
      )}
    >
      {config.label}
    </span>
  );
}
