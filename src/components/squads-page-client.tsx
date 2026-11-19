"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ArrowRight, Wallet, Users } from "lucide-react";
import { subscribeClubs } from "@/lib/firebase";
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
    return subscribeClubs(setClubs, () => undefined);
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-zinc-50">
            <Shield className="size-6 text-amber-400" aria-hidden />
            Club Squads
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every franchise, its budget and its haul — live from the auction room.
          </p>
        </div>
        {!loading && (clubs?.length ?? 0) > 0 && (
          <div className="hidden items-center gap-6 sm:flex">
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Wallet className="size-3.5" aria-hidden /> Combined budget
              </p>
              <p className="font-mono text-sm font-bold text-zinc-200">
                {formatPrice(totals.remaining)} <span className="text-zinc-600">/ {formatPrice(totals.initial)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Users className="size-3.5" aria-hidden /> Players bought
              </p>
              <p className="font-mono text-sm font-bold text-zinc-200">{totals.players}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className="group flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-amber-400/40 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <div className="flex items-center gap-4">
                  <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={72} className="transition-transform group-hover:scale-105" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black uppercase leading-tight text-zinc-100" title={club.name}>
                      {club.name}
                    </h2>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      {squadIds(club).length}{" "}
                      {squadIds(club).length === 1 ? "player" : "players"} · budget {formatPrice(club.initialBudget)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                      Remaining
                    </p>
                    <p className="font-mono text-2xl font-black tabular-nums text-emerald-400">
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
