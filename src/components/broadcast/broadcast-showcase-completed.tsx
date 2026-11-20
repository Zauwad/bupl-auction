"use client";

import { useState, useEffect, useMemo } from "react";
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
  Gavel,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { ClubLogo } from "@/components/common/club-logo";
import { SEGMENT_COUNT, segmentDisplayName } from "@/lib/constants";
import { computeAuctionStats, topBuyPerSegment } from "@/lib/stats";
import type { Club, Player, TournamentSettings } from "@/types";

interface BroadcastShowcaseCompletedProps {
  players: Player[];
  clubs: Club[];
  settings: TournamentSettings | null;
}

const VIEW_TABS = [
  { id: "top", label: "Top Signings" },
  { id: "seg-1", label: "Seg 1: Game Changer", segment: 1 },
  { id: "seg-2", label: "Seg 2: Stroke Maker", segment: 2 },
  { id: "seg-3", label: "Seg 3: Trump Card", segment: 3 },
  { id: "seg-4", label: "Seg 4: Assassin", segment: 4 },
  { id: "seg-5", label: "Seg 5: Young Blood", segment: 5 },
  { id: "stats", label: "Tournament Stats" },
] as const;

const AUTO_ROTATE_INTERVAL_MS = 9000;

export function BroadcastShowcaseCompleted({
  players,
  clubs,
}: BroadcastShowcaseCompletedProps) {
  const stats = computeAuctionStats(players, clubs, 8);
  const segmentTopBuys = topBuyPerSegment(players, clubs, SEGMENT_COUNT);

  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const activeTab = VIEW_TABS[activeTabIdx];

  // Map of clubs
  const clubById = useMemo(() => {
    const map = new Map<string, Club>();
    for (const c of clubs) map.set(c.id, c);
    return map;
  }, [clubs]);

  // Players to display in the 10-card grid depending on active tab
  const displayPlayers = useMemo(() => {
    if (activeTab.id === "top") {
      return stats.mostExpensive.slice(0, 10).map((m) => m.player);
    }
    if ("segment" in activeTab && activeTab.segment) {
      return players
        .filter((p) => p.segment === activeTab.segment && p.status === "sold")
        .slice(0, 10);
    }
    // Tournament stats view
    return stats.mostExpensive.slice(0, 10).map((m) => m.player);
  }, [activeTab, players, stats.mostExpensive]);

  // Featured player in Left Spotlight Stage
  const featuredPlayer = useMemo(() => {
    if (selectedPlayerId) {
      const found = players.find((p) => p.id === selectedPlayerId);
      if (found) return found;
    }
    if (displayPlayers.length > 0) {
      return displayPlayers[0];
    }
    return stats.highestSale?.player ?? players[0] ?? null;
  }, [selectedPlayerId, displayPlayers, stats.highestSale, players]);

  const featuredClub = featuredPlayer
    ? clubById.get(featuredPlayer.purchasedByClubId ?? "")
    : null;

  const soldPlayers = useMemo(
    () => players.filter((p) => p.status === "sold" && p.finalPrice !== null),
    [players],
  );

  // Auto-advance tabs
  useEffect(() => {
    if (isPaused) return;

    const stepMs = 50;
    const increment = (stepMs / AUTO_ROTATE_INTERVAL_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveTabIdx((current) => (current + 1) % VIEW_TABS.length);
          setSelectedPlayerId(null);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handleSelectTab = (idx: number) => {
    setActiveTabIdx(idx);
    setSelectedPlayerId(null);
    setProgress(0);
  };

  const isHighestOverall =
    featuredPlayer && stats.highestSale?.player.id === featuredPlayer.id;

  return (
    <div className="flex min-h-screen w-screen flex-col overflow-x-hidden bg-black text-white select-none xl:h-screen xl:min-h-0 xl:overflow-hidden">
      {/* ════════ TOP BAR — EXACT LUXURY STAGE HEADER ════════ */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-red-900/40 bg-gradient-to-r from-[#2a1418] via-zinc-950 to-[#2a1418] px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <Image
            src="/images/logos/cbu_logo.webp"
            alt="Cricket BRAC University"
            width={56}
            height={56}
            className="size-10 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.35)] sm:size-12"
          />
          <div className="leading-tight">
            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-sky-400 sm:text-[9px] sm:tracking-[0.4em]">
              Cricket BRAC University
            </p>
            <h1 className="font-display text-lg font-bold uppercase leading-none tracking-wide text-zinc-50 sm:text-2xl lg:text-3xl">
              Player <span className="text-amber-400">Auction</span>
            </h1>
          </div>
        </div>

        {/* Status Badge & Controls */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? "Resume auto rotation" : "Pause auto rotation"}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 shrink-0"
          >
            {isPaused ? (
              <>
                <Play className="size-3 text-amber-400" />
                <span className="hidden md:inline">Play</span>
              </>
            ) : (
              <>
                <Pause className="size-3 text-amber-400" />
                <span className="hidden md:inline">Pause</span>
              </>
            )}
          </button>

          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1 sm:px-3 shrink-0">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 sm:text-sm">
              Concluded
            </span>
          </span>

          <Image
            src="/images/logos/bupl_logo.webp"
            alt="BUPL 2026"
            width={56}
            height={56}
            className="hidden size-11 object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.35)] sm:block shrink-0"
          />
        </div>
      </header>

      {/* Progress bar countdown */}
      <div className="h-0.5 w-full bg-zinc-950">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ════════ MAIN STAGE — LUXURY TWO-COLUMN STAGE BROADCAST ════════ */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-12 xl:overflow-hidden">
        {/* ── LEFT: SPOTLIGHT HERO (IMAGE IS THE MAIN DIV) ── */}
        <section className="col-span-1 flex min-h-[460px] flex-col gap-3 lg:col-span-5 xl:col-span-4 xl:h-full xl:min-h-0">
          <div className="relative flex flex-1 min-h-[440px] flex-col overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-[#3a1f22] via-[#2b1518] to-[#1d0e11] shadow-[0_0_35px_rgba(251,191,36,0.25)] xl:min-h-0">
            {featuredPlayer ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={featuredPlayer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative h-full w-full"
                >
                  {/* FULL BLEED IMAGE AS MAIN SECTION */}
                  {featuredPlayer.photoUrl ? (
                    <Image
                      src={featuredPlayer.photoUrl}
                      alt={featuredPlayer.name}
                      fill
                      sizes="(max-width: 1280px) 50vw, 33vw"
                      className="object-cover object-top"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-950 via-zinc-950 to-zinc-950">
                      <span className="font-display text-[10rem] font-black text-amber-400/20">
                        {featuredPlayer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

                  {/* Top badges placed directly on image */}
                  <div className="absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2 z-10 max-w-[65%]">
                    <span className="rounded-md border border-amber-400/60 bg-black/70 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[10px] sm:text-xs font-bold text-amber-300 backdrop-blur">
                      Segment {featuredPlayer.segment} ·{" "}
                      {segmentDisplayName(featuredPlayer.segment)}
                    </span>
                    {isHighestOverall && (
                      <span className="rounded-md border border-amber-400 bg-amber-400/20 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[10px] sm:text-xs font-black uppercase text-amber-300 backdrop-blur">
                        #1 Buy
                      </span>
                    )}
                  </div>

                  <span className="absolute right-3.5 top-3.5 flex items-center gap-1 sm:gap-1.5 rounded-full border border-emerald-400/80 bg-black/70 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.35)] backdrop-blur z-10">
                    <Gavel className="size-3 sm:size-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Hammer Dropped · </span>Sold
                  </span>

                  {/* Bottom details directly on image */}
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 z-10 flex flex-col gap-2">
                    <p className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
                      <Trophy className="size-3.5" aria-hidden />
                      {featuredPlayer.category ?? "University Player"}
                    </p>

                    <h1 className="font-display text-3xl sm:text-4xl xl:text-5xl font-bold uppercase leading-[0.95] text-zinc-50 drop-shadow-md">
                      {featuredPlayer.name}
                    </h1>

                    <div className="flex items-baseline gap-3 pt-1">
                      <span className="font-display text-4xl sm:text-5xl font-black text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                        {formatPrice(featuredPlayer.finalPrice ?? 0)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Base: {formatPrice(featuredPlayer.basePrice)}
                      </span>
                    </div>

                    {featuredClub && (
                      <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/15 bg-black/70 p-3 backdrop-blur">
                        <ClubLogo
                          logoUrl={featuredClub.logoUrl}
                          name={featuredClub.name}
                          size={32}
                          className="shrink-0 rounded-lg border border-white/10 p-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            Signed Franchise
                          </p>
                          <p className="truncate text-xs sm:text-sm font-bold text-zinc-100">
                            {featuredClub.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
        </section>

        {/* ── RIGHT: 10 CARDS GRID (IMAGES AS MAIN SECTION OF EVERY CARD) ── */}
        <section className="col-span-1 flex min-h-0 flex-col gap-3 lg:col-span-7 xl:col-span-8 xl:h-full">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:h-16 shrink-0 items-start sm:items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900/60 p-3 sm:px-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <h2 className="font-display text-xl sm:text-2xl xl:text-3xl font-bold uppercase leading-none tracking-wide text-amber-400">
                {activeTab.id === "top"
                  ? "Tournament Top Signings"
                  : activeTab.id === "stats"
                  ? "Tournament Scoreboard"
                  : segmentDisplayName((activeTab as { segment: number }).segment)}
              </h2>

              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-bold text-zinc-300">
                {activeTab.id === "stats"
                  ? "50 / 50 Signed"
                  : `${displayPlayers.length} / 10 Signed`}
              </span>
            </div>

            {/* Segment selection tabs inside the right section header */}
            <div className="flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {VIEW_TABS.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(idx)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition duration-200 ${
                    activeTabIdx === idx
                      ? "border border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* If Stats view is active, show the 4 scoreboard dials + club summary */}
          {activeTab.id === "stats" ? (
            <div className="flex flex-1 flex-col gap-3 min-h-0 overflow-y-auto scrollbar-dark">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-center">
                  <Users className="mx-auto size-5 text-emerald-400" />
                  <p className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
                    {stats.sold} / {stats.totalPlayers}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Players Signed
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-center">
                  <BadgeDollarSign className="mx-auto size-5 text-amber-400" />
                  <p className="font-display mt-2 text-2xl font-black text-amber-400 sm:text-3xl">
                    {formatPrice(stats.totalSalesValue)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Total Spend
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-center">
                  <TrendingUp className="mx-auto size-5 text-sky-400" />
                  <p className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
                    {formatPrice(stats.averageSale)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Average Price
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-center">
                  <Shield className="mx-auto size-5 text-purple-400" />
                  <p className="font-display mt-2 text-2xl font-black text-white sm:text-3xl">
                    {clubs.length || 10}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Clubs Sealed
                  </p>
                </div>
              </div>

              {/* 5 Segment Top Buys in Big Image Cards */}
              <div className="grid flex-1 gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:min-h-0">
                {segmentTopBuys.map((seg) => (
                  <div
                    key={seg.segment}
                    onClick={() => seg.player && setSelectedPlayerId(seg.player.id)}
                    className="relative flex min-h-[180px] flex-col overflow-hidden rounded-xl border-2 border-emerald-500/80 shadow-[0_0_16px_rgba(52,211,153,0.25)] bg-zinc-950 cursor-pointer transition hover:scale-[1.02] hover:border-amber-400"
                  >
                    {seg.player?.photoUrl ? (
                      <Image
                        src={seg.player.photoUrl}
                        alt={seg.player.name}
                        fill
                        sizes="(max-width: 1280px) 25vw, 16vw"
                        className="object-cover object-top"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
                    <span className="absolute left-2 top-2 z-10 rounded-md border border-amber-400/60 bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      Seg {seg.segment}
                    </span>
                    <span className="absolute right-2 top-2 z-10 rounded-md border border-emerald-400/60 bg-emerald-400/20 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase text-emerald-300">
                      Top Buy
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-2.5 z-10">
                      <p className="font-display truncate text-sm font-bold uppercase leading-tight text-zinc-100">
                        {seg.player?.name}
                      </p>
                      <p className="font-display text-sm font-black text-amber-400">
                        {formatPrice(seg.player?.finalPrice ?? 0)}
                      </p>
                      <p className="truncate text-[10px] text-zinc-400 font-medium">
                        {seg.club?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* The 10 Player Cards Grid — Images are the MAIN DIV of each card */
            <div className="grid flex-1 gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-5 xl:grid-rows-2 auto-rows-[160px] sm:auto-rows-[185px] xl:auto-rows-auto xl:min-h-0">
              {displayPlayers.map((player, index) => {
                const club = clubById.get(player.purchasedByClubId ?? "");
                const isSelected = featuredPlayer?.id === player.id;
                return (
                  <div
                    key={player.id}
                    onClick={() => {
                      setSelectedPlayerId(player.id);
                      setIsPaused(true);
                    }}
                    className={`relative flex min-h-0 flex-col overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.5)] scale-[1.02] ring-2 ring-amber-400"
                        : "border-emerald-500/80 shadow-[0_0_18px_rgba(52,211,153,0.25)] hover:border-amber-400 hover:scale-[1.02]"
                    } bg-zinc-950`}
                  >
                    {/* Position badge */}
                    <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-md border border-white/20 bg-black/70 font-mono text-[11px] font-bold text-zinc-300 backdrop-blur">
                      {index + 1}
                    </span>

                    {/* Sold chip */}
                    <span className="absolute right-2 top-2 z-10 rounded-md border border-emerald-400/60 bg-emerald-400/20 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
                      Sold
                    </span>

                    {/* FULL BLEED IMAGE AS THE MAIN CARD DIV */}
                    {player.photoUrl ? (
                      <Image
                        src={player.photoUrl}
                        alt={player.name}
                        fill
                        sizes="(max-width: 1280px) 25vw, 16vw"
                        className="object-cover object-top transition duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                        <span className="font-display text-6xl font-bold text-zinc-700">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                    {/* Details pinned at the bottom on top of the image */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 z-10">
                      <p className="font-display truncate text-sm font-bold uppercase leading-tight text-zinc-100">
                        {player.name}
                      </p>
                      <div className="mt-0.5 flex items-baseline justify-between gap-1">
                        <span className="font-display text-sm font-black text-amber-400">
                          {formatPrice(player.finalPrice ?? 0)}
                        </span>
                        <span className="truncate text-[10px] text-zinc-400 font-medium max-w-[65%]">
                          {club?.name ?? ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
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
              const club = clubById.get(p.purchasedByClubId ?? "");
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
