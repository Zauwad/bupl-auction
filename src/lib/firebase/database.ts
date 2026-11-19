/**
 * Low-level Realtime Database plumbing.
 * Entity CRUD lives in the service modules (settings.ts, clubs.ts, players.ts,
 * segments.ts, history.ts, purchase.ts) — this file only builds refs and
 * attaches listeners.
 */
import {
  ref,
  onValue,
  push,
  update,
  get,
  set,
  remove,
  type DatabaseReference,
  type DataSnapshot,
  type Unsubscribe,
} from "firebase/database";
import { getFirebaseDatabase } from "./config";
import { DB_PATHS } from "@/lib/constants";

/** Typed references to each root path (and known children). */
export const dbRefs = {
  settings: (): DatabaseReference =>
    ref(getFirebaseDatabase(), DB_PATHS.settings),
  clubs: (): DatabaseReference =>
    ref(getFirebaseDatabase(), DB_PATHS.clubs),
  club: (clubId: string): DatabaseReference =>
    ref(getFirebaseDatabase(), `${DB_PATHS.clubs}/${clubId}`),
  players: (): DatabaseReference =>
    ref(getFirebaseDatabase(), DB_PATHS.players),
  player: (playerId: string): DatabaseReference =>
    ref(getFirebaseDatabase(), `${DB_PATHS.players}/${playerId}`),
  segments: (): DatabaseReference =>
    ref(getFirebaseDatabase(), DB_PATHS.segments),
  segment: (segmentNumber: number): DatabaseReference =>
    ref(getFirebaseDatabase(), `${DB_PATHS.segments}/segment-${segmentNumber}`),
  history: (): DatabaseReference =>
    ref(getFirebaseDatabase(), DB_PATHS.history),
  historyEntry: (historyId: string): DatabaseReference =>
    ref(getFirebaseDatabase(), `${DB_PATHS.history}/${historyId}`),
} as const;

/** Root reference — used for atomic multi-path updates spanning several nodes. */
export function rootRef(): DatabaseReference {
  return ref(getFirebaseDatabase());
}

export function newPushId(path: "clubs" | "players" | "history"): string {
  return push(ref(getFirebaseDatabase(), DB_PATHS[path])).key as string;
}

/**
 * Subscribe to a reference with onValue. Always returns the unsubscribe
 * function — call it in the effect cleanup to avoid leaking listeners.
 */
export function subscribeToValue(
  reference: DatabaseReference,
  callback: (snapshot: DataSnapshot) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onValue(reference, callback, (error) => {
    if (onError) onError(error);
    else console.error("Firebase listener error:", error);
  });
}

export { get, update, set, remove, ref, push };
