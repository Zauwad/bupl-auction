import type { Metadata } from "next";
import { SegmentsManager } from "./segments-manager";

export const metadata: Metadata = { title: "Segments Management" };

export default function SegmentsPage() {
  return <SegmentsManager />;
}
