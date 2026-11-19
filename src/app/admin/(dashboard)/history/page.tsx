import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { HistoryLedger } from "@/components/history-ledger";

export const metadata: Metadata = { title: "Auction History" };

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Auction History"
        description="Every recorded transaction, newest first — the official ledger of the room."
      />
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <HistoryLedger />
      </div>
    </div>
  );
}
