/**
 * Tournament settings service — the auction's single source of truth for
 * "where are we right now". Stored as a singleton at /settings.
 */
import { get, update, subscribeToValue, dbRefs, rootRef } from "./database";
import { toSettings } from "./converters";
import { SEGMENT_COUNT, DB_PATHS, SEGMENT_NAMES } from "@/lib/constants";
import type { AuctionStatus, TournamentSettings } from "@/types";
import type { Unsubscribe } from "firebase/database";

const DEFAULT_TOURNAMENT_NAME = "BUPL Cricket Auction";

export function buildDefaultSettings(
  overrides: Partial<TournamentSettings> = {},
): TournamentSettings {
  return {
    tournamentName: DEFAULT_TOURNAMENT_NAME,
    totalSegments: SEGMENT_COUNT,
    currentSegment: 1,
    auctionStatus: "not_started",
    currentPlayerId: null,
    updatedAt: Date.now(),
    ...overrides,
  };
}

export async function getSettings(): Promise<TournamentSettings | null> {
  const snapshot = await get(dbRefs.settings());
  return toSettings(snapshot.val());
}

export function subscribeSettings(
  callback: (settings: TournamentSettings | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.settings(),
    (snapshot) => callback(toSettings(snapshot.val())),
    onError,
  );
}

/** Patch settings. Pass `{ currentPlayerId: null }` to clear the current player. */
export async function updateSettings(
  patch: Partial<Omit<TournamentSettings, "updatedAt">>,
): Promise<void> {
  await update(dbRefs.settings(), { ...patch, updatedAt: Date.now() });
}

export const setAuctionStatus = (auctionStatus: AuctionStatus) =>
  updateSettings({ auctionStatus });

export const setCurrentSegment = (currentSegment: number) =>
  updateSettings({ currentSegment });

export const setCurrentPlayer = (currentPlayerId: string | null) =>
  updateSettings({ currentPlayerId });

export const setTournamentName = (tournamentName: string) =>
  updateSettings({ tournamentName: tournamentName.trim() });

/**
 * Create /settings and the 5 empty /segments if missing (first-time setup).
 * Admin-only in practice — /settings and /segments writes require an admin.
 * Returns a summary of what was created.
 */
export async function ensureTournamentDefaults(
  tournamentName?: string,
): Promise<{ settingsCreated: boolean; segmentsCreated: number }> {
  const now = Date.now();
  const [settingsSnap, segmentsSnap] = await Promise.all([
    get(dbRefs.settings()),
    get(dbRefs.segments()),
  ]);

  const updates: Record<string, unknown> = {};

  let settingsCreated = false;
  if (!settingsSnap.exists()) {
    settingsCreated = true;
    updates[DB_PATHS.settings] = buildDefaultSettings({
      updatedAt: now,
      ...(tournamentName ? { tournamentName: tournamentName.trim() } : {}),
    });
  }

  const existingSegments = (segmentsSnap.val() ?? {}) as Record<string, unknown>;
  let segmentsCreated = 0;
  for (let n = 1; n <= SEGMENT_COUNT; n += 1) {
    if (!existingSegments[`segment-${n}`]) {
      segmentsCreated += 1;
      updates[`${DB_PATHS.segments}/segment-${n}`] = {
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

  if (Object.keys(updates).length > 0) {
    await update(rootRef(), updates);
  }
  return { settingsCreated, segmentsCreated };
}
