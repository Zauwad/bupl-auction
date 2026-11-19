"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Sun, Moon } from "lucide-react";
import { AdminSidebar, ADMIN_NAV_ITEMS, type AdminUserInfo } from "@/components/admin/admin-sidebar";
import { Logo } from "@/components/brand/logo";
import { signOutAdmin } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

/**
 * Admin shell: fixed sidebar on desktop, compact top bar with scrollable
 * section nav on mobile (admin primarily uses a laptop during the auction).
 */
export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: AdminUserInfo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  async function handleSignOut() {
    await signOutAdmin();
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar onSignOut={handleSignOut} user={user} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white lg:hidden dark:border-white/10 dark:bg-zinc-950">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-amber-400"
              >
                {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-red-400"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </div>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto px-2 pb-2"
            aria-label="Admin sections"
          >
            {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
                    active
                      ? "bg-amber-400 text-zinc-950"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label.replace(" Management", "")}
                </a>
              );
            })}
          </nav>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
