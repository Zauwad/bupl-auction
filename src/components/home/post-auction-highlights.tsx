"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  ArrowRight,
  TrendingUp,
  Users,
  BadgeDollarSign,
  History,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { PlayerPhoto } from "@/components/common/player-photo";
import { ClubLogo } from "@/components/common/club-logo";
import { SEGMENT_COUNT, segmentDisplayName } from "@/lib/constants";
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

  const marqueeBuys = stats.mostExpensive.slice(0, 5);
  const totalClubs = clubs.length || 10;
  const clearanceRate =
    stats.totalPlayers > 0
      ? Math.round((stats.sold / stats.totalPlayers) * 100)
      : 0;

  // ════════ SLIDESHOW STATE ════════
  const SLIDE_DURATION = 5500;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);

  // ════════ SEGMENT TAB STATE ════════
  const [activeSegmentTab, setActiveSegmentTab] = useState(1);

  // Slideshow auto-advance with smooth progress bar
  useEffect(() => {
    if (marqueeBuys.length <= 1) return;
    if (isSlidePaused) return;

    const stepMs = 50;
    const increment = (stepMs / SLIDE_DURATION) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((cur) => (cur + 1) % marqueeBuys.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [marqueeBuys.length, isSlidePaused]);

  const goToSlide = (idx: number) => {
    setCurrentSlide(idx);
    setSlideProgress(0);
  };

  const activeMarquee = marqueeBuys[currentSlide] ?? marqueeBuys[0];
  const activeMarqueeMultiplier =
    activeMarquee &&
    activeMarquee.player.basePrice > 0 &&
    activeMarquee.player.finalPrice
      ? (
          activeMarquee.player.finalPrice / activeMarquee.player.basePrice
        ).toFixed(1)
      : null;
  const activeMarqueeClub = activeMarquee
    ? clubs.find((c) => c.id === activeMarquee.player.purchasedByClubId)
    : null;

  const currentSegmentData = segmentTopBuys.find(
    (s) => s.segment === activeSegmentTab,
  );

  return (
    <div className="relative flex w-full max-w-full min-w-0 flex-col gap-12 sm:gap-16 overflow-hidden">
      {/* ════════ 1. HERO CELEBRATION BANNER ════════ */}
      <section className="relative overflow-hidden pt-6 pb-2 min-w-0 w-full">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_65%)]"
        />

        <div className="relative mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-14">


          <div className="flex flex-col gap-3 min-w-0 w-full">
            <h1 className="max-w-4xl text-2xl font-black uppercase leading-tight tracking-tight text-zinc-50 xs:text-3xl sm:text-6xl md:text-7xl break-words">
              {settings?.tournamentName ?? "BUPL 2026 Cricket Auction"}{" "}
              <span className="text-amber-400">Final Recap</span>
            </h1>
            <p className="max-w-2xl text-sm text-zinc-300 sm:text-lg">
              The final hammer has dropped. All {SEGMENT_COUNT} segments are
              complete, and all {totalClubs} club franchises have finalized their
              season rosters.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
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

      {/* ════════ 2. MARQUEE SIGNINGS SLIDESHOW (AUTOPLAY CAROUSEL) ════════ */}
      {marqueeBuys.length > 0 && activeMarquee && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 min-w-0">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between min-w-0">
            <div>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
                Tournament Top Signings
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-400">
                {currentSlide + 1} of {marqueeBuys.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous marquee signing"
                  onClick={() =>
                    goToSlide(
                      currentSlide === 0
                        ? marqueeBuys.length - 1
                        : currentSlide - 1,
                    )
                  }
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next marquee signing"
                  onClick={() =>
                    goToSlide((currentSlide + 1) % marqueeBuys.length)
                  }
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Slide Card with AnimatePresence & Progress Bar */}
          <div
            onMouseEnter={() => setIsSlidePaused(true)}
            onMouseLeave={() => setIsSlidePaused(false)}
            className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-4 sm:p-7 shadow-xl"
          >
            {/* Minimal slide timer progress bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 transition-[width] duration-75 ease-linear"
                style={{ width: `${slideProgress}%` }}
              />
            </div>

            {/* Top row badges */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="rounded-md border border-amber-400/50 bg-amber-400/20 px-2.5 py-1 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
                  #{currentSlide + 1} Overall Signing
                </span>
                <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] sm:text-xs font-semibold text-zinc-400">
                  Segment {activeMarquee.player.segment} ·{" "}
                  {segmentDisplayName(activeMarquee.player.segment)}
                </span>
              </div>

              {activeMarqueeMultiplier &&
                Number(activeMarqueeMultiplier) > 1 && (
                  <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] sm:text-xs font-bold text-emerald-400">
                    {activeMarqueeMultiplier}x base bid
                  </span>
                )}
            </div>

            {/* Slide content body with smooth motion crossfade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMarquee.player.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 sm:mt-6 grid grid-cols-1 items-center gap-4 sm:gap-6 md:grid-cols-12 min-w-0 w-full"
              >
                <div className="flex min-w-0 w-full items-center gap-3 sm:gap-5 md:col-span-8">
                  <PlayerPhoto
                    photoUrl={activeMarquee.player.photoUrl}
                    name={activeMarquee.player.name}
                    size={84}
                    className="size-16 sm:size-24 shrink-0 rounded-2xl border-2 border-amber-400/40 bg-zinc-950 object-cover shadow-lg"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {activeMarquee.player.category ?? "University Player"}
                    </span>
                    <h3 className="truncate text-lg font-black text-zinc-100 sm:text-2xl md:text-3xl">
                      {activeMarquee.player.name}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-baseline gap-2 sm:gap-3">
                      <span className="font-display text-2xl font-black text-amber-400 sm:text-4xl">
                        {formatPrice(activeMarquee.player.finalPrice ?? 0)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Base: {formatPrice(activeMarquee.player.basePrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Winning club details */}
                <div className="flex min-w-0 w-full flex-col justify-center rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 md:col-span-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Winning Franchise
                  </span>
                  <div className="mt-2 flex min-w-0 items-center gap-3">
                    <ClubLogo
                      logoUrl={activeMarqueeClub?.logoUrl}
                      name={activeMarquee.clubName}
                      size={36}
                      className="shrink-0 rounded-lg border border-white/10 p-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm sm:text-base font-bold text-zinc-100">
                        {activeMarquee.clubName}
                      </p>
                      {activeMarqueeClub && (
                        <Link
                          href={`/squads/${activeMarqueeClub.id}`}
                          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                        >
                          Inspect squad <ArrowRight className="size-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide dots (clean, no directive text) */}
            <div className="mt-5 sm:mt-6 flex items-center justify-center border-t border-white/10 pt-4 w-full min-w-0">
              <div className="flex items-center gap-1.5">
                {marqueeBuys.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Jump to slide ${idx + 1}`}
                    onClick={() => goToSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide
                        ? "w-8 bg-amber-400"
                        : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ 3. BENTO TOURNAMENT KEY METRICS ════════ */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {/* Card 1: Total Spend */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Total Expenditure
              </span>
              <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400">
                <BadgeDollarSign className="size-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="font-display text-3xl font-black tabular-nums text-zinc-50 sm:text-4xl">
                {formatPrice(stats.totalSalesValue)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Aggregated spend across all 10 franchises
              </p>
            </div>
          </div>

          {/* Card 2: Players Sold */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Players Sold
              </span>
              <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
                <Users className="size-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="font-display text-3xl font-black tabular-nums text-zinc-50 sm:text-4xl">
                {stats.sold}{" "}
                <span className="text-lg font-normal text-zinc-500">
                  / {stats.totalPlayers}
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-400">
                {clearanceRate}% clearance rate
              </p>
            </div>
          </div>

          {/* Card 3: Record Signing */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Record Signing
              </span>
              <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400">
                <Trophy className="size-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="font-display text-3xl font-black tabular-nums text-amber-400 sm:text-4xl">
                {stats.highestSale
                  ? formatPrice(stats.highestSale.player.finalPrice ?? 0)
                  : "—"}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-300">
                {stats.highestSale?.player.name ?? "None recorded"}
              </p>
            </div>
          </div>

          {/* Card 4: Average Sale */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Average Sale
              </span>
              <div className="rounded-lg bg-sky-400/10 p-2 text-sky-400">
                <TrendingUp className="size-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="font-display text-3xl font-black tabular-nums text-zinc-50 sm:text-4xl">
                {formatPrice(stats.averageSale)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Per signed player across 5 segments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 4. INTERACTIVE SEGMENT ROUNDS ════════ */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
            <Layers className="size-4" />
            Round By Round
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
            Segment Results
          </h2>
        </div>

        {/* Scrollable Segment Tabs (Responsive) */}
        <div className="flex gap-2 overflow-x-auto pb-3 border-b border-white/10 no-scrollbar sm:flex-wrap w-full min-w-0 overscroll-contain">
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => i + 1).map((seg) => {
            const isSelected = activeSegmentTab === seg;
            return (
              <button
                key={seg}
                type="button"
                onClick={() => setActiveSegmentTab(seg)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition duration-200 ${
                  isSelected
                    ? "border border-amber-400 bg-amber-400/10 text-amber-300"
                    : "border border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                Segment {seg}: {segmentDisplayName(seg)}
              </button>
            );
          })}
        </div>

        {/* Selected Segment Detail Card with AnimatePresence */}
        {currentSegmentData ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSegmentData.segment}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:items-center min-w-0 w-full">
                <div className="w-full min-w-0 md:col-span-7">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    Segment {currentSegmentData.segment}
                  </span>
                  <h3 className="mt-1 text-xl sm:text-2xl font-black text-zinc-100 truncate">
                    {segmentDisplayName(currentSegmentData.segment)}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
                    {currentSegmentData.soldCount} players signed during this
                    segment round.
                  </p>

                  {currentSegmentData.player && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                      <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                        Category:{" "}
                        <strong className="text-zinc-100">
                          {currentSegmentData.player.category ?? "Player"}
                        </strong>
                      </span>
                      <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                        Base bid:{" "}
                        <strong className="text-zinc-100">
                          {formatPrice(currentSegmentData.player.basePrice)}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Segment top buy preview */}
                <div className="w-full min-w-0 rounded-xl border border-white/10 bg-black/40 p-3.5 sm:p-4 md:col-span-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Round Highest Bid
                  </span>
                  {currentSegmentData.player ? (
                    <div className="mt-2.5 flex min-w-0 items-center gap-3 sm:gap-4">
                      <PlayerPhoto
                        photoUrl={currentSegmentData.player.photoUrl}
                        name={currentSegmentData.player.name}
                        size={56}
                        className="size-14 shrink-0 rounded-xl border border-amber-400/40 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm sm:text-base font-bold text-zinc-100">
                          {currentSegmentData.player.name}
                        </h4>
                        <p className="font-display text-lg sm:text-xl font-black text-amber-400">
                          {formatPrice(currentSegmentData.player.finalPrice ?? 0)}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          Signed by{" "}
                          <strong className="text-zinc-200">
                            {currentSegmentData.club?.name ?? "Club"}
                          </strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-zinc-500">
                      No sales recorded in this segment
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </section>

      {/* ════════ 5. TOP SPENDING CLUBS LEADERBOARD ════════ */}
      {stats.clubStats.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
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
              View squad rosters <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto scrollbar-dark rounded-xl border border-white/10 bg-white/[0.02] pb-1.5">
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
        <div className="mb-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
            <Users className="size-4" />
            Official Squads
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:text-3xl">
            All {totalClubs} Club Rosters
          </h2>
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
