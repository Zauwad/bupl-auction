/**
 * Players service — CRUD, segment assignment, bulk import payload builder.
 *
 * Invariants (here AND in database.rules.json):
 *  - basePrice is a non-negative number; segment is 1..totalSegments
 *  - a sold player's sale fields (status/finalPrice/purchasedByClubId) are immutable
 *  - players may only be deleted before the auction starts, and never after being sold
 *  - basePrice and segment are locked once the auction has started
 *    (use canEditPlayer / canChangeSegment to gate UI affordances)
 */
import {
  get,
  update,
  set,
  remove,
  push,
  subscribeToValue,
  dbRefs,
  rootRef,
} from "./database";
import { toPlayer, mapSnapshot } from "./converters";
import { SEGMENT_COUNT } from "@/lib/constants";
import type { Player, TournamentSettings } from "@/types";
import type { Unsubscribe } from "firebase/database";

export interface PlayerInput {
  name: string;
  photoUrl?: string;
  department?: string;
  academicYear?: string;
  category?: string;
  basePrice: number;
  segment: number;
}

const validatePrice = (price: number): void => {
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) {
    throw new Error("Base price must be a number between 0 and 10,000,000.");
  }
};

const validateSegment = (segment: number): void => {
  if (!Number.isInteger(segment) || segment < 1 || segment > SEGMENT_COUNT) {
    throw new Error(`Segment must be an integer between 1 and ${SEGMENT_COUNT}.`);
  }
};

export function validatePlayerName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new Error("Player name must be between 2 and 120 characters.");
  }
  return trimmed;
}

export function subscribePlayers(
  callback: (players: Player[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.players(),
    (snapshot) => {
      const players = mapSnapshot(snapshot.val(), toPlayer).sort(
        (a, b) => a.segment - b.segment || a.name.localeCompare(b.name),
      );
      callback(players);
    },
    onError,
  );
}

export function subscribePlayer(
  playerId: string,
  callback: (player: Player | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.player(playerId),
    (snapshot) => callback(snapshot.exists() ? toPlayer(playerId, snapshot.val()) : null),
    onError,
  );
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const snapshot = await get(dbRefs.player(playerId));
  return snapshot.exists() ? toPlayer(playerId, snapshot.val()) : null;
}

export async function createPlayer(input: PlayerInput): Promise<string> {
  const name = validatePlayerName(input.name);
  validatePrice(input.basePrice);
  validateSegment(input.segment);
  const now = Date.now();
  const ref = push(dbRefs.players());
  const record: Record<string, unknown> = {
    name,
    basePrice: input.basePrice,
    segment: input.segment,
    status: "upcoming",
    purchasedByClubId: null,
    finalPrice: null,
    createdAt: now,
    updatedAt: now,
  };
  // RTDB cannot store null as a meaningful value — omit absent optionals.
  if (input.photoUrl) record.photoUrl = input.photoUrl;
  if (input.department) record.department = input.department;
  if (input.academicYear) record.academicYear = input.academicYear;
  if (input.category) record.category = input.category;
  await set(ref, record);
  return ref.key as string;
}

export type PlayerPatch = Partial<Omit<PlayerInput, "segment">> & {
  segment?: number;
};

export interface UpdatePlayerOptions {
  /**
   * Explicit "correction mode" invoked by the admin after the auction starts.
   * Without this flag, basePrice and segment are refused once the auction has
   * started. Sold players' records remain immutable through this path
   * regardless of the flag.
   */
  allowCorrection?: boolean;
}

/**
 * Edit a player. Sale fields are never editable here — they change only via
 * purchase.ts. Segment and basePrice are refused once the auction starts
 * unless the admin explicitly passes { allowCorrection: true }. Everything
 * else (name, photo, department, year, category) stays editable for typo
 * fixes even mid-auction.
 */
export async function updatePlayer(
  playerId: string,
  patch: PlayerPatch,
  settings: TournamentSettings,
  options: UpdatePlayerOptions = {},
): Promise<void> {
  const existing = await getPlayer(playerId);
  if (!existing) throw new Error("Player not found.");
  if (existing.status === "sold") {
    throw new Error(
      "This player has been sold — price and assignment are locked. Correct records via the admin reset procedure.",
    );
  }

  const lifecycleLocked = settings.auctionStatus !== "not_started";
  const correction = options.allowCorrection === true;
  const next: Record<string, unknown> = { updatedAt: Date.now() };

  if (patch.name !== undefined) next.name = validatePlayerName(patch.name);
  if (patch.photoUrl !== undefined) next.photoUrl = patch.photoUrl.trim() || null;
  if (patch.department !== undefined) next.department = patch.department.trim() || null;
  if (patch.academicYear !== undefined) next.academicYear = patch.academicYear.trim() || null;
  if (patch.category !== undefined) next.category = patch.category.trim() || null;

  if (patch.basePrice !== undefined) {
    validatePrice(patch.basePrice);
    if (lifecycleLocked && !correction) {
      throw new Error("Base price cannot be changed after the auction has started. Enable correction mode if this is an authorized fix.");
    }
    next.basePrice = patch.basePrice;
  }
  if (patch.segment !== undefined) {
    validateSegment(patch.segment);
    if (lifecycleLocked && !correction) {
      throw new Error("Segment assignment cannot be changed after the auction has started. Enable correction mode if this is an authorized fix.");
    }
    next.segment = patch.segment;
  }

  await update(dbRefs.player(playerId), next);
}

/** Delete a player — only before the auction starts, and never if sold. */
export async function deletePlayer(
  playerId: string,
  auctionStatus: string,
): Promise<void> {
  if (auctionStatus !== "not_started") {
    throw new Error("Players can only be deleted before the auction starts.");
  }
  const existing = await getPlayer(playerId);
  if (!existing) return; // idempotent
  if (existing.status === "sold") {
    throw new Error("A sold player cannot be deleted.");
  }
  await remove(dbRefs.player(playerId));
}

/** Pure permission helpers for UI affordances (rules are the real backstop). */
export function canChangeSegmentOrPrice(settings: TournamentSettings): boolean {
  return settings.auctionStatus === "not_started";
}

export function canDeletePlayer(player: Player, settings: TournamentSettings): boolean {
  return settings.auctionStatus === "not_started" && player.status !== "sold";
}

/**
 * Create many players in one atomic multi-path update (used by CSV import in
 * Phase 5). All-or-nothing: if any row is invalid the whole import is refused.
 * Returns the created playerIds.
 */
export async function createPlayersBatch(inputs: PlayerInput[]): Promise<string[]> {
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  const ids: string[] = [];

  for (const input of inputs) {
    const name = validatePlayerName(input.name);
    validatePrice(input.basePrice);
    validateSegment(input.segment);
    const key = push(dbRefs.players()).key as string;
    ids.push(key);
    const record: Record<string, unknown> = {
      name,
      basePrice: input.basePrice,
      segment: input.segment,
      status: "upcoming",
      purchasedByClubId: null,
      finalPrice: null,
      createdAt: now,
      updatedAt: now,
    };
    if (input.photoUrl) record.photoUrl = input.photoUrl;
    if (input.department) record.department = input.department;
    if (input.academicYear) record.academicYear = input.academicYear;
    if (input.category) record.category = input.category;
    updates[`players/${key}`] = record;
  }

  if (ids.length > 0) await update(rootRef(), updates);
  return ids;
}
