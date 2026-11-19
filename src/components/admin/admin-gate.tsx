"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Loader2, ShieldAlert } from "lucide-react";
import { subscribeToAuthState, getAdminRole } from "@/lib/firebase/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import type { User } from "firebase/auth";

type GateState =
  | { phase: "loading" }
  | { phase: "authorized"; user: User; role: "superadmin" | "admin" | null }
  | { phase: "unauthorized" };

/**
 * Client-side gate for the /admin dashboard.
 *
 * Authorization is enforced for real by the RTDB security rules (writes
 * require /admins/{uid}) — this gate is the UX layer: it keeps unauthenticated
 * or non-admin visitors out of the console entirely and bounces them to
 * /admin/login. A full server-side check would require session cookies and is
 * intentionally out of scope.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ phase: "loading" });

  useEffect(() => {
    return subscribeToAuthState(({ user, isAdmin }) => {
      if (!user || !isAdmin) {
        setState({ phase: "unauthorized" });
        return;
      }
      setState({ phase: "authorized", user, role: null });
      getAdminRole(user.uid)
        .then((role) =>
          setState((prev) =>
            prev.phase === "authorized" ? { ...prev, role } : prev,
          ),
        )
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (state.phase === "unauthorized") {
      router.replace("/admin/login");
    }
  }, [state.phase, router]);

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
        <Loader2 className="size-8 animate-spin text-amber-400" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Verifying credentials…
        </p>
      </div>
    );
  }

  if (state.phase === "unauthorized") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
        <ShieldAlert className="size-8 text-red-400" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Access denied — redirecting to sign-in…
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AdminShell user={{ email: state.user.email ?? "admin", role: state.role }}>
        {children}
      </AdminShell>
    </ThemeProvider>
  );
}
