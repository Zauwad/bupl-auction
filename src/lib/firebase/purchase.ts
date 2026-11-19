/**
 * Purchase service — the heart of data integrity for the live auction.
 *
 * Every finalized result is written as ONE atomic multi-path update at the
 * database root: player + club budget/squad + history record + resetting
 * settings.currentPlayerId. Either everything commits or nothing does.
 *
 * Double-sell protection is enforced at commit time by RTDB security rules,
 * which are evaluated atomically against the latest committed data:
 * once a player is 'sold', no later update can keep or re-set it to 'sold'
 * with a different buyer/price — so two concurrent admins cannot both win
 * the same player. Losing paths fail the whole update (no partial writes,
 * no history record, no budget change).
 *
 * Client-side validation below exists for fast, friendly error messages.
 * The rules remain the enforcement layer.
 */
import {
  get,
  update,
  push,
  rootRef,
  dbRefs,
} from "./database";
import { toClub, toPlayer, toSettings } from "./converters";

export type PurchaseErrorCode =
  | "auction_not_active"
  | "not_current_player"
  | "player_not_found"
  | "player_already_sold"
  | "club_not_found"
  | "invalid_price"
  | "price_below_base"
  | "insufficient_budget";

export class PurchaseError extends Error {
  constructor(
    public readonly code: PurchaseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PurchaseError";
  }
}

export interface SaleInput {
  playerId: string;
  clubId: string;
  /** Final purchase price. Must be an integer >= the player's base price. */
  price: number;
  adminUid: string;
}

export interface UnsoldInput {
  playerId: string;
  adminUid: string;
}

interface LoadedContext {
  settings: NonNullable<ReturnType<typeof toSettings>>;
  player: NonNullable<ReturnType<typeof toPlayer>>;
}

async function loadAndCheckActive(
  playerId: string,
): Promise<LoadedContext> {
  const [settingsSnap, playerSnap] = await Promise.all([
    get(dbRefs.settings()),
    get(dbRefs.player(playerId)),
  ]);

  const settings = toSettings(settingsSnap.val());
  if (!settings || (settings.auctionStatus !== "live" && settings.auctionStatus !== "paused")) {
    throw new PurchaseError(
      "auction_not_active",
      "The auction is not live. Start or resume the auction before recording results.",
    );
  }
  if (settings.currentPlayerId !== playerId) {
    throw new PurchaseError(
      "not_current_player",
      "Only the player currently on the block can be finalized. Move to this player first.",
    );
  }
  if (!playerSnap.exists()) {
    throw new PurchaseError("player_not_found", "Player not found.");
  }
  const player = toPlayer(playerId, playerSnap.val());
  if (player.status === "sold") {
    throw new PurchaseError(
      "player_already_sold",
      "This player has already been sold.",
    );
  }
  return { settings, player };
}

/**
 * Record a sale: mark the player SOLD, assign the club, deduct the price,
 * add the player to the club's squad and append an immutable history record.
 * All in one atomic commit. Returns the history record id.
 */
export async function recordSale(input: SaleInput): Promise<string> {
  const { playerId, clubId, price, adminUid } = input;

  if (!Number.isInteger(price) || price < 0) {
    throw new PurchaseError(
      "invalid_price",
      "Purchase price must be a whole number (no decimals), zero or more.",
    );
  }

  const { player } = await loadAndCheckActive(playerId);

  if (price < player.basePrice) {
    throw new PurchaseError(
      "price_below_base",
      `Price (${price}) is below the base price (${player.basePrice}).`,
    );
  }

  const clubSnap = await get(dbRefs.club(clubId));
  if (!clubSnap.exists()) {
    throw new PurchaseError("club_not_found", "Club not found.");
  }
  const club = toClub(clubId, clubSnap.val());
  if (club.remainingBudget < price) {
    throw new PurchaseError(
      "insufficient_budget",
      `${club.name} has only ${club.remainingBudget} remaining — insufficient for ${price}.`,
    );
  }

  const now = Date.now();
  const historyId = push(dbRefs.history()).key as string;

  const playerRecord: Record<string, unknown> = {
    name: player.name,
    basePrice: player.basePrice,
    segment: player.segment,
    status: "sold",
    purchasedByClubId: clubId,
    finalPrice: price,
    createdAt: player.createdAt,
    updatedAt: now,
  };
  if (player.studentId) playerRecord.studentId = player.studentId;
  if (player.photoUrl) playerRecord.photoUrl = player.photoUrl;
  if (player.department) playerRecord.department = player.department;
  if (player.academicYear) playerRecord.academicYear = player.academicYear;
  if (player.category) playerRecord.category = player.category;

  const clubRecord: Record<string, unknown> = {
    name: club.name,
    initialBudget: club.initialBudget,
    remainingBudget: club.remainingBudget - price,
    totalPlayersPurchased: club.totalPlayersPurchased + 1,
    purchasedPlayerIds: { ...club.purchasedPlayerIds, [playerId]: true },
    createdAt: club.createdAt,
    updatedAt: now,
  };
  if (club.logoUrl) clubRecord.logoUrl = club.logoUrl;

  const updates: Record<string, unknown> = {
    [`players/${playerId}`]: playerRecord,
    [`clubs/${clubId}`]: clubRecord,
    [`history/${historyId}`]: {
      playerId,
      playerName: player.name,
      clubId,
      clubName: club.name,
      finalPrice: price,
      segment: player.segment,
      action: "sold",
      adminUid,
      timestamp: now,
    },
    "settings/currentPlayerId": null, // player finalized — no longer on the block
    "settings/updatedAt": now,
  };

  await update(rootRef(), updates);
  return historyId;
}

/**
 * Record an UNSOLD result: mark the player UNSOLD, append a history record.
 * No club budget is touched. Atomic for the same reasons as recordSale.
 */
export async function markUnsold(input: UnsoldInput): Promise<string> {
  const { playerId, adminUid } = input;
  const { player } = await loadAndCheckActive(playerId);

  const now = Date.now();
  const historyId = push(dbRefs.history()).key as string;

  const playerRecord: Record<string, unknown> = {
    name: player.name,
    basePrice: player.basePrice,
    segment: player.segment,
    status: "unsold",
    purchasedByClubId: null,
    finalPrice: null,
    createdAt: player.createdAt,
    updatedAt: now,
  };
  if (player.studentId) playerRecord.studentId = player.studentId;
  if (player.photoUrl) playerRecord.photoUrl = player.photoUrl;
  if (player.department) playerRecord.department = player.department;
  if (player.academicYear) playerRecord.academicYear = player.academicYear;
  if (player.category) playerRecord.category = player.category;

  const updates: Record<string, unknown> = {
    [`players/${playerId}`]: playerRecord,
    [`history/${historyId}`]: {
      playerId,
      playerName: player.name,
      clubId: null,
      clubName: null,
      finalPrice: null,
      segment: player.segment,
      action: "unsold",
      adminUid,
      timestamp: now,
    },
    "settings/currentPlayerId": null,
    "settings/updatedAt": now,
  };

  await update(rootRef(), updates);
  return historyId;
}
