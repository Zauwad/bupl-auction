"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X, ArrowRight, Shield, Radio, History, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const emptySubscribe = () => () => {};

const ICON_MAP: Record<string, LucideIcon> = {
  "/live": Radio,
  "/squads": Shield,
  "/history": History,
  "/stats": BarChart3,
};

interface MobileNavProps {
  links: Array<{ href: string; label: string }>;
}

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition-colors hover:bg-white/10 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 top-16 z-50 flex flex-col bg-zinc-950/98 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <nav className="flex flex-1 flex-col divide-y divide-white/5 overflow-y-auto px-5 py-4" aria-label="Mobile Navigation">
            {links.map((link) => {
              const Icon = ICON_MAP[link.href] ?? ArrowRight;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-4 text-base font-bold uppercase tracking-wider text-zinc-200 transition-colors hover:text-amber-400 active:text-amber-400"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-5 text-amber-400" aria-hidden />
                    {link.label}
                  </span>
                  <ArrowRight className="size-4 text-zinc-600" aria-hidden />
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-5">
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 py-3.5 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Admin Console Sign In
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

