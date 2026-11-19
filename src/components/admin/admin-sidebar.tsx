"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Shield,
  Users,
  Trophy,
  Radio,
  History,
  Settings,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clubs", label: "Clubs Management", icon: Shield },
  { href: "/admin/players", label: "Players Management", icon: Users },
  { href: "/admin/segments", label: "Segments Management", icon: Trophy },
  { href: "/admin/live", label: "Live Auction", icon: Radio },
  { href: "/admin/history", label: "Auction History", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export interface AdminUserInfo {
  email: string;
  role?: "superadmin" | "admin" | null;
}

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "rounded-md p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-400",
        className,
      )}
    >
      {isDark ? <Sun className="size-4.5" aria-hidden /> : <Moon className="size-4.5" aria-hidden />}
    </button>
  );
}

export function AdminSidebar({
  onSignOut,
  user,
}: {
  onSignOut?: () => void;
  user?: AdminUserInfo;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-5 dark:border-white/10">
        <Logo />
        <ThemeToggle />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Admin Console
        </p>
        {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-400 font-semibold text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100",
              )}
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
              {label}
            </Link>
          );
        })}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
        >
          <ExternalLink className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
          Public display
        </a>
      </nav>
      <div className="border-t border-zinc-200 p-3 dark:border-white/10">
        {user && (
          <div className="mb-2 rounded-lg bg-zinc-100 px-3 py-2.5 dark:bg-white/5">
            <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100" title={user.email}>
              {user.email}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              {user.role ?? "admin"}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="size-4.5" strokeWidth={2} aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
