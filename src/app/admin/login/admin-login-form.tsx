"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signInAdminWithEmail, checkIsAdmin, signOutAdmin, subscribeToAuthState } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Email/password admin sign-in. Non-admin accounts are rejected even when
 * credentials are valid (allow-list at /admins). Dashboard routes are
 * redirect-protected by the AdminGate; data writes are enforced by RTDB rules.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configured = isFirebaseConfigured();

  // Already signed in as an admin? Go straight to the console.
  useEffect(() => {
    return subscribeToAuthState(({ isAdmin }) => {
      if (isAdmin) router.replace("/admin/overview");
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!configured) {
      setError(
        "Firebase is not configured yet. Fill in .env.local — see README for setup.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const user = await signInAdminWithEmail(email.trim(), password);
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin) {
        await signOutAdmin();
        setError(
          "This account is not authorized as an auction admin. Ask the tournament organizer to grant access.",
        );
        return;
      }
      router.replace("/admin/overview");
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Try again later.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error — check your connection and try again.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Logo />
        <div className="space-y-1">
          <h1 className="text-xl font-black uppercase tracking-tight text-zinc-50">
            Admin Console
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Authorized auction officials only
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="h-11 w-full rounded-lg border border-white/10 bg-zinc-950/60 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-lg border border-white/10 bg-zinc-950/60 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 text-sm font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" aria-hidden />
              Sign in
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-zinc-600">
        Unauthorized access is prohibited
      </p>
    </div>
  );
}
