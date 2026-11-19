/**
 * Clubs service — create/read/update/delete for franchises.
 *
 * Invariants (enforced here AND by database.rules.json):
 *  - budgets are non-negative numbers; remainingBudget never exceeds initialBudget
 *  - a club that has purchased players cannot be deleted (nor before the auction starts)
 *  - remainingBudget only ever decreases via a sale (purchase.ts), never through edits
 */
import {
  get,
  update,
  set,
  remove,
  push,
  subscribeToValue,
  dbRefs,
} from "./database";
import { toClub, mapSnapshot } from "./converters";
import type { Club } from "@/types";
import type { Unsubscribe } from "firebase/database";

export interface ClubInput {
  name: string;
  abbreviation?: string;
  logoUrl?: string;
  initialBudget: number;
}

function validateBudget(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) {
    throw new Error("Budget must be a number between 0 and 100,000,000.");
  }
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    throw new Error("Club name must be between 2 and 80 characters.");
  }
  return trimmed;
}

export function subscribeClubs(
  callback: (clubs: Club[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.clubs(),
    (snapshot) => {
      const clubs = mapSnapshot(snapshot.val(), toClub).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      callback(clubs);
    },
    onError,
  );
}

export function subscribeClub(
  clubId: string,
  callback: (club: Club | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.club(clubId),
    (snapshot) => callback(snapshot.exists() ? toClub(clubId, snapshot.val()) : null),
    onError,
  );
}

export async function getClub(clubId: string): Promise<Club | null> {
  const snapshot = await get(dbRefs.club(clubId));
  return snapshot.exists() ? toClub(clubId, snapshot.val()) : null;
}

export async function createClub(input: ClubInput): Promise<string> {
  const name = validateName(input.name);
  validateBudget(input.initialBudget);
  const now = Date.now();
  const ref = push(dbRefs.clubs());
  const record = {
    name,
    ...(input.abbreviation ? { abbreviation: input.abbreviation.trim().toUpperCase() } : {}),
    ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
    initialBudget: input.initialBudget,
    remainingBudget: input.initialBudget,
    totalPlayersPurchased: 0,
    purchasedPlayerIds: {},
    createdAt: now,
    updatedAt: now,
  };
  await set(ref, record);
  return ref.key as string;
}

export interface ClubPatch {
  name?: string;
  abbreviation?: string;
  logoUrl?: string;
  /**
   * New initial budget. Only honored when the club has not purchased anyone;
   * remainingBudget is shifted by the same delta in that case.
   */
  initialBudget?: number;
}

export async function updateClub(clubId: string, patch: ClubPatch): Promise<void> {
  const existing = await getClub(clubId);
  if (!existing) throw new Error("Club not found.");

  const next: Record<string, unknown> = { updatedAt: Date.now() };

  if (patch.name !== undefined) next.name = validateName(patch.name);
  if (patch.abbreviation !== undefined) {
    const abbr = patch.abbreviation.trim();
    if (abbr.length === 0) {
      next.abbreviation = null; // delete
    } else if (abbr.length > 12) {
      throw new Error("Abbreviation must be at most 12 characters.");
    } else {
      next.abbreviation = abbr.toUpperCase();
    }
  }
  if (patch.logoUrl !== undefined) {
    if (patch.logoUrl.trim().length === 0) {
      // Explicit empty string clears the logo (RTDB removes empty-string convention:
      // we store a real deletion instead).
      next.logoUrl = null;
    } else {
      next.logoUrl = patch.logoUrl.trim();
    }
  }

  if (patch.initialBudget !== undefined) {
    validateBudget(patch.initialBudget);
    if (existing.totalPlayersPurchased === 0) {
      const delta = patch.initialBudget - existing.initialBudget;
      next.initialBudget = patch.initialBudget;
      next.remainingBudget = Math.max(0, existing.remainingBudget + delta);
    } else {
      throw new Error(
        "Cannot change the initial budget after a club has purchased players. " +
          "Reset the auction data first.",
      );
    }
  }

  await update(dbRefs.club(clubId), next);
}

/**
 * Delete a club. Refused (here and by rules) unless the auction has not
 * started and the club has not purchased any players. Fixing that requires
 * the explicit reset procedure, not a delete.
 */
export async function deleteClub(
  clubId: string,
  auctionStatus: string,
): Promise<void> {
  if (auctionStatus !== "not_started") {
    throw new Error("Clubs can only be deleted before the auction starts.");
  }
  const existing = await getClub(clubId);
  if (!existing) return; // already gone — treat as success (idempotent)
  if (existing.totalPlayersPurchased > 0) {
    throw new Error(
      "This club has purchased players. Reset the auction data through the explicit admin reset procedure instead of deleting it.",
    );
  }
  await remove(dbRefs.club(clubId));
}
