import type { Metadata } from "next";
import { BroadcastLive } from "@/components/broadcast/broadcast-live";

export const metadata: Metadata = {
  title: "Live Auction Display",
  description:
    "The official BUPL Cricket Auction broadcast — current player, club budgets, segment progress and statistics, updating live.",
};

export default function LiveBroadcastPage() {
  return <BroadcastLive />;
}
