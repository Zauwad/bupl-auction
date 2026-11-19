"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  subscribeClubs,
  subscribePlayers,
} from "@/lib/firebase";
import { formatPrice } from "@/lib/format";
import { clubAccent, byAbbreviation } from "@/lib/club-accent";
import { ClubLogo } from "@/components/common/club-logo";
import {
  Shield,
  Users2,
  Wallet,
  BadgeCheck,
  Shirt,
} from "lucide-react";
import type { Club, Player } from "@/types";

/**
 * "Club purchases hall" — a full-width section below the broadcast screen.
 * Each franchise gets one red banner with its purchased players inline:
 * abbreviation, name, count, spend and the player cards themselves.
 * Read-only, live from Firebase.
 */
export function ClubPurchasesBoard() {
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);

  useEffect(() => {
    const noop = () => undefined;
    const unsubs = [
      subscribeClubs(setClubs, noop),
      subscribePlayers(setPlayers, noop),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = clubs === undefined || players === undefined;

  const squads = useMemo(() => {
    const byClub = new Map<string, Player[]>();
    for (const player of players ?? []) {
      if (player.status === "sold" && player.purchasedByClubId) {
        const list = byClub.get(player.purchasedByClubId) ?? [];
        list.push(player);
        byClub.set(player.purchasedByClubId, list);
      }
    }
    for (const list of byClub.values()) {
      list.sort((a, b) => (b.finalPrice ?? 0) - (a.finalPrice ?? 0));
    }
    return [...(clubs ?? [])].sort(byAbbreviation).map((club) => ({
      club,
      squad: byClub.get(club.id) ?? [],
      spent: (byClub.get(club.id) ?? []).reduce((sum, p) => sum + (p.finalPrice ?? 0), 0),
    }));
  }, [clubs, players]);

  const totals = useMemo(() => {
    const squadsFlat = squads.flatMap((s) => s.squad);
    return {
      playersBought: squadsFlat.length,
      totalSpent: squadsFlat.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0),
      biggestSpender: [...squads].sort((a, b) => b.spent - a.spent)[0],
      purseRemaining: (clubs ?? []).reduce((sum, c) => sum + c.remainingBudget, 0),
    };
  }, [squads, clubs]);

  return (
    <section
      aria-label="Club purchases"
      className="border-t border-red-900/40 bg-gradient-to-b from-[#1a0d10] via-[#120a0c] to-[#0b0b10]"
    >
      {/* Section header */}
      <div className="mx-auto flex w-full max-w-[1760px] flex-wrap items-center justify-between gap-3 border-b border-red-900/40 px-5 py-2.5 sm:px-8">
        <div className="flex items-center gap-3">
          <Shield className="size-5 text-red-400" aria-hidden />
          <h2 className="font-display text-2xl font-bold uppercase leading-none tracking-wide text-zinc-100">
            Club <span className="text-red-400">Purchases</span>
          </h2>
          <span className="hidden border-l border-white/15 pl-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 lg:inline">
            Who bought whom
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="flex items-center gap-1.5 font-mono text-sm font-bold uppercase tracking-wider text-zinc-300">
            <BadgeCheck className="size-4 text-emerald-400" aria-hidden />
            {totals.playersBought} bought
          </p>
          <p className="flex items-center gap-1.5 font-mono text-sm font-bold uppercase tracking-wider text-red-400">
            <Shirt className="size-4" aria-hidden />
            {formatPrice(totals.totalSpent)} spent
          </p>
          <p className="flex items-center gap-1.5 font-mono text-sm font-bold uppercase tracking-wider text-amber-400">
            <Wallet className="size-4" aria-hidden />
            {formatPrice(totals.purseRemaining)} purse
          </p>
        </div>
      </div>

      {/* Club rows */}
      <ol className="mx-auto flex w-full max-w-[1760px] flex-col gap-3 px-4 py-6 sm:px-8">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <li
                key={i}
                className="h-32 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.03]"
              />
            ))
          : squads.map(({ club, squad, spent }) => {
              const accent = clubAccent(club.name);
              return (
                <li
                  key={club.id}
                  style={{ borderLeft: `5px solid ${accent}` }}
                  className="grid grid-cols-1 gap-4 rounded-xl border border-red-900/50 bg-gradient-to-r from-red-950/70 via-[#2a1215] to-[#1a0d10] p-4 lg:grid-cols-12 lg:items-center"
                >
                  {/* Club identity */}
                  <div className="flex items-center gap-4 lg:col-span-3">
                    <ClubLogo
                      logoUrl={club.logoUrl}
                      name={club.name}
                      abbreviation={club.abbreviation}
                      size={64}
                      className="ring-2 ring-white/10"
                    />
                    <div className="min-w-0">
                      <p
                        className="font-display text-3xl font-bold uppercase leading-none tracking-widest text-zinc-100"
                        title={club.name}
                      >
                        {club.abbreviation ?? club.name}
                      </p>
                      <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-zinc-500" title={club.name}>
                        {club.name}
                      </p>
                      <p className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Users2 className="size-3" aria-hidden />
                          {squad.length} bought
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <Wallet className="size-3" aria-hidden />
                          {formatPrice(spent)} spent
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Club purse */}
                  <div className="flex items-center justify-between gap-4 lg:col-span-2 lg:flex-col lg:items-end lg:justify-center lg:gap-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                      Purse
                    </p>
                    <p className="font-display text-3xl font-semibold tabular-nums leading-none text-amber-400">
                      {formatPrice(club.remainingBudget)}
                    </p>
                    <div className="h-1 w-14 overflow-hidden rounded-full bg-white/10 lg:w-20">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${club.initialBudget > 0 ? Math.max(0, (club.remainingBudget / club.initialBudget) * 100) : 0}%`, background: accent }}
                      />
                    </div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                      {club.totalPlayersPurchased} bought · {formatPrice(spent)} spent
                    </p>
                  </div>

                  {/* Purchased player cards */}
                  <div className="min-w-0 lg:col-span-7">
                    {squad.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-white/10 px-4 py-5 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                        No players bought yet
                      </p>
                    ) : (
                      <ul className="flex gap-2 overflow-x-auto pb-1">
                        {squad.map((player) => (
                          <li
                            key={player.id}
                            className="flex w-28 shrink-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-black/50"
                            title={`${player.name} — ${formatPrice(player.finalPrice)}`}
                          >
                            <div className="relative h-24 w-full bg-white/5">
                              {player.photoUrl ? (
                                <Image
                                  src={player.photoUrl}
                                  alt={player.name}
                                  fill
                                  sizes="112px"
                                  className="object-cover object-top"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="font-display text-4xl font-bold text-zinc-700">
                                    {player.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="absolute left-1 top-1 rounded border border-white/20 bg-black/70 px-1 font-mono text-[9px] font-bold text-zinc-300">
                                S{player.segment}
                              </span>
                            </div>
                            <div className="flex flex-1 flex-col justify-between gap-0.5 p-1.5">
                              <p className="truncate text-[10px] font-bold uppercase leading-tight text-zinc-100" title={player.name}>
                                {player.name}
                              </p>
                              <p className="font-display text-sm font-semibold tabular-nums leading-none text-emerald-400">
                                {formatPrice(player.finalPrice)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
      </ol>

    </section>
  );
}
