import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "amber" | "green" | "red" | "blue";

const TONE_STYLES: Record<StatTone, string> = {
  default:
    "border-zinc-200 bg-white text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-50",
  amber:
    "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/[0.07] dark:text-amber-100",
  green:
    "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/[0.07] dark:text-emerald-100",
  red: "border-red-300/60 bg-red-50 text-red-900 dark:border-red-400/25 dark:bg-red-400/[0.07] dark:text-red-100",
  blue:
    "border-sky-300/60 bg-sky-50 text-sky-900 dark:border-sky-400/25 dark:bg-sky-400/[0.07] dark:text-sky-100",
};

const ICON_TONE: Record<StatTone, string> = {
  default: "text-zinc-400 dark:text-zinc-500",
  amber: "text-amber-500 dark:text-amber-400",
  green: "text-emerald-500 dark:text-emerald-400",
  red: "text-red-500 dark:text-red-400",
  blue: "text-sky-500 dark:text-sky-400",
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  tone?: StatTone;
}

/** Dashboard KPI tile — label + big value + supporting subtext. */
export function StatCard({ label, value, subtext, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm transition-colors",
        TONE_STYLES[tone],
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <Icon className={cn("size-5 shrink-0", ICON_TONE[tone])} aria-hidden />
      </div>
      <p className="mt-3 text-3xl font-black tabular-nums tracking-tight">{value}</p>
      {subtext && (
        <p className="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {subtext}
        </p>
      )}
    </div>
  );
}
