"use client";

import Image from "next/image";
import { Users, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClubLogo } from "@/components/common/club-logo";
import { formatPrice } from "@/lib/format";
import { squadIds, type Club, type Player } from "@/types";

interface SquadDialogProps {
  club: Club | null;
  players: Player[];
  onOpenChange: (open: boolean) => void;
}

/** Read-only squad view for one club: players bought + prices + spend. */
export function SquadDialog({ club, players, onOpenChange }: SquadDialogProps) {
  const open = club !== null;

  const squad = club
    ? squadIds(club)
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p))
        .sort((a, b) => (b.finalPrice ?? 0) - (a.finalPrice ?? 0))
    : [];

  const totalSpent = squad.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {club && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={64} />
                <div className="min-w-0">
                  <DialogTitle className="truncate text-xl">{club.name}</DialogTitle>
                  <DialogDescription>
                    {club.totalPlayersPurchased}{" "}
                    {club.totalPlayersPurchased === 1 ? "player" : "players"} purchased
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Budget strip */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Initial
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {formatPrice(club.initialBudget)}
                </p>
              </div>
              <div className="border-x border-zinc-200 dark:border-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Spent
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-red-500">
                  {formatPrice(totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Remaining
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(club.remainingBudget)}
                </p>
              </div>
            </div>

            {/* Squad list */}
            {squad.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Users className="size-8 text-zinc-300 dark:text-zinc-600" aria-hidden />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No players purchased yet.
                </p>
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-white/5 dark:border-white/10">
                {squad.map((player, index) => (
                  <li key={player.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-zinc-400">
                      {index + 1}
                    </span>
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-white/10">
                      {player.photoUrl ? (
                        <Image
                          src={player.photoUrl}
                          alt={player.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                          unoptimized={!player.photoUrl.startsWith("/")}
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-xs font-black text-zinc-400">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {player.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        Seg {player.segment}
                        {player.department ? ` · ${player.department}` : ""}
                        {player.academicYear ? ` · ${player.academicYear}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                      {formatPrice(player.finalPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              <Wallet className="size-3.5" aria-hidden />
              Live from Firebase
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
