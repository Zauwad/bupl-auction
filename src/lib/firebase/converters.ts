/**
 * Converters between raw RTDB snapshots and domain types.
 * RTDB is schemaless — these functions are the single place that defends
 * against missing/malformed data so the rest of the app can trust types.
 */
import { segmentDisplayName } from "@/lib/constants";
import type {
  AuctionHistoryRecord,
  Club,
  Player,
  PlayerStatus,
  Segment,
  TournamentSettings,
} from "@/types";

const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const asOptionalString = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

const asNumber = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const asNumberOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const asBoolean = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;

const asStringOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** RTDB returns arrays for contiguous-integer-key lists; object maps otherwise. */
const asStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (v && typeof v === "object") {
    return Object.keys(v as Record<string, unknown>)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (v as Record<string, unknown>)[k])
      .filter((x): x is string => typeof x === "string");
  }
  return [];
};

const asIdMap = (v: unknown): Record<string, true> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, true> = {};
  for (const key of Object.keys(v as Record<string, unknown>)) out[key] = true;
  return out;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

const PLAYER_STATUSES: readonly PlayerStatus[] = ["upcoming", "current", "sold", "unsold"];
const asPlayerStatus = (v: unknown): PlayerStatus =>
  PLAYER_STATUSES.includes(v as PlayerStatus) ? (v as PlayerStatus) : "upcoming";

export function toSettings(raw: unknown): TournamentSettings | null {
  if (!isRecord(raw)) return null;
  return {
    tournamentName: asString(raw.tournamentName, "Tournament"),
    totalSegments: asNumber(raw.totalSegments, 5),
    currentSegment: asNumber(raw.currentSegment, 1),
    auctionStatus:
      raw.auctionStatus === "live" ||
      raw.auctionStatus === "paused" ||
      raw.auctionStatus === "completed" ||
      raw.auctionStatus === "not_started"
        ? raw.auctionStatus
        : "not_started",
    currentPlayerId: asStringOrNull(raw.currentPlayerId),
    updatedAt: asNumber(raw.updatedAt),
  };
}

export function toClub(id: string, raw: unknown): Club {
  const r = isRecord(raw) ? raw : {};
  return {
    id,
    name: asString(r.name, "Unnamed club"),
    abbreviation: asOptionalString(r.abbreviation),
    logoUrl: asOptionalString(r.logoUrl),
    initialBudget: asNumber(r.initialBudget),
    remainingBudget: asNumber(r.remainingBudget),
    totalPlayersPurchased: asNumber(r.totalPlayersPurchased),
    purchasedPlayerIds: asIdMap(r.purchasedPlayerIds),
    createdAt: asNumber(r.createdAt),
    updatedAt: asNumber(r.updatedAt),
  };
}

export function toPlayer(id: string, raw: unknown): Player {
  const r = isRecord(raw) ? raw : {};
  return {
    id,
    name: asString(r.name, "Unnamed player"),
    studentId: asOptionalString(r.studentId),
    photoUrl: asOptionalString(r.photoUrl),
    department: asOptionalString(r.department),
    academicYear: asOptionalString(r.academicYear),
    category: asOptionalString(r.category),
    basePrice: asNumber(r.basePrice),
    segment: asNumber(r.segment, 1),
    status: asPlayerStatus(r.status),
    purchasedByClubId: asStringOrNull(r.purchasedByClubId),
    finalPrice: asNumberOrNull(r.finalPrice),
    createdAt: asNumber(r.createdAt),
    updatedAt: asNumber(r.updatedAt),
  };
}

export function toSegment(id: string, raw: unknown): Segment {
  const r = isRecord(raw) ? raw : {};
  const segmentNumber = asNumber(r.segmentNumber, Number(id.replace(/\D/g, "")) || 1);
  return {
    id,
    name: typeof r.name === "string" && r.name.trim().length > 0 ? r.name : segmentDisplayName(segmentNumber),
    segmentNumber,
    playerIds: asStringArray(r.playerIds),
    randomizedOrder: asStringArray(r.randomizedOrder),
    isOrderConfirmed: asBoolean(r.isOrderConfirmed),
    isCompleted: asBoolean(r.isCompleted),
    createdAt: asNumber(r.createdAt),
    updatedAt: asNumber(r.updatedAt),
  };
}

export function toHistoryRecord(id: string, raw: unknown): AuctionHistoryRecord {
  const r = isRecord(raw) ? raw : {};
  return {
    id,
    playerId: asString(r.playerId),
    playerName: asString(r.playerName),
    clubId: asStringOrNull(r.clubId),
    clubName: asStringOrNull(r.clubName),
    finalPrice: asNumberOrNull(r.finalPrice),
    segment: asNumber(r.segment, 1),
    action: r.action === "unsold" ? "unsold" : "sold",
    adminUid: asString(r.adminUid),
    timestamp: asNumber(r.timestamp),
  };
}

/** Convert an id-keyed object snapshot (e.g. /clubs) into a typed array. */
export function mapSnapshot<T>(
  value: unknown,
  toItem: (id: string, raw: unknown) => T,
): T[] {
  if (!isRecord(value)) return [];
  return Object.entries(value).map(([id, raw]) => toItem(id, raw));
}
