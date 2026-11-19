/**
 * Admin danger zone — full auction reset.
 *
 * Resets (WITHOUT deleting anything the admin configured):
 *   - players   → status "upcoming", purchasedByClubId null, finalPrice null
 *                 (names, photos, base prices, segments, student IDs kept)
 *   - clubs     → remainingBudget = initialBudget, totalPlayersPurchased = 0,
 *                 purchasedPlayerIds = {} (name, logo, budget kept)
 *   - segments  → randomizedOrder = [], isOrderConfirmed = false, isCompleted = false
 *                 (roster playerIds and names kept)
 *   - settings  → auctionStatus = "not_started", currentSegment = 1, currentPlayerId = null
 *                 (tournament name kept)
 *   - history   → ALL records deleted (not_started-only guard removed from rules)
 *
 * Admins are never touched. First attempt is one atomic multi-location update
 * (all-or-nothing). If the deployed ruleset rejects it, the reset falls back to
 * sequential per-path writes so as much of the tournament resets as possible,
 * and the result tells the admin exactly what succeeded and what failed.
 */
import { get, update, set, remove, ref, rootRef, dbRefs } from "./database";
import { getFirebaseDatabase } from "./config";

export interface ResetResult {
  players: number;
  clubs: number;
  segments: number;
  historyRecords: number;
  /**
   * Which parts succeeded when the atomic commit was rejected (partial mode).
   * Empty when the atomic commit succeeded.
   */
  partialFailures: Array<string>;
  atomic: boolean;
}

function buildUpdates(
  clubsVal: Record<string, Record<string, unknown>>,
  playersVal: Record<string, unknown>,
  segmentsVal: Record<string, unknown>,
  historyVal: Record<string, unknown>,
): Record<string, unknown> {
  const now = Date.now();
  const updates: Record<string, unknown> = {
    "settings/auctionStatus": "not_started",
    "settings/currentSegment": 1,
    "settings/currentPlayerId": null,
    "settings/updatedAt": now,
  };

  for (const [clubId, club] of Object.entries(clubsVal)) {
    const initialBudget = typeof club.initialBudget === "number" ? club.initialBudget : 0;
    updates[`clubs/${clubId}/remainingBudget`] = initialBudget;
    updates[`clubs/${clubId}/totalPlayersPurchased`] = 0;
    updates[`clubs/${clubId}/purchasedPlayerIds`] = {};
    updates[`clubs/${clubId}/updatedAt`] = now;
  }

  for (const playerId of Object.keys(playersVal)) {
    updates[`players/${playerId}/status`] = "upcoming";
    updates[`players/${playerId}/purchasedByClubId`] = null;
    updates[`players/${playerId}/finalPrice`] = null;
    updates[`players/${playerId}/updatedAt`] = now;
  }

  for (const segmentKey of Object.keys(segmentsVal)) {
    updates[`segments/${segmentKey}/randomizedOrder`] = [];
    updates[`segments/${segmentKey}/isOrderConfirmed`] = false;
    updates[`segments/${segmentKey}/isCompleted`] = false;
    updates[`segments/${segmentKey}/updatedAt`] = now;
  }

  for (const historyId of Object.keys(historyVal)) {
    updates[`history/${historyId}`] = null;
  }

  return updates;
}

function summariseCounts(
  clubsVal: Record<string, unknown>,
  playersVal: Record<string, unknown>,
  segmentsVal: Record<string, unknown>,
  historyVal: Record<string, unknown>,
): Pick<ResetResult, "players" | "clubs" | "segments" | "historyRecords"> {
  return {
    players: Object.keys(playersVal).length,
    clubs: Object.keys(clubsVal).length,
    segments: Object.keys(segmentsVal).length,
    historyRecords: Object.keys(historyVal).length,
  };
}

/** Atomically reset every mutable node to its pre-auction default. */
export async function resetAuction(): Promise<ResetResult> {
  const [settingsSnap, clubsSnap, playersSnap, segmentsSnap, historySnap] =
    await Promise.all([
      get(dbRefs.settings()),
      get(dbRefs.clubs()),
      get(dbRefs.players()),
      get(dbRefs.segments()),
      get(dbRefs.history()),
    ]);

  if (!settingsSnap.exists()) {
    throw new Error("Tournament settings do not exist — nothing to reset against.");
  }

  const clubsVal = (clubsSnap.val() ?? {}) as Record<string, Record<string, unknown>>;
  const playersVal = (playersSnap.val() ?? {}) as Record<string, unknown>;
  const segmentsVal = (segmentsSnap.val() ?? {}) as Record<string, unknown>;
  const historyVal = (historySnap.val() ?? {}) as Record<string, unknown>;
  const counts = summariseCounts(clubsVal, playersVal, segmentsVal, historyVal);

  const updates = buildUpdates(clubsVal, playersVal, segmentsVal, historyVal);

  // Atomic attempt first — fastest, and all-or-nothing when it works.
  try {
    await update(rootRef(), updates);
    return { ...counts, atomic: true, partialFailures: [] };
  } catch {
    // Fall back to sequential per-path writes so the operator gets as close
    // to a clean slate as the deployed rules allow, and a clear report of
    // what still needs doing in the Firebase console.
    const now = Date.now();
    const partialFailures: string[] = [];

    const db = getFirebaseDatabase();
    const runPatch = async (path: string, body: unknown, label: string) => {
      try {
        await set(ref(db, path), body);
      } catch {
        partialFailures.push(`${label} blocked by deployed Firebase rules`);
      }
    };
    const runDelete = async (path: string, label: string) => {
      try {
        await remove(ref(db, path));
      } catch {
        partialFailures.push(`${label} blocked by deployed Firebase rules`);
      }
    };

    // settings first — rest of the tournament depends on it being not_started
    await runPatch(
      "settings",
      { ...settingsSnap.val(), auctionStatus: "not_started", currentSegment: 1, currentPlayerId: null, updatedAt: now },
      "tournament settings",
    );
    for (const [clubId, club] of Object.entries(clubsVal)) {
      const initialBudget = typeof club.initialBudget === "number" ? club.initialBudget : 0;
      await runPatch(
        `clubs/${clubId}`,
        {
          ...club,
          remainingBudget: initialBudget,
          totalPlayersPurchased: 0,
          purchasedPlayerIds: {},
          updatedAt: now,
        },
        `club ${(club as { abbreviation?: string }).abbreviation ?? clubId}`,
      );
    }
    for (const [playerId, playerRaw] of Object.entries(playersVal)) {
      const player = playerRaw as Record<string, unknown>;
      await runPatch(
        `players/${playerId}`,
        { ...player, status: "upcoming", purchasedByClubId: null, finalPrice: null, updatedAt: now },
        `player ${player.name ?? playerId}`,
      );
    }
    for (const [segmentKey, segmentRaw] of Object.entries(segmentsVal)) {
      const segment = segmentRaw as Record<string, unknown>;
      await runPatch(
        `segments/${segmentKey}`,
        { ...segment, randomizedOrder: [], isOrderConfirmed: false, isCompleted: false, updatedAt: now },
        `segment ${segment.name ?? segmentKey}`,
      );
    }
    for (const [historyId] of Object.entries(historyVal)) {
      await runDelete(`history/${historyId}`, `history record ${historyId.slice(-6)}`);
    }

    return { ...counts, atomic: false, partialFailures };
  }
}
