import type { Metadata } from "next";
import { ClubsManager } from "./clubs-manager";

export const metadata: Metadata = { title: "Clubs Management" };

export default function ClubsPage() {
  return <ClubsManager />;
}
