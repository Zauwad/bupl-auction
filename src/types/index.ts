/**
 * Domain types for the cricket auction system.
 * These mirror the Firebase Realtime Database structure (see database.rules.json).
 */

export type AuctionStatus = "not_started" | "live" | "paused" | "completed";
export type PlayerStatus = "upcoming" | "current" | "sold" | "unsold";

/** Tournament-wide settings stored at /settings. */
export interface TournamentSettings {
  tournamentName: string;
  totalSegments: number;
  currentSegment: number; // 1-based segment number
  auctionStatus: AuctionStatus;
  currentPlayerId: string | null;
  updatedAt: number; // Unix timestamp in milliseconds
}

/**
 * Club / franchise stored at /clubs/{clubId}.
 * purchasedPlayerIds is an RTDB map of playerId -> true (RTDB arrays are fragile;
 * use squadIds(club) to get the id list).
 */
export interface Club {
  id: string;
  name: string;
  abbreviation?: string;
  logoUrl?: string;
  initialBudget: number;
  remainingBudget: number;
  totalPlayersPurchased: number;
  purchasedPlayerIds: Record<string, true>;
  createdAt: number;
  updatedAt: number;
}

/** Helper: list of purchased player ids for a club. */
export function squadIds(club: Club): string[] {
  return Object.keys(club.purchasedPlayerIds ?? {});
}

/** Player stored at /players/{playerId}. */
export interface Player {
  id: string;
  name: string;
  /** University student ID — matches the image filename and the printed list. */
  studentId?: string;
  photoUrl?: string;
  department?: string;
  academicYear?: string;
  category?: string;
  basePrice: number;
  segment: number; // 1-based segment number
  status: PlayerStatus;
  purchasedByClubId: string | null;
  finalPrice: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Segment metadata stored at /segments/segment-{n}.
 * randomizedOrder is a real ordered array (auction sequence, positions 1..10).
 */
export interface Segment {
  id: string; // e.g. "segment-1"
  name?: string; // e.g. "Game Changer" — falls back to constants SEGMENT_NAMES
  segmentNumber: number; // 1-based
  playerIds: string[];
  randomizedOrder: string[]; // player IDs in confirmed auction order
  isOrderConfirmed: boolean;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Admin action recorded against each history entry. */
export type AuctionAction = "sold" | "unsold";

/**
 * Immutable transaction record stored at /history/{historyId}.
 * Append-only — rules forbid update/delete. Player/club names are denormalized
 * for efficient display without joins.
 */
export interface AuctionHistoryRecord {
  id: string;
  playerId: string;
  playerName: string;
  clubId: string | null;
  clubName: string | null;
  finalPrice: number | null;
  segment: number;
  action: AuctionAction;
  adminUid: string;
  timestamp: number;
}

/** Admin allow-list entry stored at /admins/{uid}. */
export interface AdminUser {
  uid: string;
  email: string;
  role: "superadmin" | "admin";
  createdAt: number;
}
