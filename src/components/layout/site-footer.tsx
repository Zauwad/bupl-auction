import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
        <Logo compact />
        <p className="text-xs text-zinc-500">
          BUPL Cricket Auction · Official tournament auction
        </p>
        <p className="text-[11px] uppercase tracking-widest text-zinc-600">
          Read-only public display
        </p>
      </div>
    </footer>
  );
}
