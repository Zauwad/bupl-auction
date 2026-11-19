import type { Metadata } from "next";
import { History } from "lucide-react";
import { HistoryLedger } from "@/components/history-ledger";

export const metadata: Metadata = {
  title: "Auction History",
  description: "Every sale and unsold result from the BUPL Cricket Auction — live, chronological, official.",
};

export default function HistoryPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-zinc-50">
            <History className="size-6 text-amber-400" aria-hidden />
            Auction History
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every finalized result, newest first — the official ledger of the room.
          </p>
        </div>
        <span className="hidden rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 sm:inline">
          Read-only
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <HistoryLedger />
      </div>
    </section>
  );
}
