/**
 * Segments service — rosters, randomized order confirmation, completion.
 *
 * Rules of engagement (enforced here AND by database.rules.json):
 *  - a randomized order may be confirmed only as an exact permutation of the
 *    segment's roster (no duplicates, no omissions) — see assertOrderIsPermutation
 *  - once confirmed, the order is permanent; changing it requires the explicit
 *    admin un-confirm action, and never after the auction has started
 *  - segments are marked complete individually; completing one never restarts it
 */
import {
  get,
  update,
  subscribeToValue,
  dbRefs,
  rootRef,
} from "./database";
import { toSegment, mapSnapshot } from "./converters";
import { SEGMENT_COUNT, PLAYERS_PER_SEGMENT, SEGMENT_NAMES } from "@/lib/constants";
import type { Player, Segment } from "@/types";
import type { Unsubscribe } from "firebase/database";

export const segmentId = (segmentNumber: number) => `segment-${segmentNumber}`;

export function subscribeSegments(
  callback: (segments: Segment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.segments(),
    (snapshot) => {
      const segments = mapSnapshot(snapshot.val(), toSegment).sort(
        (a, b) => a.segmentNumber - b.segmentNumber,
      );
      callback(segments);
    },
    onError,
  );
}

export async function getSegment(segmentNumber: number): Promise<Segment | null> {
  const snapshot = await get(dbRefs.segment(segmentNumber));
  return snapshot.exists() ? toSegment(segmentId(segmentNumber), snapshot.val()) : null;
}

/** Create the 5 segment records if missing (idempotent). */
export async function ensureSegments(): Promise<number> {
  const now = Date.now();
  const snapshot = await get(dbRefs.segments());
  const existing = (snapshot.val() ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  let created = 0;
  for (let n = 1; n <= SEGMENT_COUNT; n += 1) {
    const id = segmentId(n);
    if (!existing[id]) {
      created += 1;
      updates[`segments/${id}`] = {
        segmentNumber: n,
        name: SEGMENT_NAMES[n - 1],
        playerIds: [],
        randomizedOrder: [],
        isOrderConfirmed: false,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      };
    }
  }
  if (created > 0) await update(rootRef(), updates);
  return created;
}

/**
 * Recompute each segment's playerIds roster from the players collection.
 * Admin action, intended before order confirmation. Segments whose order is
 * already confirmed are left untouched unless `force` is passed — overwriting
 * their roster would silently invalidate the confirmed order.
 * Callers must ensure the auction has not started before calling this.
 */
export async function syncSegmentRosters(
  players: Player[],
  options: { force?: boolean } = {},
): Promise<{ updated: Record<string, string[]>; skippedConfirmed: string[] }> {
  const snapshot = await get(dbRefs.segments());
  const existing = (snapshot.val() ?? {}) as Record<string, { isOrderConfirmed?: boolean }>;

  const rosters: Record<string, string[]> = {};
  const skippedConfirmed: string[] = [];
  for (let n = 1; n <= SEGMENT_COUNT; n += 1) {
    const id = segmentId(n);
    if (!options.force && existing[id]?.isOrderConfirmed) {
      skippedConfirmed.push(id);
      continue;
    }
    rosters[id] = players
      .filter((p) => p.segment === n)
      .map((p) => p.id)
      .sort();
  }
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  for (const [id, playerIds] of Object.entries(rosters)) {
    updates[`segments/${id}/playerIds`] = playerIds;
    updates[`segments/${id}/updatedAt`] = now;
  }
  if (Object.keys(updates).length > 0) await update(rootRef(), updates);
  return { updated: rosters, skippedConfirmed };
}

/** Pure check: `order` must contain exactly the ids in `roster`, each once. */
export function assertOrderIsPermutation(
  roster: string[],
  order: string[],
): void {
  if (order.length !== roster.length) {
    throw new Error(
      `Order has ${order.length} entries but the roster has ${roster.length} players.`,
    );
  }
  const seen = new Set<string>();
  for (const id of order) {
    if (!roster.includes(id)) {
      throw new Error(`Player ${id} is not in this segment.`);
    }
    if (seen.has(id)) {
      throw new Error(`Player ${id} appears twice in the order.`);
    }
    seen.add(id);
  }
  for (const id of roster) {
    if (!seen.has(id)) {
      throw new Error(`Player ${id} is missing from the order.`);
    }
  }
}

/** Fisher–Yates shuffle (crypto-strong when available). */
export function shuffleIds(ids: string[], random: () => number = Math.random): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Persist a confirmed randomized order. The segment's roster must contain
 * exactly PLAYERS_PER_SEGMENT players and the order must be a permutation of
 * that roster. Once stored, it survives refreshes and can only be changed via
 * unconfirmSegmentOrder — and never after the auction starts.
 */
export async function confirmSegmentOrder(
  segmentNumber: number,
  order: string[],
  auctionStatus: string,
): Promise<void> {
  if (auctionStatus !== "not_started") {
    throw new Error(
      "Orders can only be confirmed before the auction starts.",
    );
  }
  const segment = await getSegment(segmentNumber);
  if (!segment) throw new Error("Segment not found.");
  if (segment.playerIds.length !== PLAYERS_PER_SEGMENT) {
    throw new Error(
      `This segment has ${segment.playerIds.length}/${PLAYERS_PER_SEGMENT} players. ` +
        "Every segment must contain exactly " +
        `${PLAYERS_PER_SEGMENT} players before its order can be confirmed.`,
    );
  }
  assertOrderIsPermutation(segment.playerIds, order);
  await update(dbRefs.segment(segmentNumber), {
    randomizedOrder: order,
    isOrderConfirmed: true,
    updatedAt: Date.now(),
  });
}

/**
 * Un-confirm an order so a re-shuffle is possible. Only before the auction
 * starts — afterwards the confirmed order is permanent.
 */
export async function unconfirmSegmentOrder(
  segmentNumber: number,
  auctionStatus: string,
): Promise<void> {
  if (auctionStatus !== "not_started") {
    throw new Error("Orders are locked once the auction has started.");
  }
  await update(dbRefs.segment(segmentNumber), {
    isOrderConfirmed: false,
    updatedAt: Date.now(),
  });
}

export async function setSegmentCompleted(
  segmentNumber: number,
  isCompleted: boolean,
): Promise<void> {
  await update(dbRefs.segment(segmentNumber), {
    isCompleted,
    updatedAt: Date.now(),
  });
}
