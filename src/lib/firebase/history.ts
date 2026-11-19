/**
 * Auction history service — append-only ledger of every finalized result.
 * Records are created exclusively by purchase.ts (recordSale / markUnsold);
 * there is deliberately no update/delete API.
 */
import { subscribeToValue, dbRefs } from "./database";
import { toHistoryRecord, mapSnapshot } from "./converters";
import type { AuctionHistoryRecord } from "@/types";
import type { Unsubscribe } from "firebase/database";

export function subscribeHistory(
  callback: (records: AuctionHistoryRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToValue(
    dbRefs.history(),
    (snapshot) => {
      const records = mapSnapshot(snapshot.val(), toHistoryRecord).sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      callback(records);
    },
    onError,
  );
}
