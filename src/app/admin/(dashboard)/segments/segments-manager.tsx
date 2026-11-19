"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Shuffle,
  Lock,
  LockOpen,
  CheckCircle2,
  Circle,
  Loader2,
  ListOrdered,
  RefreshCw,
  AlertTriangle,
  Eye,
} from "lucide-react";
import {
  subscribeSegments,
  confirmSegmentOrder,
  unconfirmSegmentOrder,
  setSegmentCompleted,
  syncSegmentRosters,
  shuffleIds,
} from "@/lib/firebase/segments";
import { subscribeSettings } from "@/lib/firebase/settings";
import { subscribePlayers } from "@/lib/firebase/players";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { PlayerPhoto } from "@/components/common/player-photo";
import { PlayerStatusBadge } from "@/components/common/player-status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SEGMENT_COUNT, PLAYERS_PER_SEGMENT, segmentDisplayName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Player, Segment, TournamentSettings } from "@/types";

/** Segments Management — rosters, per-segment randomization, locked confirmation. */
export function SegmentsManager() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState(1);
  const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<Segment | null>(null);
  const [completionTarget, setCompletionTarget] = useState<Segment | null>(null);
  const [completionBusy, setCompletionBusy] = useState(false);

  useEffect(() => {
    const onError = (error: Error) =>
      setLoadError(`Could not load segments: ${error.message}`);
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribePlayers(setPlayers, onError),
      subscribeSegments(setSegments, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = settings === undefined || players === undefined || segments === undefined;
  const auctionStatus = settings?.auctionStatus ?? "not_started";
  const auctionLocked = auctionStatus !== "not_started";

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players ?? []) map.set(p.id, p);
    return map;
  }, [players]);

  /** Roster per segment derived live from players (alphabetical baseline). */
  const rosters = useMemo(
    () =>
      Array.from({ length: SEGMENT_COUNT }, (_, i) =>
        (players ?? [])
          .filter((p) => p.segment === i + 1)
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    [players],
  );

  const confirmedCount = (segments ?? []).filter((s) => s.isOrderConfirmed).length;

  const currentSegment =
    (segments ?? []).find((s) => s.segmentNumber === selected) ?? null;
  const expectedIds = rosters[selected - 1].map((p) => p.id);
  const rosterMismatch = useMemo(() => {
    const derived = (players ?? [])
      .filter((p) => p.segment === selected)
      .map((p) => p.id)
      .sort()
      .join(",");
    const stored = [...(currentSegment?.playerIds ?? [])].sort().join(",");
    return derived !== stored;
  }, [players, selected, currentSegment]);

  const rosterFull = expectedIds.length === PLAYERS_PER_SEGMENT;
  const displayOrder: string[] =
    previewOrder ??
    (currentSegment?.isOrderConfirmed && currentSegment.randomizedOrder.length > 0
      ? currentSegment.randomizedOrder
      : expectedIds);
  const showingPreview = previewOrder !== null;
  const missingOrderIds = displayOrder.filter((id) => !playersById.has(id));

  function selectSegment(n: number) {
    setSelected(n);
    setPreviewOrder(null); // switching segments discards any unsaved preview
  }

  function handleShufflePreview() {
    if (!rosterFull) {
      toast.error(
        `${segmentDisplayName(selected)} has ${expectedIds.length}/${PLAYERS_PER_SEGMENT} players — it needs exactly ${PLAYERS_PER_SEGMENT} before its order can be confirmed.`,
      );
      return;
    }
    setPreviewOrder(shuffleIds(expectedIds));
  }

  async function handleConfirmOrder() {
    if (!previewOrder) return;
    setConfirming(true);
    try {
      await confirmSegmentOrder(selected, previewOrder, auctionStatus);
      toast.success(`${segmentDisplayName(selected)} order locked and saved.`);
      setPreviewOrder(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm the order.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleUnlock() {
    if (!unlockTarget) return;
    try {
      await unconfirmSegmentOrder(unlockTarget.segmentNumber, auctionStatus);
      toast.success(`${segmentDisplayName(unlockTarget.segmentNumber)} order unlocked — you can re-randomize.`);
      setUnlockTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unlock.");
    }
  }

  async function handleSyncRosters() {
    setSyncing(true);
    try {
      const { updated, skippedConfirmed } = await syncSegmentRosters(players ?? []);
      const synced = Object.keys(updated).length;
      if (skippedConfirmed.length > 0) {
        toast.warning(
          `Synced ${synced}/${SEGMENT_COUNT} segments. ${skippedConfirmed.join(", ")} skipped — unlock their confirmed order first.`,
        );
      } else {
        toast.success(`Rosters synced from ${players?.length ?? 0} players.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleCompletion() {
    if (!completionTarget) return;
    const markingComplete = !completionTarget.isCompleted;
    setCompletionBusy(true);
    try {
      await setSegmentCompleted(completionTarget.segmentNumber, markingComplete);
      toast.success(
        markingComplete
          ? `${segmentDisplayName(completionTarget.segmentNumber)} marked complete.`
          : `${segmentDisplayName(completionTarget.segmentNumber)} re-opened.`,
      );
      setCompletionTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update completion.");
    } finally {
      setCompletionBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segments Management"
        description="Review the five segments, randomize each auction order independently, and lock them before the auction starts."
        actions={
          <button
            type="button"
            onClick={handleSyncRosters}
            disabled={syncing || loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-4 text-xs font-bold uppercase tracking-wider text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 disabled:opacity-60 dark:border-white/15 dark:text-zinc-200 dark:hover:text-amber-300"
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">Sync rosters</span>
          </button>
        }
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          {loadError}
        </div>
      )}

      {/* Confirmation readiness banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
          confirmedCount === SEGMENT_COUNT
            ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
            : "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
        )}
      >
        {confirmedCount === SEGMENT_COUNT ? (
          <>
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            All {SEGMENT_COUNT} segment orders are confirmed and locked. The auction can begin.
          </>
        ) : (
          <>
            <ListOrdered className="size-5 shrink-0" aria-hidden />
            {confirmedCount}/{SEGMENT_COUNT} orders confirmed — randomize and confirm each segment before the auction starts.
            {auctionLocked && " Auction has started: unconfirmed segments can no longer be ordered."}
          </>
        )}
      </div>

      {/* Stale roster banner */}
      {!loading && rosterMismatch && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>Roster out of date.</strong> {segmentDisplayName(selected)}’s stored roster doesn’t match the
            current players (players were added/moved/removed). Click{" "}
            <button
              type="button"
              onClick={handleSyncRosters}
              className="font-bold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Sync rosters
            </button>{" "}
            before randomizing. Confirmed orders are skipped by the sync.
          </span>
        </div>
      )}

      {/* Segment cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {loading
          ? Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-white/5" />
            ))
          : Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
              const n = i + 1;
              const seg = (segments ?? []).find((s) => s.segmentNumber === n);
              const roster = rosters[i];
              const complete = seg?.isCompleted ?? false;
              const confirmed = seg?.isOrderConfirmed ?? false;
              const active = selected === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => selectSegment(n)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                    complete
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-400/10"
                      : active
                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/50 dark:border-amber-400/60 dark:bg-amber-400/10"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Seg {n}
                    </span>
                    {confirmed ? (
                      <Lock className="size-4 text-amber-500" aria-label="Order confirmed" />
                    ) : (
                      <span className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-label="Order not confirmed" />
                    )}
                  </div>
                  <span className="text-lg font-black uppercase leading-tight text-zinc-800 dark:text-zinc-50">
                    {seg?.name ?? segmentDisplayName(n)}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {roster.length}/{PLAYERS_PER_SEGMENT} players{complete ? " · done" : ""}
                  </span>
                </button>
              );
            })}
      </div>

      {/* Detail panel */}
      {!loading && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          {/* Panel header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-amber-400 font-mono text-lg font-black text-zinc-950">
                {selected}
              </span>
              <div>
                <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
                  {currentSegment?.name ?? segmentDisplayName(selected)}
                  <span className="ml-2 font-mono text-xs font-semibold text-zinc-400">#{selected}</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {currentSegment?.isOrderConfirmed
                    ? "Auction order locked — saved and permanent"
                    : showingPreview
                      ? "Previewing a new order — not saved yet"
                      : "Assignment order shown — shuffle to set the auction order"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Completion toggle */}
              <button
                type="button"
                onClick={() => currentSegment && setCompletionTarget(currentSegment)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-bold uppercase tracking-wider transition-colors",
                  currentSegment?.isCompleted
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                    : "border-zinc-300 text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-white/15 dark:text-zinc-300 dark:hover:text-emerald-300",
                )}
              >
                {currentSegment?.isCompleted ? (
                  <>
                    <CheckCircle2 className="size-4" aria-hidden /> Completed
                  </>
                ) : (
                  <>
                    <Circle className="size-4" aria-hidden /> Mark complete
                  </>
                )}
              </button>

              {/* Unlock (only pre-start, only when confirmed) */}
              {currentSegment?.isOrderConfirmed && !auctionLocked && (
                <button
                  type="button"
                  onClick={() => setUnlockTarget(currentSegment)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-white/15 dark:text-zinc-300 dark:hover:text-amber-300"
                >
                  <LockOpen className="size-4" aria-hidden />
                  Unlock
                </button>
              )}
            </div>
          </div>

          {/* Preview / locked banner */}
          {showingPreview && (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              <Eye className="size-4 shrink-0" aria-hidden />
              Preview only — nothing is saved until you confirm. Re-roll as many times as you like.
            </div>
          )}
          {currentSegment?.isOrderConfirmed && !showingPreview && (
            <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Lock className="size-4 shrink-0" aria-hidden />
              Order confirmed by an admin and stored permanently — it will not reshuffle on refresh.
            </div>
          )}

          {/* Roster list */}
          <ol className="divide-y divide-zinc-100 dark:divide-white/5">
            {displayOrder.map((playerId, index) => {
              const player = playersById.get(playerId);
              return (
                <li
                  key={`${playerId}-${index}`}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2",
                    showingPreview && "bg-amber-50/40 dark:bg-amber-400/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "w-8 shrink-0 text-center font-mono text-sm font-black tabular-nums",
                      currentSegment?.isOrderConfirmed && !showingPreview
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-400",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {player ? (
                    <>
                      <PlayerPhoto photoUrl={player.photoUrl} name={player.name} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {player.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {player.department ?? "—"}
                          {player.academicYear ? ` · ${player.academicYear}` : ""}
                          {player.category ? ` · ${player.category}` : ""}
                        </p>
                      </div>
                      <span className="hidden font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400 sm:inline">
                        {formatPrice(player.basePrice)}
                      </span>
                      <span className="hidden md:inline">
                        <PlayerStatusBadge status={player.status} />
                      </span>
                    </>
                  ) : (
                    <p className="flex-1 text-sm italic text-zinc-400">
                      (missing player — id …{playerId.slice(-6)}) — re-sync rosters
                    </p>
                  )}
                </li>
              );
            })}
            {displayOrder.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-zinc-400">
                No players assigned to segment {selected} yet — add players first.
              </li>
            )}
          </ol>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-white/10">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {missingOrderIds.length > 0 && (
                <span className="font-semibold text-red-500">
                  {missingOrderIds.length} order {missingOrderIds.length === 1 ? "entry" : "entries"} reference missing players.{" "}
                </span>
              )}
              {currentSegment?.isOrderConfirmed
                ? "To change the confirmed order, unlock it first (pre-auction only)."
                : auctionLocked
                  ? "The auction has started — ordering is locked."
                  : rosterFull
                    ? "Positions shown are 1–12. Confirm this order to make it permanent."
                    : `This segment needs exactly ${PLAYERS_PER_SEGMENT} players before its order can be confirmed (currently ${expectedIds.length}).`}
            </p>
            <div className="flex items-center gap-2">
              {!currentSegment?.isOrderConfirmed && !showingPreview && (
                <button
                  type="button"
                  onClick={handleShufflePreview}
                  disabled={!rosterFull || auctionLocked}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                >
                  <Shuffle className="size-4" aria-hidden />
                  Randomize order
                </button>
              )}
              {showingPreview && (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewOrder(null)}
                    className="inline-flex h-10 items-center rounded-lg border border-zinc-300 px-4 text-xs font-bold uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleShufflePreview}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-4 text-xs font-bold uppercase tracking-wider text-zinc-700 transition hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/5"
                  >
                    <Shuffle className="size-4" aria-hidden />
                    Re-roll
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={confirming}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                  >
                    {confirming ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Lock className="size-4" aria-hidden />
                    )}
                    Confirm & lock
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unlock confirmation */}
      <ConfirmDialog
        open={unlockTarget !== null}
        onOpenChange={(open) => !open && setUnlockTarget(null)}
        title={`Unlock segment ${unlockTarget?.segmentNumber ?? ""} order?`}
        description="The confirmed auction order for this segment will be discarded. You can re-randomize and confirm it again — but only before the auction starts."
        confirmLabel="Unlock order"
        destructive
        onConfirm={handleUnlock}
      />

      {/* Completion confirmation */}
      <ConfirmDialog
        open={completionTarget !== null}
        onOpenChange={(open) => !open && setCompletionTarget(null)}
        title={
          completionTarget?.isCompleted
            ? `Re-open segment ${completionTarget.segmentNumber}?`
            : `Mark segment ${completionTarget?.segmentNumber ?? ""} complete?`
        }
        description={
          completionTarget?.isCompleted
            ? "The segment will be marked as not complete. Use this only to correct a mistake."
            : "Use this after all players in the segment have been finalized in the auction. You can re-open it later if you made a mistake."
        }
        confirmLabel={completionTarget?.isCompleted ? "Re-open" : "Mark complete"}
        destructive={completionTarget?.isCompleted ?? false}
        loading={completionBusy}
        onConfirm={handleToggleCompletion}
      />
    </div>
  );
}
