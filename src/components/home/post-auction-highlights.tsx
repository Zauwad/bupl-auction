"use client";

import Link from "next/link";
import {
  Trophy,
  ArrowRight,
  TrendingUp,
  Users,
  BadgeDollarSign,
  History,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { PlayerPhoto } from "@/components/common/player-photo";
import { ClubLogo } from "@/components/common/club-logo";
import { SEGMENT_COUNT } from "@/lib/constants";
import { computeAuctionStats, topBuyPerSegment } from "@/lib/stats";
import type { Club, Player, TournamentSettings } from "@/types";

interface PostAuctionHighlightsProps {
  players: Player[];
  clubs: Club[];
  settings: TournamentSettings | null;
}

export function PostAuctionHighlights({
  players,
  clubs,
  settings,
}: PostAuctionHighlightsProps) {
  const stats = computeAuctionStats(players, clubs, 8);
  const segmentTopBuys = topBuyPerSegment(players, clubs, SEGMENT_COUNT);

  const top3 = stats.mostExpensive.slice(0, 3);
  const totalClubs = clubs.length || 10;
  const clearanceRate = stats.totalPlayers > 0
    ? Math.round((stats.sold / stats.totalPlayers) * 100)
    : 0;

  return (
    <div className="flex w-full flex-col gap-12 sm:gap-16">
      {/* ════════ 1. HERO CELEBRATION BANNER ════════ */}
      <section className="relative overflow-hidden pt-6 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 hidden size-[480px] -translate-y-1/2 rounded-full border border-amber-400/10 lg:block"
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400 sm:text-xs">
              <Sparkles className="size-3.5 text-amber-400" />
              Official Auction Concluded · Season Rosters Finalized
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="max-w-4xl text-3xl font-black uppercase leading-[0.95] tracking-tight text-zinc-50 xs:text-4xl sm:text-6xl md:text-7xl">
              {settings?.tournamentName ?? "BUPL Cricket Auction"}{" "}
              <span className="text-amber-400">Final Recap</span>
            </h1>
            <p className="max-w-2xl text-base text-zinc-400 sm:text-lg">
              The final hammer has fallen. All {SEGMENT_COUNT} segments are complete,
              all {totalClubs} club franchises have finalized their squads, and the
              tournament rosters are officially locked.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/squads"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300"
            >
              <Users className="size-4" aria-hidden />
              Explore Club Squads
              <ArrowRight className="size-4" aria-hidden />
            </Link>

            <Link
              href="/history"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-bold uppercase tracking-wider text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
            >
              <History className="size-4" aria-hidden />
              Bid History
            </Link>

            <div className="flex items-center gap-2 pl-1 text-xs font-semibold text-zinc-400 sm:ml-2">
              <span>Quick links:</span>
              <Link
                href="/live"
                className="underline decoration-zinc-600 underline-offset-4 transition hover:text-amber-400"
              >
                Stage Replay
              </Link>
              <span>·</span>
              <Link
                href="/stats"
                className="underline decoration-zinc-600 underline-offset-4 transition hover:text-amber-400"
              >
                Deep Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 2. TOURNAMENT KEY METRICS BAR ════════ */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-y divide-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <BadgeDollarSign className="size-5 text-amber-400" aria-hidden />
            <span className="font-display text-2xl font-black tabular-nums text-zinc-50 sm:text-3xl">
              {formatPrice(stats.totalSalesValue)}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Total Spend
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <Users className="size-5 text-emerald-400" aria-hidden />
            <span className="font-display text-2xl font-black tabular-nums text-zinc-50 sm:text-3xl">
              {stats.sold}{" "}
              <span className="text-sm font-normal text-zinc-500">
                / {stats.totalPlayers}
              </span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Players Sold ({clearanceRate}%)
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <Trophy className="size-5 text-amber-400" aria-hidden />
            <span className="font-display text-2xl font-black tabular-nums text-zinc-50 sm:text-3xl">
              {stats.highestSale ? formatPrice(stats.highestSale.player.finalPrice ?? 0) : "—"}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Record Signing
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <TrendingUp className="size-5 text-sky-400" aria-hidden />
            <span className="font-display text-2xl font-black tabular-nums text-zinc-50 sm:text-3xl">
              {formatPrice(stats.averageSale)}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Average Sale
            </span>
          </div>
        </div>
      </section>

      {/* ════════ 3. GOLDEN HAMMER PODIUM (TOP 3 BUYS) ════════ */}
      {top3.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                <Trophy className="size-4" />
                Marquee Buys
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
                The Golden Hammer Podium
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Highest bids finalized during the live auction
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top3.map(({ player, clubName }, idx) => {
              const rank = idx + 1;
              const multiplier =
                player.basePrice > 0 && player.finalPrice
                  ? (player.finalPrice / player.basePrice).toFixed(1)
                  : null;
              const club = clubs.find((c) => c.id === player.purchasedByClubId);

              const badgeColors =
                rank === 1
                  ? "border-amber-400/50 bg-amber-400/20 text-amber-300"
                  : rank === 2
                    ? "border-zinc-300/50 bg-zinc-300/20 text-zinc-200"
                    : "border-amber-700/50 bg-amber-700/20 text-amber-500";

              return (
                <div
                  key={player.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 transition hover:border-amber-400/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-black tracking-wider ${badgeColors}`}
                    >
                      <Trophy className="size-3" />
                      #{rank} SIGNING
                    </span>

                    {multiplier && Number(multiplier) > 1 && (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                        {multiplier}x base
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <PlayerPhoto
                      photoUrl={player.photoUrl}
                      name={player.name}
                      size={72}
                      className="rounded-xl border border-white/10 shadow-md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Segment {player.segment} · {player.category ?? "Player"}
                      </p>
                      <h3 className="truncate text-lg font-black text-zinc-100">
                        {player.name}
                      </h3>
                      <p className="mt-1 font-display text-2xl font-black text-amber-400">
                        {formatPrice(player.finalPrice ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-3 text-xs text-zinc-400">
                    <ClubLogo
                      logoUrl={club?.logoUrl}
                      name={clubName}
                      size={20}
                      className="shrink-0"
                    />
                    <span className="truncate">
                      Signed by <strong className="text-zinc-200">{clubName}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ════════ 4. SEGMENT-BY-SEGMENT MARQUEE BUYS ════════ */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">
              <Layers className="size-4" />
              Round Champions
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
              Segment Marquee Signings
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Top buy in each of the 5 auction segments
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {segmentTopBuys.map((seg) => (
            <div
              key={seg.segment}
              className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-amber-400/30"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Segment {seg.segment}
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {seg.soldCount} sold
                </span>
              </div>

              {seg.player ? (
                <div className="mt-3 flex flex-1 flex-col justify-between">
                  <div>
                    <div className="mb-2.5">
                      <PlayerPhoto
                        photoUrl={seg.player.photoUrl}
                        name={seg.player.name}
                        size={56}
                        className="rounded-lg border border-white/10"
                      />
                    </div>
                    <p className="truncate text-sm font-bold text-zinc-100">
                      {seg.player.name}
                    </p>
                    <p className="font-display text-base font-black text-amber-400">
                      {formatPrice(seg.player.finalPrice ?? 0)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-white/5 pt-2 text-[11px] text-zinc-400">
                    <ClubLogo
                      logoUrl={seg.club?.logoUrl}
                      name={seg.club?.name ?? "Club"}
                      size={16}
                      className="shrink-0"
                    />
                    <span className="truncate">{seg.club?.name ?? "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-1 items-center justify-center text-xs text-zinc-500">
                  No sales recorded
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ════════ 5. TOP SPENDING CLUBS LEADERBOARD ════════ */}
      {stats.clubStats.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                <Shield className="size-4" />
                Franchise Investment
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
                Club Spending Leaderboard
              </h2>
            </div>
            <Link
              href="/squads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:underline"
            >
              View detailed squad rosters <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3 text-right">Players Signed</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3 text-right">Remaining Purse</th>
                  <th className="px-4 py-3 text-right">Budget Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {stats.clubStats.map((cs, idx) => (
                  <tr
                    key={cs.club.id}
                    className="transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-zinc-500">#{idx + 1}</td>
                    <td className="px-4 py-3 font-sans font-bold text-zinc-100">
                      <Link
                        href={`/squads/${cs.club.id}`}
                        className="inline-flex items-center gap-2.5 transition hover:text-amber-400"
                      >
                        <ClubLogo
                          logoUrl={cs.club.logoUrl}
                          name={cs.club.name}
                          size={24}
                          className="shrink-0"
                        />
                        <span className="truncate">{cs.club.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {cs.playersBought}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-400">
                      {formatPrice(cs.spent)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {formatPrice(cs.remaining)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-300">
                      {Math.round(cs.spentPct)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ════════ 6. COMPLETE 10-CLUB FINAL ROSTERS QUICK-GRID ════════ */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">
              <Users className="size-4" />
              Official Squads
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
              All {totalClubs} Club Rosters
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Click any club to inspect their complete player roster and purchases
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {clubs.map((club) => {
            const clubSold = players.filter(
              (p) => p.status === "sold" && p.purchasedByClubId === club.id,
            );
            return (
              <Link
                key={club.id}
                href={`/squads/${club.id}`}
                className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-amber-400/50 hover:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <ClubLogo
                      logoUrl={club.logoUrl}
                      name={club.name}
                      size={48}
                      className="rounded-lg border border-white/10 p-1"
                    />
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {clubSold.length} Players
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-sm font-bold text-zinc-100 group-hover:text-amber-400">
                    {club.name}
                  </h3>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-zinc-400">
                  <span>Purse left:</span>
                  <span className="font-mono font-bold text-zinc-200">
                    {formatPrice(club.remainingBudget)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
