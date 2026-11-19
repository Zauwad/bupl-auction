import type { Metadata } from "next";
import { StatsPageClient } from "@/components/stats-page-client";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Final statistics of the BUPL Cricket Auction — highest buys, biggest spenders, segment breakdown.",
};

export default function StatsPage() {
  return <StatsPageClient />;
}
