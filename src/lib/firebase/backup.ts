/**
 * Tournament State Disaster Recovery — 1-click snapshot export and point-in-time restore.
 *
 * Captures all 5 root tournament collections in Firebase RTDB:
 *  - /settings (status, current segment, active player on the block)
 *  - /clubs    (budgets, rosters, purchased players)
 *  - /players  (status, sale prices, assigned clubs)
 *  - /segments (randomized auction order, completed flags)
 *  - /history  (immutable audit trail of all hammer drops)
 */
import { get, update, rootRef, dbRefs } from "./database";

export interface TournamentBackupSnapshot {
  schemaVersion: 1;
  exportedAt: string;
  tournamentName: string;
  stats: {
    totalClubs: number;
    totalPlayers: number;
    soldPlayers: number;
    unsoldPlayers: number;
    historyRecords: number;
  };
  data: {
    settings: Record<string, unknown> | null;
    clubs: Record<string, unknown> | null;
    players: Record<string, unknown> | null;
    segments: Record<string, unknown> | null;
    history: Record<string, unknown> | null;
  };
}

export interface RestoreSummary {
  clubsCount: number;
  playersCount: number;
  segmentsCount: number;
  historyCount: number;
}

/**
 * Creates and returns a complete, point-in-time JSON snapshot of the entire tournament state.
 */
export async function exportTournamentSnapshot(): Promise<TournamentBackupSnapshot> {
  const [settingsSnap, clubsSnap, playersSnap, segmentsSnap, historySnap] =
    await Promise.all([
      get(dbRefs.settings()),
      get(dbRefs.clubs()),
      get(dbRefs.players()),
      get(dbRefs.segments()),
      get(dbRefs.history()),
    ]);

  const settingsVal = (settingsSnap.val() ?? {}) as Record<string, unknown>;
  const clubsVal = (clubsSnap.val() ?? {}) as Record<string, unknown>;
  const playersVal = (playersSnap.val() ?? {}) as Record<string, Record<string, unknown>>;
  const segmentsVal = (segmentsSnap.val() ?? {}) as Record<string, unknown>;
  const historyVal = (historySnap.val() ?? {}) as Record<string, unknown>;

  const playersList = Object.values(playersVal);
  const soldPlayers = playersList.filter((p) => p?.status === "sold").length;
  const unsoldPlayers = playersList.filter((p) => p?.status === "unsold").length;

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tournamentName: typeof settingsVal.tournamentName === "string" ? settingsVal.tournamentName : "BUPL Tournament",
    stats: {
      totalClubs: Object.keys(clubsVal).length,
      totalPlayers: playersList.length,
      soldPlayers,
      unsoldPlayers,
      historyRecords: Object.keys(historyVal).length,
    },
    data: {
      settings: settingsVal,
      clubs: clubsVal,
      players: playersVal,
      segments: segmentsVal,
      history: historyVal,
    },
  };
}

/**
 * Validates and atomically restores a tournament snapshot to Firebase RTDB.
 */
export async function restoreTournamentSnapshot(raw: unknown): Promise<RestoreSummary> {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid backup file: Root must be a JSON object.");
  }

  const snapshot = raw as Partial<TournamentBackupSnapshot>;

  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported backup schema version: ${snapshot.schemaVersion ?? "unknown"}. Expected version 1.`);
  }

  if (!snapshot.data || typeof snapshot.data !== "object") {
    throw new Error("Invalid backup file: Missing 'data' payload.");
  }

  const { settings, clubs, players, segments, history } = snapshot.data;

  if (!settings || typeof settings !== "object") {
    throw new Error("Invalid backup file: Missing or invalid 'settings' node.");
  }
  if (!clubs || typeof clubs !== "object") {
    throw new Error("Invalid backup file: Missing or invalid 'clubs' node.");
  }
  if (!players || typeof players !== "object") {
    throw new Error("Invalid backup file: Missing or invalid 'players' node.");
  }
  if (!segments || typeof segments !== "object") {
    throw new Error("Invalid backup file: Missing or invalid 'segments' node.");
  }

  const now = Date.now();
  const settingsToRestore = {
    ...settings,
    updatedAt: now,
  };

  // Perform one atomic multi-location update spanning all collections
  const updates: Record<string, unknown> = {
    settings: settingsToRestore,
    clubs: clubs,
    players: players,
    segments: segments,
    history: history ?? {},
  };

  await update(rootRef(), updates);

  return {
    clubsCount: Object.keys(clubs).length,
    playersCount: Object.keys(players).length,
    segmentsCount: Object.keys(segments).length,
    historyCount: history ? Object.keys(history).length : 0,
  };
}

