/**
 * Statistics for the final report — computed from raw Firebase records
 * (players + clubs), never from separately maintained counters.
 * Pure functions: testable without Firebase.
 */
import type { Club, Player } from "@/types";

export interface ClubStat {
  club: Club;
  playersBought: number;
  spent: number;
  remaining: number;
  avgPrice: number;
  /** Share of this club's initial budget that has been spent (0..100). */
  spentPct: number;
}

export interface AuctionStats {
  totalPlayers: number;
  sold: number;
  unsold: number;
  remaining: number;
  totalSalesValue: number;
  averageSale: number;
  highestSale: { player: Player; clubName: string } | null;
  lowestSale: { player: Player; clubName: string } | null;
  /** Most expensive purchases, descending, at most `limit` entries. */
  mostExpensive: Array<{ player: Player; clubName: string }>;
  /** Cheapest purchases, ascending, at most `limit` entries. */
  cheapest: Array<{ player: Player; clubName: string }>;
  clubStats: ClubStat[];
  /** Largest spender first. */
  mostSpent: ClubStat | null;
  /** Club holding the most players. */
  mostPlayers: ClubStat | null;
}

const clubNameOf = (clubs: Club[], id: string | null): string =>
  clubs.find((c) => c.id === id)?.name ?? "—";

/** Compute every public-facing statistic from players and clubs. */
export function computeAuctionStats(
  players: Player[],
  clubs: Club[],
  limit = 8,
): AuctionStats {
  const sold = players.filter((p) => p.status === "sold" && p.finalPrice !== null);
  const unsoldCount = players.filter((p) => p.status === "unsold").length;
  const totalSalesValue = sold.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0);

  const withClub = sold.map((player) => ({
    player,
    clubName: clubNameOf(clubs, player.purchasedByClubId),
  }));
  const byPriceDesc = [...withClub].sort(
    (a, b) => (b.player.finalPrice ?? 0) - (a.player.finalPrice ?? 0),
  );

  const clubStats: ClubStat[] = clubs
    .map((club) => {
      const squad = sold.filter((p) => p.purchasedByClubId === club.id);
      const spent = squad.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0);
      return {
        club,
        playersBought: squad.length,
        spent,
        remaining: club.remainingBudget,
        avgPrice: squad.length > 0 ? Math.round(spent / squad.length) : 0,
        spentPct: club.initialBudget > 0
          ? Math.min(100, Math.max(0, (spent / club.initialBudget) * 100))
          : 0,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return {
    totalPlayers: players.length,
    sold: sold.length,
    unsold: unsoldCount,
    remaining: players.length - sold.length - unsoldCount,
    totalSalesValue,
    averageSale: sold.length > 0 ? Math.round(totalSalesValue / sold.length) : 0,
    highestSale: byPriceDesc[0] ?? null,
    lowestSale: byPriceDesc.length > 0 ? byPriceDesc[byPriceDesc.length - 1] : null,
    mostExpensive: byPriceDesc.slice(0, limit),
    cheapest: [...byPriceDesc].reverse().slice(0, limit),
    clubStats,
    mostSpent: clubStats[0] ?? null,
    mostPlayers: clubStats.length > 0
      ? [...clubStats].sort((a, b) => b.playersBought - a.playersBought)[0]
      : null,
  };
}

/** Total spent per segment — useful for a sales-by-segment breakdown. */
export function salesBySegment(
  players: Player[],
  segments: number,
): Array<{ segment: number; sold: number; unsold: number; salesValue: number }> {
  return Array.from({ length: segments }, (_, i) => {
    const n = i + 1;
    const inSegment = players.filter((p) => p.segment === n);
    const sold = inSegment.filter((p) => p.status === "sold");
    return {
      segment: n,
      sold: sold.length,
      unsold: inSegment.filter((p) => p.status === "unsold").length,
      salesValue: sold.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0),
    };
  });
}

export interface SegmentTopBuy {
  segment: number;
  player: Player | null;
  club: Club | null;
  totalSalesValue: number;
  soldCount: number;
}

/** Top player purchase and summary for each segment. */
export function topBuyPerSegment(
  players: Player[],
  clubs: Club[],
  segments: number,
): SegmentTopBuy[] {
  return Array.from({ length: segments }, (_, i) => {
    const segmentNumber = i + 1;
    const inSegment = players.filter((p) => p.segment === segmentNumber);
    const sold = inSegment.filter((p) => p.status === "sold" && p.finalPrice !== null);
    const topPlayer =
      sold.length > 0
        ? [...sold].sort((a, b) => (b.finalPrice ?? 0) - (a.finalPrice ?? 0))[0]
        : null;
    const club = topPlayer
      ? clubs.find((c) => c.id === topPlayer.purchasedByClubId) ?? null
      : null;

    return {
      segment: segmentNumber,
      player: topPlayer,
      club,
      totalSalesValue: sold.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0),
      soldCount: sold.length,
    };
  });
}
