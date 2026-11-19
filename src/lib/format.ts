import { CURRENCY_SYMBOL } from "@/lib/constants";

/** Format a price for display, e.g. 25000 -> "৳25,000". */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-IN")}`;
}

/** Format a Firebase millisecond timestamp for display. */
export function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
