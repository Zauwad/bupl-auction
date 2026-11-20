"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Users,
  BadgeDollarSign,
  TrendingUp,
  Pause,
  Play,
  ArrowRight,
  Shield,
  History,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { PlayerPhoto } from "@/components/common/player-photo";
import { ClubLogo } from "@/components/common/club-logo";
import { SEGMENT_COUNT, segmentDisplayName } from "@/lib/constants";
import { computeAuctionStats, topBuyPerSegment } from "@/lib/stats";
import type { Club, Player, TournamentSettings } from "@/types";

interface BroadcastShowcaseCompletedProps {
  players: Player[];
  clubs: Club[];
  settings: TournamentSettings | null;
}

const SCENE_NAMES = [
  "Champions Recap",
  "Top Signings Podium",
  "Round Replay",
  "Squad Leaderboard",
] as const;

const SCENE_INTERVAL_MS = 8000;

export function BroadcastShowcaseCompleted({
  players,
  clubs,
  settings,
}: BroadcastShowcaseCompletedProps) {
  const stats = computeAuctionStats(players, clubs, 8);
  const segmentTopBuys = topBuyPerSegment(players, clubs, SEGMENT_COUNT);

  const [activeScene, setActiveScene] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Top 3 for podium
  const top3 = stats.mostExpensive.slice(0, 3);
  const soldPlayers = players.filter(
    (p) => p.status === "sold" && p.finalPrice !== null,
  );

  // Auto-rotation timer
  useEffect(() => {
    if (isPaused) return;

    const stepMs = 100;
    const increment = (stepMs / SCENE_INTERVAL_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveScene((current) => (current + 1) % SCENE_NAMES.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handleSelectScene = (idx: number) => {
    setActiveScene(idx);
    setProgress(0);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black text-white select-none">
      {/* ════════ STAGE HEADER ════════ */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950 px-3 sm:px-6">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Image
            src="/images/logos/bupl_logo.webp"
            alt="BUPL 2026"
            width={36}
            height={36}
            className="size-8 sm:size-10 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
          />
          <div className="min-w-0">
            <h1 className="font-display text-sm font-black uppercase tracking-wider text-zinc-100 truncate sm:text-lg">
              {settings?.tournamentName ?? "BUPL 2026"}
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate">
              Stage Broadcast · Season Wrap
            </p>
          </div>
        </div>

        {/* Scene Switcher & Play/Pause (Fully responsive on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scrollable scene pills */}
          <div className="flex max-w-[220px] sm:max-w-none items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {SCENE_NAMES.map((name, idx) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelectScene(idx)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-bold transition duration-200 ${
                  activeScene === idx
                    ? "border border-amber-400 bg-amber-400/15 text-amber-300"
                    : "border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {idx + 1}. {name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 shrink-0"
          >
            {isPaused ? (
              <>
                <Play className="size-3 text-amber-400" />
                <span className="hidden md:inline">Resume</span>
              </>
            ) : (
              <>
                <Pause className="size-3 text-amber-400" />
                <span className="hidden md:inline">Pause</span>
              </>
            )}
          </button>

          <span className="hidden xs:inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-sky-400 shrink-0">
            <span className="size-1.5 sm:size-2 rounded-full bg-sky-400" />
            Final
          </span>
        </div>
      </header>

      {/* Progress countdown bar */}
      <div className="h-1 w-full bg-zinc-900">
        <div
          className="h-full bg-amber-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ════════ STAGE MAIN ARENA WITH SMOOTH MOTION ════════ */}
      <main className="relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {/* ── SCENE 0: TOURNAMENT RECAP (HERO BIG IMAGE MAGAZINE DISPLAY) ── */}
          {activeScene === 0 && (
            <motion.div
              key="scene-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-6"
            >
              <div className="grid w-full items-center gap-6 md:grid-cols-12">
                {/* Large Hero Image Section: Record Signing MVP Card */}
                {stats.highestSale && (
                  <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-400/15 via-zinc-900 to-zinc-950 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(251,191,36,0.25)] md:col-span-5 w-full">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-400/20 px-3 py-1 font-mono text-xs font-black uppercase tracking-wider text-amber-300">
                      <Trophy className="size-3.5 text-amber-300" />
                      Record Signing
                    </span>

                    <div className="my-4 sm:my-5">
                      <PlayerPhoto
                        photoUrl={stats.highestSale.player.photoUrl}
                        name={stats.highestSale.player.name}
                        size={144}
                        className="size-32 sm:size-40 md:size-48 rounded-3xl border-4 border-amber-400 bg-black object-cover shadow-[0_0_35px_rgba(251,191,36,0.35)]"
                      />
                    </div>

                    <h3 className="font-display text-2xl sm:text-3xl font-black text-white truncate max-w-full px-2">
                      {stats.highestSale.player.name}
                    </h3>
                    <p className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-amber-400 mt-1">
                      {formatPrice(stats.highestSale.player.finalPrice ?? 0)}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-300 mt-1 truncate max-w-full">
                      Signed by {stats.highestSale.clubName}
                    </p>
                  </div>
                )}

                {/* Tournament Stats & Information Column */}
                <div className="flex flex-col justify-center text-center md:text-left md:col-span-7 w-full">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-400 w-fit mx-auto md:mx-0">
                    <Trophy className="size-3.5" />
                    Tournament Rosters Sealed
                  </div>

                  <h2 className="mt-3 font-display text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-zinc-100">
                    All 50 Players Signed
                  </h2>
                  <p className="mt-2 max-w-xl text-sm sm:text-base text-zinc-400 mx-auto md:mx-0">
                    10 franchise clubs have finalized their 5-player squads across all
                    5 auction segments. Season rosters are officially locked.
                  </p>

                  {/* 4 Scoreboard Dials */}
                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3.5 w-full">
                    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 sm:p-5 text-center">
                      <Users className="mx-auto size-5 text-emerald-400" />
                      <p className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
                        {stats.sold} / {stats.totalPlayers}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Players Signed
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 sm:p-5 text-center">
                      <BadgeDollarSign className="mx-auto size-5 text-amber-400" />
                      <p className="font-display mt-2 text-2xl font-black text-amber-400 sm:text-3xl">
                        {formatPrice(stats.totalSalesValue)}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Total Expenditure
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 sm:p-5 text-center">
                      <TrendingUp className="mx-auto size-5 text-sky-400" />
                      <p className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
                        {formatPrice(stats.averageSale)}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Average Price
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 sm:p-5 text-center">
                      <Shield className="mx-auto size-5 text-purple-400" />
                      <p className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
                        {clubs.length || 10}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Clubs Sealed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SCENE 1: THE GOLDEN HAMMER PODIUM (BIG HERO PORTRAITS) ── */}
          {activeScene === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-5 min-w-0"
            >
              <div className="text-center min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Top 3 Purchases
                </span>
                <h2 className="font-display text-3xl font-black uppercase text-zinc-100 sm:text-5xl truncate">
                  The Golden Hammer Podium
                </h2>
              </div>

              {/* Responsive Podium: Stack #1 on top with gold glow, #2 & #3 side-by-side on mobile */}
              <div className="grid w-full items-end gap-3 pt-2 sm:grid-cols-3 sm:gap-4 min-w-0">
                {/* #2 PODIUM (Left on desktop, column 1 on mobile) */}
                {top3[1] && (
                  <div className="order-2 flex flex-col items-center rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-800/80 via-zinc-900/90 to-zinc-950 p-5 sm:p-6 text-center shadow-lg transition sm:order-1 min-w-0 w-full">
                    <span className="rounded-md border border-zinc-400/50 bg-zinc-400/15 px-2.5 py-0.5 font-mono text-xs font-black uppercase text-zinc-200">
                      #2 Signing
                    </span>

                    <div className="my-3 sm:my-4">
                      <PlayerPhoto
                        photoUrl={top3[1].player.photoUrl}
                        name={top3[1].player.name}
                        size={120}
                        className="size-24 sm:size-32 md:size-36 rounded-2xl border-2 border-zinc-400/50 object-cover shadow-lg"
                      />
                    </div>

                    <h3 className="mt-1 w-full min-w-0 max-w-full truncate font-bold text-zinc-100 text-base sm:text-xl px-1">
                      {top3[1].player.name}
                    </h3>
                    <p className="font-display text-2xl font-black text-zinc-100 mt-0.5 sm:text-3xl">
                      {formatPrice(top3[1].player.finalPrice ?? 0)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 w-full min-w-0 max-w-full truncate px-1">
                      {top3[1].clubName}
                    </p>
                  </div>
                )}

                {/* #1 PODIUM (Center on desktop, top on mobile) */}
                {top3[0] && (
                  <div className="order-1 flex flex-col items-center rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-400/20 via-zinc-900 to-zinc-950 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(251,191,36,0.35)] sm:order-2 min-w-0 w-full">
                    <span className="rounded-md border border-amber-400 bg-amber-400/25 px-3 py-1 font-mono text-xs font-black uppercase text-amber-300">
                      #1 Record Buy
                    </span>

                    <div className="my-4 sm:my-5">
                      <PlayerPhoto
                        photoUrl={top3[0].player.photoUrl}
                        name={top3[0].player.name}
                        size={160}
                        className="size-32 sm:size-44 md:size-52 rounded-3xl border-4 border-amber-400 bg-black object-cover shadow-[0_0_35px_rgba(251,191,36,0.45)]"
                      />
                    </div>

                    <h3 className="mt-1 w-full min-w-0 max-w-full truncate font-black text-zinc-100 text-xl sm:text-3xl px-1">
                      {top3[0].player.name}
                    </h3>
                    <p className="font-display text-3xl font-black text-amber-400 mt-0.5 sm:text-5xl">
                      {formatPrice(top3[0].player.finalPrice ?? 0)}
                    </p>
                    <p className="text-xs font-semibold text-zinc-300 mt-1 w-full min-w-0 max-w-full truncate sm:text-sm px-1">
                      Signed by {top3[0].clubName}
                    </p>
                  </div>
                )}

                {/* #3 PODIUM (Right on desktop, column 2 on mobile) */}
                {top3[2] && (
                  <div className="order-3 flex flex-col items-center rounded-3xl border border-white/15 bg-gradient-to-b from-amber-950/40 via-zinc-900/90 to-zinc-950 p-5 sm:p-6 text-center shadow-lg transition min-w-0 w-full">
                    <span className="rounded-md border border-amber-700/50 bg-amber-700/20 px-2.5 py-0.5 font-mono text-xs font-black uppercase text-amber-500">
                      #3 Signing
                    </span>

                    <div className="my-3 sm:my-4">
                      <PlayerPhoto
                        photoUrl={top3[2].player.photoUrl}
                        name={top3[2].player.name}
                        size={120}
                        className="size-24 sm:size-32 md:size-36 rounded-2xl border-2 border-amber-700/50 object-cover shadow-lg"
                      />
                    </div>

                    <h3 className="mt-1 w-full min-w-0 max-w-full truncate font-bold text-zinc-100 text-base sm:text-xl px-1">
                      {top3[2].player.name}
                    </h3>
                    <p className="font-display text-2xl font-black text-amber-500 mt-0.5 sm:text-3xl">
                      {formatPrice(top3[2].player.finalPrice ?? 0)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 w-full min-w-0 max-w-full truncate px-1">
                      {top3[2].clubName}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SCENE 2: SEGMENT ROUNDS REPLAY (BIG SPORTS CARD LINEUP) ── */}
          {activeScene === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-5"
            >
              <div className="text-center">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Round Leaders
                </span>
                <h2 className="font-display text-3xl font-black uppercase text-zinc-100 sm:text-5xl">
                  Segment Signings
                </h2>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {segmentTopBuys.map((seg) => (
                  <div
                    key={seg.segment}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 transition shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                          Segment {seg.segment}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {seg.soldCount} sold
                        </span>
                      </div>

                      <h4 className="mt-2 text-xs sm:text-sm font-bold text-zinc-200 truncate">
                        {segmentDisplayName(seg.segment)}
                      </h4>

                      {seg.player ? (
                        <div className="mt-3 flex flex-col items-center text-center">
                          <PlayerPhoto
                            photoUrl={seg.player.photoUrl}
                            name={seg.player.name}
                            size={96}
                            className="size-20 sm:size-24 md:size-28 rounded-2xl border-2 border-amber-400/40 bg-zinc-950 object-cover shadow-lg"
                          />
                          <p className="mt-2.5 truncate w-full max-w-full text-xs sm:text-sm font-black text-zinc-100">
                            {seg.player.name}
                          </p>
                          <p className="font-display text-lg sm:text-xl font-black text-amber-400">
                            {formatPrice(seg.player.finalPrice ?? 0)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-6 text-xs text-zinc-500 text-center">
                          No sales recorded
                        </p>
                      )}
                    </div>

                    {seg.club && (
                      <div className="mt-3 border-t border-white/10 pt-2 text-[10px] sm:text-[11px] text-zinc-400 truncate text-center font-medium">
                        {seg.club.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── SCENE 3: CLUB SQUAD LEADERBOARD (ENLARGED CRESTS & SCROLLBAR) ── */}
          {activeScene === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-5"
            >
              <div className="text-center">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Rosters & Balances
                </span>
                <h2 className="font-display text-3xl font-black uppercase text-zinc-100 sm:text-5xl">
                  Squad Completion Board
                </h2>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5 scrollbar-dark max-h-[60vh] overflow-y-auto p-1">
                {clubs.map((club) => {
                  const boughtCount = players.filter(
                    (p) => p.status === "sold" && p.purchasedByClubId === club.id,
                  ).length;
                  return (
                    <div
                      key={club.id}
                      className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 transition shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <ClubLogo
                            logoUrl={club.logoUrl}
                            name={club.name}
                            size={44}
                            className="size-11 sm:size-12 rounded-xl border border-white/10 p-1 bg-black/40 shadow-sm"
                          />
                          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-emerald-400">
                            {boughtCount}/5 Squad
                          </span>
                        </div>
                        <h4 className="mt-3 line-clamp-1 text-xs sm:text-sm font-bold text-zinc-100">
                          {club.name}
                        </h4>
                      </div>

                      <div className="mt-3.5 border-t border-white/10 pt-2 text-[11px]">
                        <div className="flex justify-between items-center text-zinc-400">
                          <span>Left:</span>
                          <strong className="font-mono text-xs sm:text-sm text-zinc-100">
                            {formatPrice(club.remainingBudget)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ════════ BOTTOM TV NEWS TICKER (SLOW, CALM SPEED) ════════ */}
      <footer className="flex h-11 sm:h-12 shrink-0 items-center border-t border-amber-400/20 bg-zinc-950 px-3 sm:px-4 text-xs">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pr-3 sm:pr-4 border-r border-white/10 font-bold uppercase tracking-wider text-amber-400">
          <History className="size-3.5" />
          <span>Ledger</span>
        </div>

        <div className="relative flex-1 overflow-hidden whitespace-nowrap pl-3 sm:pl-4">
          <div className="animate-ticker text-zinc-300">
            {soldPlayers.map((p, idx) => {
              const club = clubs.find((c) => c.id === p.purchasedByClubId);
              return (
                <span key={p.id} className="inline-flex items-center gap-2 mr-8">
                  <span className="font-mono font-bold text-amber-400">
                    #{idx + 1}
                  </span>
                  <strong className="text-zinc-100">{p.name}</strong>
                  <span className="text-zinc-400">to {club?.name ?? "Club"}</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ({formatPrice(p.finalPrice ?? 0)})
                  </span>
                  <span className="text-zinc-600">·</span>
                </span>
              );
            })}
          </div>
        </div>

        <Link
          href="/"
          className="ml-3 sm:ml-4 shrink-0 inline-flex items-center gap-1 font-bold text-amber-400 hover:underline"
        >
          <span className="hidden xs:inline">Exit to</span>
          <span>Recap</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </footer>
    </div>
  );
}
