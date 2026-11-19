"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import {
  subscribeHistory as subscribeFirebaseHistory,
  subscribeClubs as subscribeFirebaseClubs,
  subscribePlayers as subscribeFirebasePlayers,
} from "@/lib/firebase";
import {
  subscribeSpectatorHistory,
  subscribeSpectatorClubs,
  subscribeSpectatorPlayers,
} from "@/lib/spectator";
import { formatPrice, formatTimestamp } from "@/lib/format";
import { ClubLogo } from "@/components/common/club-logo";
import { PlayerPhoto } from "@/components/common/player-photo";
import { cn } from "@/lib/utils";
import type { AuctionHistoryRecord, Club, Player } from "@/types";

/**
 * The transaction ledger — every finalized result, chronological (newest
 * first), live from Firebase. Used by the public history page and the admin
 * console. Theme-aware (admin shell has light mode; the public site is
 * always dark). Read-only.
 */
export function HistoryLedger() {
  const [history, setHistory] = useState<AuctionHistoryRecord[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);

  useEffect(() => {
    const isRealtime =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("realtime") === "true";

    const subHistory = isRealtime ? subscribeFirebaseHistory : subscribeSpectatorHistory;
    const subPlayers = isRealtime ? subscribeFirebasePlayers : subscribeSpectatorPlayers;
    const subClubs = isRealtime ? subscribeFirebaseClubs : subscribeSpectatorClubs;

    const noop = () => undefined;
    const unsubs = [
      subHistory(setHistory, noop),
      subPlayers(setPlayers, noop),
      subClubs(setClubs, noop),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = history === undefined || players === undefined || clubs === undefined;

  const clubsById = new Map((clubs ?? []).map((c) => [c.id, c]));
  const photoById = new Map((players ?? []).map((p) => [p.id, p.photoUrl]));

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if ((history ?? []).length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <History className="size-10 text-zinc-300 dark:text-zinc-700" aria-hidden />
        <div className="space-y-1.5">
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-200">No results yet</h2>
          <p className="max-w-sm text-sm text-zinc-500">
            Every sale and unsold result will be recorded here live, the moment the hammer falls.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className="w-full min-w-0 divide-y divide-zinc-100 dark:divide-white/[0.06]">
      {(history ?? []).map((record, index) => {
        const club = record.clubId ? clubsById.get(record.clubId) : undefined;
        const isSold = record.action === "sold";
        return (
          <li
            key={record.id}
            className="flex min-w-0 items-center gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-50 sm:gap-4 sm:px-6 sm:py-3 dark:hover:bg-white/[0.03]"
          >
            <span className="w-5 shrink-0 text-center font-mono text-[11px] font-bold text-zinc-400 sm:w-8 sm:text-xs dark:text-zinc-600">
              {(history?.length ?? 0) - index}
            </span>
            <PlayerPhoto photoUrl={photoById.get(record.playerId)} name={record.playerName} size={36} className="shrink-0 sm:size-[44px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-100" title={record.playerName}>
                {record.playerName}
              </p>
              <p className="truncate text-[10px] text-zinc-500 sm:text-[11px]">
                Segment {record.segment} · {formatTimestamp(record.timestamp)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
              {isSold && club && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={24} className="sm:size-[30px]" />
                  <span className="hidden max-w-28 truncate text-xs font-semibold text-zinc-600 dark:text-zinc-300 md:inline">
                    {club.name}
                  </span>
                </div>
              )}
              <span
                className={cn(
                  "text-right font-display text-xs font-semibold tabular-nums leading-none sm:w-24 sm:text-xl",
                  isSold ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                )}
              >
                {isSold ? formatPrice(record.finalPrice) : "UNSOLD"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
