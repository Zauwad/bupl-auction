import type { Metadata } from "next";
import { HomeView } from "@/components/home/home-view";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Official auction hub for the BUPL University Cricket Tournament — live results, top buys, and final club squad rosters.",
};

export default function HomePage() {
  return <HomeView />;
}
