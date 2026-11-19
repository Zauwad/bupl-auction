import { Construction } from "lucide-react";

interface PlaceholderPanelProps {
  title: string;
  /** Which roadmap phase will implement this section. */
  phase: string;
  description?: string;
}

/**
 * Temporary panel shown for sections not yet implemented.
 * Removed phase-by-phase as real features land.
 */
export function PlaceholderPanel({ title, phase, description }: PlaceholderPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-20 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <span className="flex size-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-500">
        <Construction className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">{title}</h2>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          {description ?? "This section is scaffolded and will be implemented in an upcoming phase."}
        </p>
      </div>
      <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
        {phase}
      </span>
    </div>
  );
}
