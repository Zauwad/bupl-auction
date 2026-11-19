import type { Metadata } from "next";
import { SquadsPageClient } from "@/components/squads-page-client";

export const metadata: Metadata = {
  title: "Club Squads",
  description: "Budgets, remaining funds and full squads for every club in the BUPL Cricket Auction.",
};

export default function SquadsPage() {
  return <SquadsPageClient />;
}
