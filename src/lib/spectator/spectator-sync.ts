import {
  toSettings,
  toClub,
  toPlayer,
  toSegment,
  toHistoryRecord,
  mapSnapshot,
} from "@/lib/firebase/converters";
import type {
  TournamentSettings,
  Club,
  Player,
  Segment,
  AuctionHistoryRecord,
} from "@/types";

export interface SpectatorAuctionState {
  settings: TournamentSettings | null;
  clubs: Club[];
  players: Player[];
  segments: Segment[];
  history: AuctionHistoryRecord[];
  timestamp: number;
}

type StateListener = (state: SpectatorAuctionState) => void;

class SpectatorSyncManager {
  private listeners = new Set<StateListener>();
  private currentState: SpectatorAuctionState | null = null;
  private pollIntervalMs = 2000;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isFetching = false;
  private isPaused = false;

  constructor() {
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.isPaused = true;
          this.stopPolling();
        } else {
          this.isPaused = false;
          // Immediately fetch on tab return and resume
          this.fetchLatest();
          this.startPolling();
        }
      });
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);

    // If state is already cached in memory, immediately notify listener
    if (this.currentState) {
      listener(this.currentState);
    } else {
      this.fetchLatest();
    }

    if (this.listeners.size === 1) {
      this.startPolling();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling() {
    if (this.timer || this.isPaused || typeof window === "undefined") return;
    this.timer = setInterval(() => {
      this.fetchLatest();
    }, this.pollIntervalMs);
  }

  private stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async fetchLatest(): Promise<void> {
    if (this.isFetching || typeof window === "undefined") return;
    this.isFetching = true;

    try {
      const res = await fetch("/api/auction-state", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Edge cache returned HTTP ${res.status}`);
      }

      const raw = await res.json();

      const parsedSettings = toSettings(raw.settings);
      const parsedClubs = mapSnapshot(raw.clubs, toClub).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const parsedPlayers = mapSnapshot(raw.players, toPlayer).sort(
        (a, b) => a.basePrice - b.basePrice
      );
      const parsedSegments = mapSnapshot(raw.segments, toSegment).sort(
        (a, b) => a.segmentNumber - b.segmentNumber
      );
      const parsedHistory = mapSnapshot(raw.history, toHistoryRecord).sort(
        (a, b) => b.timestamp - a.timestamp
      );

      this.currentState = {
        settings: parsedSettings,
        clubs: parsedClubs,
        players: parsedPlayers,
        segments: parsedSegments,
        history: parsedHistory,
        timestamp: raw.timestamp || Date.now(),
      };

      for (const listener of this.listeners) {
        try {
          listener(this.currentState);
        } catch (err) {
          console.error("Spectator listener error:", err);
        }
      }
    } catch (err) {
      console.warn("Spectator sync fetch error (Vercel Edge):", err);
    } finally {
      this.isFetching = false;
    }
  }

  public getCurrentState(): SpectatorAuctionState | null {
    return this.currentState;
  }
}

export const spectatorSync = new SpectatorSyncManager();

// Convenience subscription helpers
export function subscribeSpectatorSettings(
  callback: (settings: TournamentSettings | null) => void
): () => void {
  return spectatorSync.subscribe((state) => callback(state.settings));
}

export function subscribeSpectatorClubs(
  callback: (clubs: Club[]) => void
): () => void {
  return spectatorSync.subscribe((state) => callback(state.clubs));
}

export function subscribeSpectatorPlayers(
  callback: (players: Player[]) => void
): () => void {
  return spectatorSync.subscribe((state) => callback(state.players));
}

export function subscribeSpectatorSegments(
  callback: (segments: Segment[]) => void
): () => void {
  return spectatorSync.subscribe((state) => callback(state.segments));
}

export function subscribeSpectatorHistory(
  callback: (history: AuctionHistoryRecord[]) => void
): () => void {
  return spectatorSync.subscribe((state) => callback(state.history));
}

export function subscribeSpectatorClub(
  clubId: string,
  callback: (club: Club | null) => void
): () => void {
  return spectatorSync.subscribe((state) => {
    const club = state.clubs.find((c) => c.id === clubId) || null;
    callback(club);
  });
}

