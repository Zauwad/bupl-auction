import type { Metadata } from "next";
import { LiveAuction } from "./live-auction";

export const metadata: Metadata = { title: "Live Auction" };

export default function LiveAuctionPage() {
  return <LiveAuction />;
}
