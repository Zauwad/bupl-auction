/** Tournament structure constants. Change here to adapt the format. */
export const SEGMENT_COUNT = 5;
export const PLAYERS_PER_SEGMENT = 10;
export const TOTAL_PLAYERS = SEGMENT_COUNT * PLAYERS_PER_SEGMENT; // 50

/** Official segment identities, in index order (1-based). */
export const SEGMENT_NAMES = [
  "Game Changer",
  "Stroke Maker",
  "Trump Card",
  "Assassin",
  "Young Blood",
] as const;

/** Display name for a 1-based segment number. Falls back to a plain label. */
export function segmentDisplayName(segmentNumber: number): string {
  return SEGMENT_NAMES[segmentNumber - 1] ?? `Segment ${segmentNumber}`;
}

/** Short label used on tight UI surfaces (chips, rails). */
export function segmentShortName(segmentNumber: number): string {
  return SEGMENT_NAMES[segmentNumber - 1] ?? `S${segmentNumber}`;
}
export const MIN_CLUBS = 10;
export const MAX_CLUBS = 10;

/** Currency symbol used for price display. Swap for your tournament's currency. */
export const CURRENCY_SYMBOL = "৳";

/** Firebase Realtime Database root paths. Keep in sync with database.rules.json. */
export const DB_PATHS = {
  settings: "settings",
  clubs: "clubs",
  players: "players",
  segments: "segments",
  history: "history",
  admins: "admins",
} as const;
