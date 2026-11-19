import Link from "next/link";
import { Radio } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";

const NAV_LINKS = [
  { href: "/live", label: "Live Auction" },
  { href: "/squads", label: "Squads" },
  { href: "/history", label: "History" },
  { href: "/stats", label: "Stats" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 sm:gap-2 md:flex" aria-label="Main Navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/5 hover:text-amber-400 sm:text-sm"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/live"
            className="ml-2 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-amber-300"
          >
            <Radio className="size-4" aria-hidden />
            Watch Live
          </Link>
        </nav>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/live"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-950 hover:bg-amber-300"
          >
            <Radio className="size-3.5" aria-hidden />
            <span>Live</span>
          </Link>
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
