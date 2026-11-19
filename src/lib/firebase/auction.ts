/**
 * Auction lifecycle service — the state machine that drives the live room.
 *
 * Model (simple + refresh-proof, no index bookkeeping):
 *  - /settings.auctionStatus: not_started → live ↔ paused → completed
 *  - /settings.currentPlayerId: who is on the block right now (null between
 *    players). Only this player can be sold/unsold (enforced in purchase.ts).
 *  - advancing always derives "the next player" as the FIRST 'upcoming' player
 *    in the current segment's confirmed randomized order — so it is correct
 *    after any refresh, crash or concurrent finalize, with zero position math.
 *
 * All transitions are atomic multi-path updates (settings + player/segment).
 */
import { get, update, rootRef, dbRefs } from "./database";
import { toPlayer, toSettings, toSegment } from "./converters";
import { segmentId } from "./segments";
import { SEGMENT_COUNT, TOTAL_PLAYERS } from "@/lib/constants";
import type { Player } from "@/types";

export class AuctionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuctionError";
  }
}

async function loadSettings(): Promise<NonNullable<ReturnType<typeof toSettings>>> {
  const snapshot = await get(dbRefs.settings());
  const settings = toSettings(snapshot.val());
  if (!settings) {
    throw new AuctionError(
      "not_initialized",
      "Tournament settings are not initialized. Open Overview and click “Initialize database” first.",
    );
  }
  return settings;
}

async function loadSegmentOrder(segmentNumber: number) {
  const snapshot = await get(dbRefs.segment(segmentNumber));
  if (!snapshot.exists()) {
    throw new AuctionError("segment_missing", `Segment ${segmentNumber} does not exist. Initialize the database first.`);
  }
  const segment = toSegment(segmentId(segmentNumber), snapshot.val());
  if (!segment.isOrderConfirmed || segment.randomizedOrder.length === 0) {
    throw new AuctionError(
      "order_not_confirmed",
      `Segment ${segmentNumber}'s order is not confirmed yet. Confirm it in Segments Management first.`,
    );
  }
  return segment.randomizedOrder;
}

/** Find the first 'upcoming' player in an order. Returns null when the order is exhausted. */
async function findNextUpcoming(order: string[]): Promise<Player | null> {
  // 12 gets — tiny; players rarely change status mid-scan for this purpose
  const snapshots = await Promise.all(order.map((id) => get(dbRefs.player(id))));
  for (let i = 0; i < order.length; i += 1) {
    const snap = snapshots[i];
    if (!snap.exists()) continue;
    const player = toPlayer(order[i], snap.val());
    if (player.status === "upcoming") return player;
  }
  return null;
}

/** Start the auction: not_started → live. The admin chooses which segment begins. */
export async function startAuction(startSegment: number = 1): Promise<Player> {
  const [settings, playersSnap, order, segmentsSnap] = await Promise.all([
    loadSettings(),
    get(dbRefs.players()),
    loadSegmentOrder(startSegment),
    get(dbRefs.segments()),
  ]);
  if (!Number.isInteger(startSegment) || startSegment < 1 || startSegment > SEGMENT_COUNT) {
    throw new AuctionError("bad_segment", `Unknown segment ${startSegment}.`);
  }
  if (settings.auctionStatus !== "not_started") {
    throw new AuctionError("already_started", "The auction has already started.");
  }
  const playersCount = playersSnap.exists()
    ? Object.keys(playersSnap.val() as Record<string, unknown>).length
    : 0;
  if (playersCount !== TOTAL_PLAYERS) {
    throw new AuctionError(
      "players_incomplete",
      `Expected ${TOTAL_PLAYERS} players but found ${playersCount}. Import everyone first.`,
    );
  }

  const segmentsVal = (segmentsSnap.val() ?? {}) as Record<string, { isOrderConfirmed?: boolean }>;
  const confirmedSegments = Object.values(segmentsVal).filter(
    (seg) => seg.isOrderConfirmed === true,
  ).length;
  if (confirmedSegments !== SEGMENT_COUNT) {
    throw new AuctionError(
      "orders_not_confirmed",
      `Only ${confirmedSegments}/${SEGMENT_COUNT} segment orders are confirmed. Confirm every segment before the auction starts.`,
    );
  }

  const first = await findNextUpcoming(order);
  if (!first) {
    throw new AuctionError("no_upcoming", "No upcoming players in segment 1. Check the rosters.");
  }

  const now = Date.now();
  await update(rootRef(), {
    [`players/${first.id}/status`]: "current",
    [`players/${first.id}/updatedAt`]: now,
    "settings/auctionStatus": "live",
    "settings/currentSegment": startSegment,
    "settings/currentPlayerId": first.id,
    "settings/updatedAt": now,
  });
  return { ...first, status: "current", updatedAt: now };
}

/** Pause the live auction (live → paused). */
export async function pauseAuction(): Promise<void> {
  const settings = await loadSettings();
  if (settings.auctionStatus !== "live") {
    throw new AuctionError("not_live", "Only a live auction can be paused.");
  }
  await update(dbRefs.settings(), { auctionStatus: "paused", updatedAt: Date.now() });
}

/** Resume a paused auction (paused → live). */
export async function resumeAuction(): Promise<void> {
  const settings = await loadSettings();
  if (settings.auctionStatus !== "paused") {
    throw new AuctionError("not_paused", "Only a paused auction can be resumed.");
  }
  await update(dbRefs.settings(), { auctionStatus: "live", updatedAt: Date.now() });
}

/**
 * Put the next upcoming player on the block.
 * Refuses while a player is still on the block — finalize them first.
 * Returns the player who is now current, or null when the segment is exhausted.
 */
export async function advanceToNextPlayer(): Promise<Player | null> {
  const settings = await loadSettings();
  if (settings.auctionStatus !== "live" && settings.auctionStatus !== "paused") {
    throw new AuctionError("not_active", "Start or resume the auction before moving to the next player.");
  }
  if (settings.currentPlayerId) {
    throw new AuctionError(
      "player_on_block",
      "A player is already on the block — mark them SOLD or UNSOLD first.",
    );
  }
  const order = await loadSegmentOrder(settings.currentSegment);
  const next = await findNextUpcoming(order);
  if (!next) return null; // segment exhausted — caller offers to advance segments

  const now = Date.now();
  await update(rootRef(), {
    [`players/${next.id}/status`]: "current",
    [`players/${next.id}/updatedAt`]: now,
    "settings/currentPlayerId": next.id,
    "settings/updatedAt": now,
  });
  return { ...next, status: "current", updatedAt: now };
}

/**
 * Mark the current segment complete. If every segment is complete, the
 * tournament is marked COMPLETED; otherwise the admin must choose the next
 * segment explicitly (startSegment). Refuses while a player is on the block.
 */
export async function completeCurrentSegment(): Promise<{ finished: boolean; completedSegment: number }> {
  const settings = await loadSettings();
  if (settings.auctionStatus !== "live" && settings.auctionStatus !== "paused") {
    throw new AuctionError("not_active", "The auction is not running.");
  }
  if (settings.currentPlayerId) {
    throw new AuctionError(
      "player_on_block",
      "A player is still on the block — finalize them before completing the segment.",
    );
  }

  const order = await loadSegmentOrder(settings.currentSegment);
  const remaining = await findNextUpcoming(order);
  if (remaining) {
    throw new AuctionError(
      "segment_not_finished",
      `Segment ${settings.currentSegment} still has upcoming players (next: ${remaining.name}).`,
    );
  }

  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`segments/${segmentId(settings.currentSegment)}/isCompleted`]: true,
    [`segments/${segmentId(settings.currentSegment)}/updatedAt`]: now,
  };

  const segmentsSnap = await get(dbRefs.segments());
  const segmentsVal = (segmentsSnap.val() ?? {}) as Record<string, { isCompleted?: boolean }>;
  const completedCount = Object.values(segmentsVal).filter(
    (seg) => seg.isCompleted === true,
  ).length + 1; // includes this segment, being marked now
  if (completedCount >= SEGMENT_COUNT) {
    updates["settings/auctionStatus"] = "completed";
  }
  updates["settings/updatedAt"] = now;

  await update(rootRef(), updates);
  return { finished: completedCount >= SEGMENT_COUNT, completedSegment: settings.currentSegment };
}

/** Totals across the whole tournament (all players, all segments). */
export function summarizeTournament(players: Player[]) {
  const sold = players.filter((p) => p.status === "sold");
  const unsold = players.filter((p) => p.status === "unsold");
  return {
    total: players.length,
    sold: sold.length,
    unsold: unsold.length,
    resolved: sold.length + unsold.length,
    remaining: players.length - sold.length - unsold.length,
    totalSalesValue: sold.reduce((s, p) => s + (p.finalPrice ?? 0), 0),
    highestSale: sold.reduce((m, p) => Math.max(m, p.finalPrice ?? 0), 0),
  };
}

/**
 * Begin an (uncompleted, confirmed) segment the room is ready for.
 * Refuses while a player is on the block. Keeps paused state if paused —
 * the admin can resume. Returns the first player on the block.
 */
export async function startSegment(
  segmentNumber: number,
): Promise<Player> {
  const settings = await loadSettings();
  if (settings.auctionStatus !== "live" && settings.auctionStatus !== "paused") {
    throw new AuctionError("not_active", "Start the auction before opening a segment.");
  }
  if (settings.currentPlayerId) {
    throw new AuctionError(
      "player_on_block",
      "A player is still on the block — finalize them before switching segments.",
    );
  }
  if (!Number.isInteger(segmentNumber) || segmentNumber < 1 || segmentNumber > SEGMENT_COUNT) {
    throw new AuctionError("bad_segment", `Unknown segment ${segmentNumber}.`);
  }
  const segmentSnap = await get(dbRefs.segment(segmentNumber));
  const record = toSegment(segmentId(segmentNumber), segmentSnap.val());
  if (record.isCompleted) {
    throw new AuctionError("segment_completed", `Segment ${segmentNumber} is already complete.`);
  }
  const order = await loadSegmentOrder(segmentNumber);
  const first = await findNextUpcoming(order);
  if (!first) {
    throw new AuctionError(
      "segment_exhausted",
      `No upcoming players left in segment ${segmentNumber}. Mark it complete instead.`,
    );
  }
  const now = Date.now();
  await update(rootRef(), {
    [`players/${first.id}/status`]: "current",
    [`players/${first.id}/updatedAt`]: now,
    "settings/currentSegment": segmentNumber,
    "settings/currentPlayerId": first.id,
    "settings/updatedAt": now,
  });
  return { ...first, status: "current", updatedAt: now };
}

/** Which segments still have upcoming players? Used to offer the room a choice. */
export async function unfinishedSegments(): Promise<Array<{ segmentNumber: number; name?: string; upcoming: number }>> {
  const snapshot = await get(dbRefs.segments());
  const segments = (snapshot.val() ?? {}) as Record<string, unknown>;
  const results: Array<{ segmentNumber: number; name?: string; upcoming: number }> = [];
  for (const raw of Object.values(segments)) {
    const seg = toSegment("", raw);
    if (seg.isCompleted) continue;
    const order = seg.isOrderConfirmed ? seg.randomizedOrder : [];
    let upcoming = 0;
    for (const id of order) {
      const snap = await get(dbRefs.player(id));
      const player = toPlayer(id, snap.val());
      if (player.status === "upcoming") upcoming += 1;
    }
    results.push({ segmentNumber: seg.segmentNumber, name: seg.name, upcoming });
  }
  return results.sort((a, b) => a.segmentNumber - b.segmentNumber);
}
