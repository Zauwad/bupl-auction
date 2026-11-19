"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  subscribeSettings as subscribeFirebaseSettings,
  subscribeClubs as subscribeFirebaseClubs,
  subscribePlayers as subscribeFirebasePlayers,
  subscribeSegments as subscribeFirebaseSegments,
  subscribeHistory as subscribeFirebaseHistory,
} from "@/lib/firebase";
import {
  subscribeSpectatorSettings,
  subscribeSpectatorClubs,
  subscribeSpectatorPlayers,
  subscribeSpectatorSegments,
  subscribeSpectatorHistory,
} from "@/lib/spectator";
import { ClubPurchasesBoard } from "./club-purchases-board";
import { formatPrice } from "@/lib/format";
import { PlayerPhoto } from "@/components/common/player-photo";
import { PLAYERS_PER_SEGMENT, segmentDisplayName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  AuctionHistoryRecord,
  Club,
  Player,
  PlayerStatus,
  Segment,
  TournamentSettings,
} from "@/types";
import {
  Trophy,
  Gavel,
  Shield,
} from "lucide-react";

/** Status → card border + chip */
const CARD_STYLE: Record<PlayerStatus, string> = {
  upcoming:
    "border-red-900/70 bg-gradient-to-br from-red-950/80 via-[#231116] to-[#1a0d11]",
  current:
    "border-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.35)] ring-2 ring-amber-400/70",
  sold: "border-emerald-500 shadow-[0_0_22px_rgba(52,211,153,0.3)]",
  unsold: "border-red-500 shadow-[0_0_22px_rgba(248,113,113,0.25)]",
};

const STATUS_TAG: Record<PlayerStatus, { text: string; className: string } | null> = {
  upcoming: null,
  current: {
    text: "On the block",
    className: "border-amber-400/60 bg-amber-400/15 text-amber-300",
  },
  sold: {
    text: "Sold",
    className: "border-emerald-400/60 bg-emerald-400/15 text-emerald-300",
  },
  unsold: {
    text: "Unsold",
    className: "border-red-400/60 bg-red-400/15 text-red-300",
  },
};

/** The projector view — read-only, Firebase-driven, mirrors the Figma mockup. */
export function BroadcastLive() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[] | undefined>(undefined);
  const [history, setHistory] = useState<AuctionHistoryRecord[] | undefined>(undefined);

  useEffect(() => {
    const isRealtime =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("realtime") === "true";

    const subSettings = isRealtime ? subscribeFirebaseSettings : subscribeSpectatorSettings;
    const subClubs = isRealtime ? subscribeFirebaseClubs : subscribeSpectatorClubs;
    const subPlayers = isRealtime ? subscribeFirebasePlayers : subscribeSpectatorPlayers;
    const subSegments = isRealtime ? subscribeFirebaseSegments : subscribeSpectatorSegments;
    const subHistory = isRealtime ? subscribeFirebaseHistory : subscribeSpectatorHistory;

    const noop = () => undefined;
    const unsubs = [
      subSettings(setSettings, noop),
      subClubs(setClubs, noop),
      subPlayers(setPlayers, noop),
      subSegments(setSegments, noop),
      subHistory(setHistory, noop),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading =
    settings === undefined ||
    clubs === undefined ||
    players === undefined ||
    segments === undefined ||
    history === undefined;

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players ?? []) map.set(p.id, p);
    return map;
  }, [players]);

  const status = settings?.auctionStatus ?? "not_started";
  const currentSegment = settings?.currentSegment ?? 1;

  const segmentRecord =
    (segments ?? []).find((s) => s.segmentNumber === currentSegment) ?? null;
  const order = useMemo(
    () =>
      segmentRecord?.isOrderConfirmed && segmentRecord.randomizedOrder.length > 0
        ? segmentRecord.randomizedOrder
        : (players ?? [])
            .filter((p) => p.segment === currentSegment)
            .map((p) => p.id),
    [segmentRecord, players, currentSegment],
  );

  const currentPlayer = settings?.currentPlayerId
    ? playersById.get(settings.currentPlayerId) ?? null
    : null;
  const nextPlayer = useMemo(() => {
    for (const id of order) {
      const candidate = playersById.get(id);
      if (candidate?.status === "upcoming") return candidate;
    }
    return null;
  }, [order, playersById]);

  const tournamentSold = (players ?? []).filter((p) => p.status === "sold").length;
  const tournamentUnsold = (players ?? []).filter((p) => p.status === "unsold").length;
  const totalSalesValue = (players ?? [])
    .filter((p) => p.status === "sold")
    .reduce((sum, p) => sum + (p.finalPrice ?? 0), 0);

  const currentPosition = currentPlayer
    ? order.indexOf(currentPlayer.id) + 1
    : null;

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <Gavel className="size-16 animate-pulse text-amber-400" aria-hidden />
        <p className="font-display text-3xl font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Connecting to the auction…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col xl:h-screen xl:min-h-0">
        {/* ════════ TOP BAR ════════ */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-red-900/40 bg-gradient-to-r from-[#2a1418] via-zinc-950 to-[#2a1418] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Image
            src="/images/logos/cbu_logo.webp"
            alt="Cricket BRAC University"
            width={56}
            height={56}
            className="size-10 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.35)] sm:size-12"
          />
          <div className="min-w-0 leading-tight">
            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-sky-400 sm:text-[9px] sm:tracking-[0.4em]">
              Cricket BRAC University
            </p>
            <h1 className="font-display text-xl font-bold uppercase leading-none tracking-wide text-zinc-50 sm:text-2xl lg:text-3xl">
              Player <span className="text-amber-400">Auction</span>
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
          {status === "live" ? (
            <span className="flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 py-1 pl-2.5 pr-3.5">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-red-500" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-red-400 sm:text-base sm:tracking-[0.25em]">
                Live
              </span>
            </span>
          ) : status === "paused" ? (
            <span className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 sm:px-3">
              <span className="size-2.5 animate-pulse rounded-full bg-amber-400" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-base sm:tracking-[0.25em]">
                Paused
              </span>
            </span>
          ) : status === "completed" ? (
            <span className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-400/10 px-3 py-1 sm:px-4">
              <span className="size-2.5 rounded-full bg-sky-400" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-sky-400 sm:text-base sm:tracking-[0.25em]">
                Final
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 sm:px-3">
              <span className="size-2.5 rounded-full bg-zinc-500" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 sm:text-base sm:tracking-[0.25em]">
                Soon
              </span>
            </span>
          )}
          <Image
            src="/images/logos/bupl_logo.webp"
            alt="BUPL 2026"
            width={56}
            height={56}
            className="hidden size-12 object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.35)] md:block"
          />
        </div>
      </header>

      {/* ════════ MAIN — Responsive Layout ════════ */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-12 xl:overflow-hidden">
        {/* ── LEFT: PLAYER CARD (Prominent on mobile, 5 cols on lg, 4 cols on xl) ─────────────────────── */}
        <section className="col-span-1 flex min-h-[440px] flex-col gap-3 lg:col-span-5 xl:col-span-4 xl:h-full xl:min-h-0">
          {/* Player card */}
          <div className="relative flex flex-1 min-h-[420px] flex-col overflow-hidden rounded-2xl border border-red-900/50 bg-gradient-to-b from-[#3a1f22] via-[#2b1518] to-[#1d0e11] xl:min-h-0">
            {status === "completed" ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
                <Trophy
                  className="size-24 text-amber-400 drop-shadow-[0_0_40px_rgba(251,191,36,0.4)]"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
                    Auction complete
                  </p>
                  <h1 className="font-display mt-2 text-4xl font-bold uppercase leading-[0.95] text-zinc-100">
                    Final<br />Hammer
                  </h1>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Sold", value: String(tournamentSold) },
                    { label: "Unsold", value: String(tournamentUnsold) },
                    { label: "Sales", value: formatPrice(totalSalesValue) },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <p className="font-display text-2xl font-semibold tabular-nums text-zinc-100">
                        {item.value}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : status === "not_started" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center sm:gap-5">
                <Trophy className="size-14 text-amber-400/80 sm:size-16" strokeWidth={1.1} aria-hidden />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-500">
                    Get your paddles up
                  </p>
                  <h1 className="font-display mt-2 text-4xl font-bold uppercase leading-[0.9] text-shimmer sm:text-5xl">
                    Ready?<br />Set.<br />Bid.
                  </h1>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Cards flip at the auctioneer&rsquo;s call
                </p>
              </div>
            ) : currentPlayer ? (
              <div key={currentPlayer.id} className="animate-broadcast-in relative h-full">
                {currentPlayer.photoUrl ? (
                  <Image
                    src={currentPlayer.photoUrl}
                    alt={currentPlayer.name}
                    fill
                    sizes="(max-width: 1280px) 50vw, 25vw"
                    className="object-cover object-top"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-900/40 to-zinc-950">
                    <span className="font-display text-[10rem] font-bold text-sky-800/60">
                      {currentPlayer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                {currentPosition !== null && (
                  <span className="absolute left-4 top-4 rounded-md border border-amber-400/60 bg-black/60 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 backdrop-blur">
                    #{currentPosition}/{PLAYERS_PER_SEGMENT}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
                    <Gavel className="size-3.5" aria-hidden />
                    On the block
                  </p>
                  <h1 className="font-display mt-1 text-4xl font-bold uppercase leading-[0.95] text-zinc-50 xl:text-5xl">
                    {currentPlayer.name}
                  </h1>
                  <p className="mt-2 text-xs font-medium text-zinc-300">
                    {currentPlayer.department ?? "—"}
                    {currentPlayer.academicYear && <span className="text-zinc-500"> · {currentPlayer.academicYear}</span>}
                  </p>
                  {currentPlayer.category && (
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">
                      {currentPlayer.category}
                    </p>
                  )}
                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/15 pt-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                        Base price
                      </p>
                      <p className="font-display text-3xl font-semibold tabular-nums leading-none text-amber-400">
                        {formatPrice(currentPlayer.basePrice)}
                      </p>
                    </div>
                    <span className="rounded-md border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300 backdrop-blur">
                      Seg {currentPlayer.segment}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
                  {status === "paused" ? "Auction paused" : "Between players"}
                </p>
                {nextPlayer ? (
                  <>
                    <p className="font-display text-lg font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      Next up
                    </p>
                    <div key={nextPlayer.id} className="animate-broadcast-in flex flex-col items-center gap-4">
                      <PlayerPhoto
                        photoUrl={nextPlayer.photoUrl}
                        name={nextPlayer.name}
                        size={170}
                        className="ring-4 ring-amber-400/30"
                      />
                      <h1 className="font-display text-4xl font-bold uppercase leading-none text-zinc-100">
                        {nextPlayer.name}
                      </h1>
                      <p className="font-display text-2xl font-semibold tabular-nums text-amber-400">
                        {formatPrice(nextPlayer.basePrice)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield className="size-16 text-emerald-400" strokeWidth={1.5} aria-hidden />
                    <h1 className="font-display text-4xl font-bold uppercase text-zinc-100">
                      Segment {currentSegment} complete
                    </h1>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Preparing next segment…
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── RIGHT: SEGMENT GRID + CARDS ────────────────── */}
        <section className="col-span-1 flex min-h-0 flex-col gap-3 lg:col-span-7 xl:col-span-8 xl:h-full">
          {/* Segment header — name only */}
          <div className="flex h-14 shrink-0 items-center rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900/60 px-4 sm:h-16 sm:px-6">
            <h2 className="font-display text-2xl font-bold uppercase leading-none tracking-wide text-amber-400 sm:text-3xl xl:text-5xl">
              {segmentRecord?.name ?? segmentDisplayName(currentSegment)}
            </h2>
          </div>

          {/* The mystery / revealed cards in responsive grid */}
          <div className="grid flex-1 gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-5 xl:grid-rows-2 auto-rows-[160px] sm:auto-rows-[180px] xl:auto-rows-auto xl:min-h-0">
            {order.map((playerId, index) => {
              const player = playersById.get(playerId);
              if (!player) {
                return (
                  <div
                    key={playerId}
                    className="flex items-center justify-center rounded-xl border-2 border-red-900/60 bg-[#231116]"
                  >
                    <span className="font-mono text-xs text-zinc-600">?</span>
                  </div>
                );
              }
              const isUpcoming = player.status === "upcoming";
              const tag = STATUS_TAG[player.status];
              return (
                <div
                  key={playerId}
                  className={cn(
                    "relative flex min-h-0 flex-col overflow-hidden rounded-xl border-2 transition-all duration-500",
                    CARD_STYLE[player.status],
                  )}
                >
                  {/* Position badge */}
                  <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-md border border-white/20 bg-black/60 font-mono text-[11px] font-bold text-zinc-300 backdrop-blur">
                    {index + 1}
                  </span>
                  {tag && (
                    <span className={cn(
                      "absolute right-2 top-2 z-10 rounded-md border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur",
                      tag.className,
                    )}>
                      {tag.text}
                    </span>
                  )}

                  {isUpcoming ? (
                    /* Face-down card */
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      <span
                        className="font-display select-none text-7xl font-bold leading-none text-red-800/80"
                        aria-hidden
                      >
                        ?
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-red-900">
                        Mystery
                      </span>
                    </div>
                  ) : (
                    /* Revealed card */
                    <>
                      {player.photoUrl ? (
                        <Image
                          src={player.photoUrl}
                          alt={player.name}
                          fill
                          sizes="(max-width: 1280px) 25vw, 16vw"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-900/40 to-zinc-950">
                          <span className="font-display text-6xl font-bold text-sky-800/70">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2.5">
                        <p className="font-display truncate text-sm font-bold uppercase leading-tight text-zinc-100">
                          {player.name}
                        </p>
                        {player.status === "sold" ? (
                          <p className="font-display mt-0.5 text-base font-semibold tabular-nums text-emerald-400">
                            {formatPrice(player.finalPrice)}
                          </p>
                        ) : player.status === "unsold" ? (
                          <p className="font-display mt-0.5 text-base font-semibold uppercase text-red-400">
                            Unsold
                          </p>
                        ) : (
                          <p className="font-mono mt-0.5 text-[10px] font-semibold text-amber-400">
                            {formatPrice(player.basePrice)}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

        </section>

        </main>
      </div>
      <ClubPurchasesBoard />
    </>
  );
}
