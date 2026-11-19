"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Gavel,
  SkipForward,
  Trophy,
  CheckCircle2,
  XCircle,
  CircleDollarSign,
  Users,
  ChevronRight,
  Loader2,
  BadgeCheck,
  ListOrdered,
} from "lucide-react";
import {
  subscribeSettings,
  subscribeClubs,
  subscribePlayers,
  subscribeSegments,
  subscribeHistory,
} from "@/lib/firebase";
import {
  startAuction,
  startSegment,
  pauseAuction,
  resumeAuction,
  advanceToNextPlayer,
  completeCurrentSegment,
  summarizeTournament,
} from "@/lib/firebase/auction";
import { segmentDisplayName, SEGMENT_NAMES } from "@/lib/constants";
import { recordSale, markUnsold, PurchaseError } from "@/lib/firebase/purchase";
import { formatPrice, formatTimestamp } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { AuctionStatusBadge } from "@/components/common/auction-status-badge";
import { PlayerPhoto } from "@/components/common/player-photo";
import { PlayerStatusBadge } from "@/components/common/player-status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaleDialog, type SaleFormValues } from "./sale-dialog";
import { SEGMENT_COUNT, TOTAL_PLAYERS, PLAYERS_PER_SEGMENT, segmentShortName } from "@/lib/constants";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { cn } from "@/lib/utils";
import type {
  AuctionHistoryRecord,
  Club,
  Player,
  Segment,
  TournamentSettings,
} from "@/types";

type BusyAction =
  | null
  | "start"
  | "pause"
  | "resume"
  | "advance"
  | "completeSegment"
  | "unsold"
  | "sold";

/** Live Auction — the operator console used during the physical auction. */
export function LiveAuction() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[] | undefined>(undefined);
  const [history, setHistory] = useState<AuctionHistoryRecord[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const [saleOpen, setSaleOpen] = useState(false);
  const [unsoldOpen, setUnsoldOpen] = useState(false);
  const [nextOpen, setNextOpen] = useState(false);
  const [completeSegmentOpen, setCompleteSegmentOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [chosenSegment, setChosenSegment] = useState<number | null>(null);
  const [nextSegmentPickerOpen, setNextSegmentPickerOpen] = useState(false);

  useEffect(() => {
    const onError = (error: Error) =>
      setLoadError(`Could not load live data: ${error.message}`);
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribeClubs(setClubs, onError),
      subscribePlayers(setPlayers, onError),
      subscribeSegments(setSegments, onError),
      subscribeHistory(setHistory, onError),
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

  const currentSegment = settings?.currentSegment ?? 1;
  const currentSegmentRecord =
    (segments ?? []).find((s) => s.segmentNumber === currentSegment) ?? null;
  const confirmedOrder = currentSegmentRecord?.isOrderConfirmed
    ? currentSegmentRecord.randomizedOrder
    : [];

  const currentPlayer = settings?.currentPlayerId
    ? playersById.get(settings.currentPlayerId) ?? null
    : null;

  const currentPosition = currentPlayer
    ? confirmedOrder.indexOf(currentPlayer.id) + 1
    : null;

  const segmentPlayers = useMemo(
    () => (players ?? []).filter((p) => p.segment === currentSegment),
    [players, currentSegment],
  );
  const resolvedInSegment = segmentPlayers.filter(
    (p) => p.status === "sold" || p.status === "unsold",
  ).length;

  let nextPlayer: Player | null = null;
  for (const id of confirmedOrder) {
    const candidate = playersById.get(id);
    if (candidate?.status === "upcoming") {
      nextPlayer = candidate;
      break;
    }
  }

  const segmentExhausted = !currentPlayer && !nextPlayer && confirmedOrder.length > 0;
  const tournament = summarizeTournament(players ?? []);
  const soldCount = tournament.sold;
  const unsoldCount = tournament.unsold;
  const latestResults = (history ?? []).slice(0, 5);

  const clubsSorted = useMemo(
    () => [...(clubs ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [clubs],
  );

  // Client-derived start preconditions (same rules as startAuction)
  const confirmedOrders = (segments ?? []).filter((s) => s.isOrderConfirmed).length;
  const startPreconditions = [
    { label: "Tournament settings initialized", ok: settings !== null },
    { label: `All ${SEGMENT_COUNT} segment orders confirmed (${confirmedOrders}/${SEGMENT_COUNT})`, ok: confirmedOrders === SEGMENT_COUNT },
    { label: `All ${TOTAL_PLAYERS} players imported (${players?.length ?? 0}/${TOTAL_PLAYERS})`, ok: players?.length === TOTAL_PLAYERS },
    { label: `At least one club registered (${clubs?.length ?? 0})`, ok: (clubs?.length ?? 0) >= 1 },
  ];
  const canStart = startPreconditions.every((p) => p.ok);
  const status = settings?.auctionStatus ?? "not_started";
  const started = status !== "not_started";
  const completed = status === "completed";

  function handleError(error: unknown, fallback: string) {
    const message =
      error instanceof PurchaseError || error instanceof Error
        ? error.message
        : fallback;
    toast.error(message);
  }

  async function run(action: BusyAction, task: () => Promise<void>) {
    setBusy(action);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  }

  async function handleStart() {
    if (chosenSegment === null) return;
    await run("start", async () => {
      try {
        await startAuction(chosenSegment);
        toast.success(
          `The auction is live — starting with ${segmentDisplayName(chosenSegment)}. The first player is on the block.`,
        );
      } catch (error) {
        handleError(error, "Could not start the auction.");
      }
    });
    setStartOpen(false);
  }

  async function handleStartSegment(segmentNumber: number) {
    await run("start", async () => {
      try {
        await startSegment(segmentNumber);
        toast.success(`${segmentDisplayName(segmentNumber)} is on — first player is on the block.`);
      } catch (error) {
        handleError(error, "Could not open that segment.");
      }
    });
    setNextSegmentPickerOpen(false);
  }

  async function handlePause() {
    await run("pause", async () => {
      try {
        await pauseAuction();
        toast.success("Auction paused.");
      } catch (error) {
        handleError(error, "Could not pause.");
      }
    });
  }

  async function handleResume() {
    await run("resume", async () => {
      try {
        await resumeAuction();
        toast.success("Auction resumed.");
      } catch (error) {
        handleError(error, "Could not resume.");
      }
    });
  }

  async function handleAdvance() {
    await run("advance", async () => {
      try {
        const next = await advanceToNextPlayer();
        toast.success(next ? `${next.name} is on the block.` : "No upcoming players left.");
      } catch (error) {
        handleError(error, "Could not advance.");
      }
    });
    setNextOpen(false);
  }

  async function handleCompleteSegment() {
    await run("completeSegment", async () => {
      try {
        const result = await completeCurrentSegment();
        toast.success(
          result.finished
            ? "Final segment complete — the auction is over."
            : `${segmentDisplayName(result.completedSegment)} complete. Choose the next segment.`,
        );
        if (!result.finished) setNextSegmentPickerOpen(true);
      } catch (error) {
        handleError(error, "Could not complete the segment.");
      }
    });
    setCompleteSegmentOpen(false);
  }

  async function handleUnsold() {
    if (!currentPlayer) return;
    await run("unsold", async () => {
      try {
        await markUnsold({
          playerId: currentPlayer.id,
          adminUid: getFirebaseAuth().currentUser?.uid ?? "unknown-admin",
        });
        toast.success(`${currentPlayer.name} marked UNSOLD.`);
      } catch (error) {
        handleError(error, "Could not mark unsold.");
      }
    });
    setUnsoldOpen(false);
  }

  const clubsById = useMemo(() => {
    const map = new Map<string, Club>();
    for (const c of clubs ?? []) map.set(c.id, c);
    return map;
  }, [clubs]);

  async function handleRecordSale(values: SaleFormValues) {
    if (!currentPlayer) return;
    const adminUid = getFirebaseAuth().currentUser?.uid ?? "unknown-admin";
    await run("sold", async () => {
      // Throws on failure — SaleDialog keeps the error visible inline.
      await recordSale({
        playerId: currentPlayer.id,
        clubId: values.clubId,
        price: values.price,
        adminUid,
      });
      const club = clubsById.get(values.clubId);
      toast.success(
        `${currentPlayer.name} SOLD to ${club?.name ?? "club"} for ${formatPrice(values.price)}.`,
      );
    });
  }

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Live Auction" description="Operator console for the live room." />
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-white/5 xl:col-span-7" />
          <div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-white/5 xl:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Auction"
        description="The operator console — finalize each result as it happens in the room."
        actions={<AuctionStatusBadge status={status} />}
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          {loadError}
        </div>
      )}

      {settings === null ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-white/15">
          <ListOrdered className="mx-auto size-8 text-zinc-300" aria-hidden />
          <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-200">Auction not initialized</p>
          <p className="mt-1 text-sm text-zinc-500">Open Overview and click “Initialize database” first.</p>
        </div>
      ) : completed ? (
        /* ---------- Completion screen ---------- */
        <div className="rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-amber-100 px-6 py-14 text-center dark:border-amber-400/30 dark:from-amber-400/10 dark:to-transparent">
          <Trophy className="mx-auto size-14 text-amber-500" aria-hidden />
          <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-zinc-800 dark:text-amber-400">
            Auction complete
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            All {tournament.total} players have been resolved across {SEGMENT_COUNT} segments.
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Sold", value: `${tournament.sold}` },
              { label: "Unsold", value: `${tournament.unsold}` },
              { label: "Sales value", value: formatPrice(tournament.totalSalesValue) },
              { label: "Top sale", value: formatPrice(tournament.highestSale) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-amber-200/70 bg-white/70 p-4 dark:border-amber-400/20 dark:bg-black/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-amber-200/70">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-lg font-black text-zinc-800 dark:text-amber-300">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : !started ? (
        /* ---------- Pre-start / start screen ---------- */
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] lg:col-span-3">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Pre-flight check</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Everything must be green before the first hammer falls.
            </p>
            <ul className="mt-5 space-y-3">
              {startPreconditions.map((precondition) => (
                <li key={precondition.label} className="flex items-start gap-3 text-sm">
                  {precondition.ok ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-red-400" aria-hidden />
                  )}
                  <span
                    className={
                      precondition.ok
                        ? "text-zinc-600 dark:text-zinc-300"
                        : "font-medium text-zinc-800 dark:text-zinc-100"
                    }
                  >
                    {precondition.label}
                  </span>
                </li>
              ))}
            </ul>
            {clubs && clubs.length > 0 && clubs.length < 10 && (
              <p className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                Only {clubs.length} clubs registered — the tournament format expects exactly 10. You can still start, but double-check the format first.
              </p>
            )}

            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
              Which segment opens the auction?
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(segments ?? []).map((seg) => {
                const selected = chosenSegment === seg.segmentNumber;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setChosenSegment(seg.segmentNumber)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      selected
                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/50 dark:border-amber-400/60 dark:bg-amber-400/10 dark:ring-amber-400/40"
                        : "border-zinc-200 bg-white hover:border-amber-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-400/50",
                    )}
                  >
                    <p className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Seg {seg.segmentNumber}
                      {seg.isOrderConfirmed && <CheckCircle2 className="size-3.5 text-emerald-500" aria-label="Order confirmed" />}
                    </p>
                    <p className="mt-1 text-sm font-black uppercase leading-tight text-zinc-800 dark:text-zinc-100">
                      {seg.name ?? segmentDisplayName(seg.segmentNumber)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-zinc-400">
                      {(players ?? []).filter((p) => p.segment === seg.segmentNumber).length} players
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!canStart || chosenSegment === null}
              onClick={() => setStartOpen(true)}
              className="mt-5 inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-amber-400 text-base font-black uppercase tracking-[0.2em] text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="size-6" strokeWidth={2.5} aria-hidden />
              {chosenSegment === null
                ? "Pick a segment"
                : `Start with ${segmentDisplayName(chosenSegment)}`}
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] lg:col-span-2">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Format refresher</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <li className="flex gap-2"><span className="font-mono font-bold text-amber-600 dark:text-amber-400">1.</span> {SEGMENT_NAMES.join(" · ")}. Orders already locked per segment.</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-amber-600 dark:text-amber-400">2.</span> Each player goes up once: mark them SOLD or UNSOLD as the room decides.</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-amber-600 dark:text-amber-400">3.</span> After each result, the projector updates instantly — no refresh needed.</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-amber-600 dark:text-amber-400">4.</span> SOLD requires a club with enough remaining budget; the price must clear the base.</li>
              <li className="flex gap-2"><span className="font-mono font-bold text-amber-600 dark:text-amber-400">5.</span> Between players there is a confirmation step — no accidental skips.</li>
            </ul>
          </div>
        </div>
      ) : (
        /* ---------- Live board ---------- */
        <>
          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {currentSegmentRecord?.name ?? segmentShortName(currentSegment)} · {currentSegment} of {SEGMENT_COUNT}
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
              {resolvedInSegment}/{segmentPlayers.length} resolved
            </span>
            <div className="mx-2 hidden h-4 w-px bg-zinc-200 dark:bg-white/10 sm:block" />
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {soldCount} sold · {unsoldCount} unsold · {tournament.remaining} remaining overall
            </span>
            <div className="ml-auto flex items-center gap-2">
              {status === "live" ? (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-[11px] font-bold uppercase tracking-wider text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                >
                  {busy === "pause" ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                >
                  {busy === "resume" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Resume
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            {/* Current player hero */}
            <section
              aria-label="Player on the block"
              className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] xl:col-span-7"
            >
              <div className="absolute right-4 top-4">
                <PlayerStatusBadge status={currentPlayer?.status ?? "upcoming"} />
              </div>
              {currentPlayer ? (
                <div className="flex flex-col sm:flex-row">
                  <div className="relative h-56 w-full shrink-0 overflow-hidden sm:h-auto sm:w-64 lg:w-72">
                    {currentPlayer.photoUrl ? (
                      <Image
                        src={currentPlayer.photoUrl}
                        alt={currentPlayer.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 288px"
                        className="object-cover object-top"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-950/60">
                        <span className="text-7xl font-black text-sky-300 dark:text-sky-700">
                          {currentPlayer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/80 to-transparent p-4 sm:hidden">
                      <p className="text-2xl font-black uppercase leading-none text-white">{currentPlayer.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
                        
                        On the block · #{currentPosition} of {PLAYERS_PER_SEGMENT}
                      </p>
                      <h2 className="mt-1 text-4xl font-black uppercase leading-[0.95] tracking-tight text-zinc-800 dark:text-zinc-50 lg:text-5xl">
                        {currentPlayer.name}
                      </h2>
                      <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {currentPlayer.department ?? "—"}
                        {currentPlayer.academicYear && <> · {currentPlayer.academicYear}</>}
                      </p>
                      {currentPlayer.category && (
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                          {currentPlayer.category}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                        Base price
                      </p>
                      <p className="mt-0.5 font-mono text-3xl font-black tabular-nums text-zinc-800 dark:text-amber-400">
                        {formatPrice(currentPlayer.basePrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Waiting / segment-exhausted state */
                <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
                  {segmentExhausted ? (
                    <>
                      <CheckCircle2 className="size-14 text-emerald-500" aria-hidden />
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100">
                          {segmentDisplayName(currentSegment)} complete
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {resolvedInSegment}/{segmentPlayers.length} players finalized.
                          {currentSegmentRecord?.isCompleted
                            ? " Choose the next segment when the room is ready."
                            : " Mark it complete to pick the next segment."}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Users className="size-14 text-zinc-300 dark:text-zinc-600" aria-hidden />
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100">
                          Between players
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Finalized? Move to the next upcoming player when the room is ready.
                        </p>
                      </div>
                      {nextPlayer && (
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                          <PlayerPhoto photoUrl={nextPlayer.photoUrl} name={nextPlayer.name} size={48} />
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Next up</p>
                            <p className="font-bold text-zinc-800 dark:text-zinc-100">{nextPlayer.name}</p>
                            <p className="font-mono text-xs text-zinc-500">{formatPrice(nextPlayer.basePrice)}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            {/* Controls column */}
            <div className="flex flex-col gap-4 xl:col-span-5">
              {/* SOLD / UNSOLD */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSaleOpen(true)}
                  disabled={!currentPlayer || busy !== null}
                  className="group flex h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                >
                  <BadgeCheck className="size-7 transition-transform group-hover:scale-110" aria-hidden />
                  <span className="text-base font-black uppercase tracking-widest">Sold</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnsoldOpen(true)}
                  disabled={!currentPlayer || busy !== null}
                  className="group flex h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-red-300 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-400 dark:hover:bg-red-400/20"
                >
                  <Gavel className="size-7 transition-transform group-hover:scale-110" aria-hidden />
                  <span className="text-base font-black uppercase tracking-widest">Unsold</span>
                </button>
              </div>

              {/* Pick the next segment (after completion) */}
              {!currentPlayer && segmentExhausted && currentSegmentRecord?.isCompleted && (
                <button
                  type="button"
                  onClick={() => setNextSegmentPickerOpen(true)}
                  disabled={busy !== null}
                  className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-amber-400 transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                >
                  <SkipForward className="size-6" aria-hidden />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">
                    Pick the next segment
                  </span>
                </button>
              )}

              {/* Next player */}
              {!currentPlayer && !segmentExhausted && (
                <button
                  type="button"
                  onClick={() => setNextOpen(true)}
                  disabled={busy !== null}
                  className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-amber-400 transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                >
                  <SkipForward className="size-6" aria-hidden />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">
                    {nextPlayer ? `Next: ${nextPlayer.name}` : "Next player"}
                  </span>
                </button>
              )}

              {/* Complete segment */}
              {segmentExhausted && (
                <button
                  type="button"
                  onClick={() => setCompleteSegmentOpen(true)}
                  disabled={busy !== null}
                  className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-500 dark:text-zinc-950"
                >
                  <ChevronRight className="size-6" aria-hidden />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">
                    {currentSegmentRecord?.isOrderConfirmed
                      ? `Complete ${segmentDisplayName(currentSegment)}`
                      : "Complete segment"}
                  </span>
                </button>
              )}

              {/* Sales totals */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: CircleDollarSign, label: "Sales value", value: formatPrice(tournament.totalSalesValue) },
                  { icon: BadgeCheck, label: "Sold", value: String(soldCount) },
                  { icon: Gavel, label: "Unsold", value: String(unsoldCount) },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <Icon className="mx-auto size-4 text-zinc-400" aria-hidden />
                    <p className="mt-1 truncate font-mono text-sm font-bold text-zinc-800 dark:text-zinc-100" title={value}>
                      {value}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recent results */}
              <div className="min-h-0 flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <p className="border-b border-zinc-200 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  Recent results
                </p>
                {latestResults.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-zinc-400">
                    No results yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-white/5">
                    {latestResults.map((record) => (
                      <li key={record.id} className="flex items-center justify-between gap-2 px-4 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                            {record.playerName}
                          </p>
                          <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                            {record.action === "sold" ? `→ ${record.clubName}` : "unsold"} · {formatTimestamp(record.timestamp)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[11px] font-bold tabular-nums",
                            record.action === "sold"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500",
                          )}
                        >
                          {record.action === "sold" ? formatPrice(record.finalPrice) : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---------- Dialogs ---------- */}
      <SaleDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        player={currentPlayer}
        clubs={clubsSorted}
        onSubmit={handleRecordSale}
      />

      <ConfirmDialog
        open={unsoldOpen}
        onOpenChange={setUnsoldOpen}
        title={`Mark ${currentPlayer?.name ?? "player"} UNSOLD?`}
        description="The player passes this round. No budgets move and no club is assigned. The decision is final for this round."
        confirmLabel="Mark unsold"
        loading={busy === "unsold"}
        onConfirm={handleUnsold}
      >
        {currentPlayer && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <PlayerPhoto photoUrl={currentPlayer.photoUrl} name={currentPlayer.name} size={48} />
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-100">{currentPlayer.name}</p>
              <p className="font-mono text-xs text-zinc-500">
                Base price {formatPrice(currentPlayer.basePrice)} · {segmentDisplayName(currentPlayer.segment ?? 1)}
              </p>
            </div>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={nextOpen}
        onOpenChange={setNextOpen}
        title="Move to the next player?"
        description={
          nextPlayer
            ? `This puts ${nextPlayer.name} on the block — ${segmentDisplayName(currentSegment)}, position ${confirmedOrder.indexOf(nextPlayer.id) + 1} of 12. The room and the projector will see them immediately.`
            : "No upcoming players remain in this segment."
        }
        confirmLabel="On the block"
        loading={busy === "advance"}
        onConfirm={handleAdvance}
      >
        {nextPlayer && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
            <PlayerPhoto photoUrl={nextPlayer.photoUrl} name={nextPlayer.name} size={48} />
            <div>
              <p className="font-bold text-zinc-800 dark:text-zinc-100">{nextPlayer.name}</p>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {formatPrice(nextPlayer.basePrice)} base · {segmentDisplayName(currentSegment)}
              </p>
            </div>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={completeSegmentOpen}
        onOpenChange={setCompleteSegmentOpen}
        title={`Complete ${segmentDisplayName(currentSegment)}?`}
        description={`Every player in ${segmentDisplayName(currentSegment)} is finalized. The segment will be marked complete. You'll then choose which segment to run next — the order is yours to decide.`}
        confirmLabel="Complete segment"
        loading={busy === "completeSegment"}
        onConfirm={handleCompleteSegment}
      />

      <ConfirmDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        title="Start the auction?"
        description={`${segmentDisplayName(chosenSegment ?? 1)} opens the auction — position 1 goes on the block. From now on, randomization is locked for every segment and all results are permanent.`}
        confirmLabel="Start auction"
        loading={busy === "start"}
        onConfirm={handleStart}
      />

      {/* Choose the next segment (after a segment is completed) */}
      <Dialog open={nextSegmentPickerOpen} onOpenChange={setNextSegmentPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest">Which segment next?</DialogTitle>
            <DialogDescription>
              Every segment is independent — pick the one the room is ready for. You can return to this picker at any break between segments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {(segments ?? []).map((seg) => {
              const segPlayers = (players ?? []).filter((p) => p.segment === seg.segmentNumber);
              const upcoming = segPlayers.filter((p) => p.status === "upcoming").length;
              const confirmed = seg.isOrderConfirmed;
              const disabled = seg.isCompleted || !confirmed || upcoming === 0 || busy !== null;
              return (
                <button
                  key={seg.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleStartSegment(seg.segmentNumber)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                    disabled
                      ? "cursor-not-allowed border-zinc-200 opacity-40 dark:border-white/10"
                      : "border-amber-300 bg-amber-50 hover:border-amber-500 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-400/10 dark:hover:bg-amber-400/20",
                  )}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-400 font-mono text-lg font-black text-zinc-950">
                    {seg.segmentNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black uppercase leading-tight text-zinc-800 dark:text-zinc-100">
                      {seg.name ?? segmentDisplayName(seg.segmentNumber)}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      {seg.isCompleted
                        ? "Complete"
                        : confirmed
                          ? `${upcoming} of ${segPlayers.length} upcoming`
                          : "Order not confirmed"}
                    </span>
                  </span>
                  {!disabled && <SkipForward className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
