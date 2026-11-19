"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BadgeDollarSign,
  BadgeCheck,
  Gavel,
  TrendingUp,
  Shield,
} from "lucide-react";
import { subscribeClubs, subscribePlayers } from "@/lib/firebase";
import { computeAuctionStats, salesBySegment } from "@/lib/stats";
import { formatPrice } from "@/lib/format";
import { PlayerPhoto } from "@/components/common/player-photo";
import { ClubLogo } from "@/components/common/club-logo";
import { SEGMENT_COUNT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Club, Player } from "@/types";

function clubAccent(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360} 70% 55%)`;
}

/** Public final statistics — every figure computed live from raw records. */
export function StatsPageClient() {
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);

  useEffect(() => {
    const unsubs = [
      subscribePlayers(setPlayers, () => undefined),
      subscribeClubs(setClubs, () => undefined),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = players === undefined || clubs === undefined;
  const stats = useMemo(
    () => computeAuctionStats(players ?? [], clubs ?? [], 8),
    [players, clubs],
  );
  const bySegment = useMemo(
    () => salesBySegment(players ?? [], SEGMENT_COUNT),
    [players],
  );
  const maxPrice = stats.mostExpensive[0]?.player.finalPrice ?? 0;
  const maxSpent = stats.clubStats[0]?.spent ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-zinc-50">
            <BarChart3 className="size-6 text-amber-400" aria-hidden />
            Final Statistics
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Highest buys, biggest spenders and the shape of the room — computed from the ledger, live.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      ) : stats.sold === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <BarChart3 className="size-10 text-zinc-700" aria-hidden />
          <div className="space-y-1.5">
            <h2 className="font-semibold text-zinc-300">Nothing to chart yet</h2>
            <p className="max-w-sm text-sm text-zinc-500">
              Statistics fill in as the auction runs — every figure here is computed from actual
              sales records, never counters.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: BadgeDollarSign, label: "Total sales value", value: formatPrice(stats.totalSalesValue), tone: "text-amber-400" },
              { icon: BadgeCheck, label: "Players sold", value: String(stats.sold), tone: "text-emerald-400" },
              { icon: Gavel, label: "Unsold", value: String(stats.unsold), tone: "text-red-400" },
              { icon: TrendingUp, label: "Average sale", value: formatPrice(stats.averageSale), tone: "text-sky-400" },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
                <Icon className="size-4 text-zinc-500" aria-hidden />
                <p className={cn("mt-2 font-mono text-lg font-black tabular-nums sm:text-2xl", tone)} title={value}>
                  {value}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* Most expensive buys */}
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 lg:col-span-2">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
                Most expensive buys
              </h2>
              <ol className="mt-4 space-y-2.5">
                {stats.mostExpensive.map(({ player, clubName }, index) => {
                  const pct = maxPrice > 0 ? ((player.finalPrice ?? 0) / maxPrice) * 100 : 0;
                  return (
                    <li key={player.id} className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-center font-mono text-xs font-black text-zinc-600">
                        {index + 1}
                      </span>
                      <PlayerPhoto photoUrl={player.photoUrl} name={player.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-bold text-zinc-100" title={player.name}>
                            {player.name}
                          </p>
                          <p className="shrink-0 font-mono text-sm font-black tabular-nums text-amber-400">
                            {formatPrice(player.finalPrice)}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="max-w-24 truncate text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                            {clubName}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Club ledger */}
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 lg:col-span-3">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
                <Shield className="size-4" aria-hidden /> Club ledger
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      <th className="pb-2 pr-3">Club</th>
                      <th className="pb-2 pr-3 text-center">Players</th>
                      <th className="pb-2 pr-3 text-right">Spent</th>
                      <th className="pb-2 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {stats.clubStats.map((row) => {
                      const pct = maxSpent > 0 ? (row.spent / maxSpent) * 100 : 0;
                      const isTopSpender = stats.mostSpent?.club.id === row.club.id && row.spent > 0;
                      return (
                        <tr key={row.club.id}>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2.5">
                              <ClubLogo logoUrl={row.club.logoUrl} name={row.club.name} abbreviation={row.club.abbreviation} size={30} />
                              <div className="min-w-0">
                                <p className="max-w-36 truncate font-bold text-zinc-100" title={row.club.name}>
                                  {row.club.name}
                                </p>
                                {isTopSpender && (
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500">
                                    Top spender
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-center font-mono font-bold text-zinc-300">
                            {row.playersBought}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: clubAccent(row.club.name) }}
                                />
                              </div>
                              <span className="font-mono text-xs font-bold tabular-nums text-zinc-200">
                                {formatPrice(row.spent)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 text-right font-mono text-xs font-bold tabular-nums text-emerald-400">
                            {formatPrice(row.remaining)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Sales by segment */}
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
              Sales by segment
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {bySegment.map((s) => (
                <div key={s.segment} className="rounded-xl border border-white/[0.08] bg-zinc-950/50 p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                    Segment {s.segment}
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-zinc-200">
                    {s.sold} sold · {s.unsold} unsold
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-amber-400/90">
                    {formatPrice(s.salesValue)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
