import type { Metadata } from "next";
import { PlayersManager } from "./players-manager";

export const metadata: Metadata = { title: "Players Management" };

export default function PlayersPage() {
  return <PlayersManager />;
}
