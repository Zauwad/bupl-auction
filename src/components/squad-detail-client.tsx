"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Users, BadgeDollarSign } from "lucide-react";
import {
  subscribeClub as subscribeFirebaseClub,
  subscribePlayers as subscribeFirebasePlayers,
} from "@/lib/firebase";
import {
  subscribeSpectatorClub,
  subscribeSpectatorPlayers,
} from "@/lib/spectator";
import { formatPrice } from "@/lib/format";
import { ClubLogo } from "@/components/common/club-logo";
import { PlayerPhoto } from "@/components/common/player-photo";
import { squadIds } from "@/types";
import type { Club, Player } from "@/types";

/** Public detail page: everything one club paid for, live. */
export function SquadDetailClient({ clubId }: { clubId: string }) {
  const [club, setClub] = useState<Club | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);

  useEffect(() => {
    const isRealtime =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("realtime") === "true";

    const subClub = isRealtime ? subscribeFirebaseClub : subscribeSpectatorClub;
    const subPlayers = isRealtime ? subscribeFirebasePlayers : subscribeSpectatorPlayers;

    const unsubs = [
      subClub(clubId, setClub, () => setClub(null)),
      subPlayers(setPlayers, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clubId]);

  const loading = club === undefined || players === undefined;

  const squad = club
    ? squadIds(club)
        .map((id) => players?.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p))
        .sort((a, b) => (b.finalPrice ?? 0) - (a.finalPrice ?? 0))
    : [];

  const spent = squad.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/squads"
        className="inline-flex w-max items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500 transition-colors hover:text-amber-400"
      >
        <ArrowLeft className="size-4" aria-hidden /> All squads
      </Link>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : !club ? (
        <div className="py-20 text-center">
          <p className="font-semibold text-zinc-400">Club not found.</p>
          <Link href="/squads" className="mt-3 inline-block text-sm text-amber-400 hover:underline">
            Back to squads
          </Link>
        </div>
      ) : (
        <>
          {/* Club header card */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-6 sm:text-left">
            <div className="shrink-0">
              <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={72} className="sm:hidden" />
              <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={110} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl lg:text-4xl" title={club.name}>
                {club.name}
              </h1>
              <p className="mt-1 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 sm:justify-start">
                <Users className="size-4" aria-hidden />
                {club.totalPlayersPurchased}{" "}
                {club.totalPlayersPurchased === 1 ? "player" : "players"} on the books
              </p>
            </div>
          </div>

          {/* Budget strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Initial budget", value: formatPrice(club.initialBudget), tone: "text-zinc-200" },
              { label: "Total spent", value: formatPrice(spent), tone: "text-red-400" },
              { label: "Remaining", value: formatPrice(club.remainingBudget), tone: "text-emerald-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-3 text-center sm:px-6 sm:py-4">
                <p className="flex items-center justify-center gap-1 text-[8px] font-bold uppercase tracking-[0.15em] text-zinc-500 sm:gap-1.5 sm:text-[10px] sm:tracking-[0.2em]">
                  <Wallet className="size-3 sm:size-3.5" aria-hidden />
                  {item.label}
                </p>
                <p className={`mt-1 font-mono text-sm font-black tabular-nums sm:mt-1.5 sm:text-2xl ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Squad list */}
          {squad.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BadgeDollarSign className="size-10 text-zinc-700" aria-hidden />
              <p className="font-semibold text-zinc-400">No players purchased yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <p className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 sm:px-5">
                Squad — sorted by price paid
              </p>
              <ol className="divide-y divide-white/[0.06]">
                {squad.map((player, index) => (
                  <li key={player.id} className="flex items-center gap-3 bg-white/[0.02] px-3 py-3 sm:gap-4 sm:px-5">
                    <span className="w-5 shrink-0 text-center font-mono text-xs font-black text-zinc-600 sm:w-6">
                      {index + 1}
                    </span>
                    <PlayerPhoto photoUrl={player.photoUrl} name={player.name} size={44} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-100 sm:text-base">{player.name}</p>
                      <p className="truncate text-[10px] text-zinc-500 sm:text-[11px]">
                        Seg {player.segment}
                        {player.department ? ` · ${player.department}` : ""}
                        {player.academicYear ? ` · ${player.academicYear}` : ""}
                        {player.category ? ` · ${player.category}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-black tabular-nums text-amber-400 sm:text-base">
                      {formatPrice(player.finalPrice)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
