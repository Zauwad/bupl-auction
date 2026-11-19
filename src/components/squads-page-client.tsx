"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ArrowRight, Wallet, Users } from "lucide-react";
import { subscribeClubs as subscribeFirebaseClubs } from "@/lib/firebase";
import { subscribeSpectatorClubs } from "@/lib/spectator";
import { formatPrice } from "@/lib/format";
import { ClubLogo } from "@/components/common/club-logo";
import { squadIds } from "@/types";
import type { Club } from "@/types";

function clubAccent(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360} 70% 55%)`;
}

/** Public squads overview — every club, budget state, link to its squad. */
export function SquadsPageClient() {
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);

  useEffect(() => {
    const isRealtime =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("realtime") === "true";

    const subClubs = isRealtime ? subscribeFirebaseClubs : subscribeSpectatorClubs;
    return subClubs(setClubs, () => undefined);
  }, []);

  const loading = clubs === undefined;
  const totals = (clubs ?? []).reduce(
    (acc, c) => ({
      initial: acc.initial + c.initialBudget,
      remaining: acc.remaining + c.remainingBudget,
      players: acc.players + c.totalPlayersPurchased,
    }),
    { initial: 0, remaining: 0, players: 0 },
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-black uppercase tracking-tight text-zinc-50 sm:text-2xl">
            <Shield className="size-5 text-amber-400 sm:size-6" aria-hidden />
            Club Squads
          </h1>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            Every franchise, its budget and its haul — live from the auction room.
          </p>
        </div>
        {!loading && (clubs?.length ?? 0) > 0 && (
          <div className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2.5 sm:w-auto sm:self-auto sm:border-0 sm:bg-transparent sm:p-0 sm:gap-6">
            <div className="text-left sm:text-right">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 sm:justify-end sm:text-[10px]">
                <Wallet className="size-3" aria-hidden /> Combined budget
              </p>
              <p className="font-mono text-xs font-bold text-zinc-200 sm:text-sm">
                {formatPrice(totals.remaining)} <span className="text-zinc-600">/ {formatPrice(totals.initial)}</span>
              </p>
            </div>
            <div className="border-l border-white/10 pl-4 text-left sm:border-0 sm:pl-0 sm:text-right">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 sm:justify-end sm:text-[10px]">
                <Users className="size-3" aria-hidden /> Players bought
              </p>
              <p className="font-mono text-xs font-bold text-zinc-200 sm:text-sm">{totals.players}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
      ) : (clubs ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Shield className="size-10 text-zinc-700" aria-hidden />
          <p className="font-semibold text-zinc-400">No clubs registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {(clubs ?? []).map((club) => {
            const spent = club.initialBudget - club.remainingBudget;
            const spentPct = club.initialBudget > 0
              ? Math.min(100, Math.max(0, (spent / club.initialBudget) * 100))
              : 0;
            const accent = clubAccent(club.name);
            return (
              <Link
                key={club.id}
                href={`/squads/${club.id}`}
                style={{ borderLeft: `3px solid ${accent}` }}
                className="group flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5 transition-all hover:border-amber-400/40 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-w-0 max-w-full overflow-hidden"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="shrink-0">
                    <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={56} className="transition-transform group-hover:scale-105 sm:hidden" />
                    <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={72} className="hidden transition-transform group-hover:scale-105 sm:block" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-black uppercase leading-tight text-zinc-100 sm:text-lg" title={club.name}>
                      {club.name}
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:text-[11px]">
                      {squadIds(club).length}{" "}
                      {squadIds(club).length === 1 ? "player" : "players"} · budget {formatPrice(club.initialBudget)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-1">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                      Remaining
                    </p>
                    <p className="font-mono text-xl font-black tabular-nums text-emerald-400 sm:text-2xl">
                      {formatPrice(club.remainingBudget)}
                    </p>
                  </div>
                  <p className="font-mono text-xs font-semibold text-zinc-500">
                    −{formatPrice(spent)} spent
                  </p>
                </div>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={Math.round(spentPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Budget spent"
                >
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${spentPct}%`, background: accent }} />
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 transition-colors group-hover:text-amber-400">
                  Full squad <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
