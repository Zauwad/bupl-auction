import Link from "next/link";
import { Home } from "lucide-react";

/**
 * Broadcast chrome — full-viewport dark canvas for projector use.
 * No navigation chrome except a barely-visible escape hatch for operators.
 */
export default function BroadcastLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark broadcast-bg relative min-h-screen w-full overflow-y-auto bg-[#0b0b10] text-zinc-100">
      {children}
      {/* Operator escape hatch — invisible until hovered, bottom-right */}
      <Link
        href="/"
        aria-label="Back to the audience site"
        className="absolute bottom-2 right-2 z-50 rounded-full p-2 text-zinc-800 opacity-20 transition-opacity hover:bg-white/5 hover:text-zinc-400 hover:opacity-100 focus-visible:opacity-100"
      >
        <Home className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
