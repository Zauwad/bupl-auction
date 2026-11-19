"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Users,
  BadgeCheck,
  Gavel,
  Wallet,
  ListOrdered,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Database,
  Loader2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import {
  subscribeClubs,
  subscribePlayers,
  subscribeSegments,
  subscribeHistory,
  subscribeSettings,
  ensureTournamentDefaults,
} from "@/lib/firebase";
import { formatPrice, formatTimestamp } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { AuctionStatusBadge } from "@/components/common/auction-status-badge";
import { Progress } from "@/components/ui/progress";
import { TOTAL_PLAYERS, SEGMENT_COUNT, PLAYERS_PER_SEGMENT, MIN_CLUBS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  AuctionHistoryRecord,
  Club,
  Player,
  Segment,
  TournamentSettings,
} from "@/types";

interface SegmentStat {
  segmentNumber: number;
  assigned: number;
  sold: number;
  unsold: number;
  resolved: number;
  isOrderConfirmed: boolean;
  isCompleted: boolean;
}

/** Live dashboard — every figure below is derived from RTDB in real time. */
export function OverviewDashboard() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[] | undefined>(undefined);
  const [history, setHistory] = useState<AuctionHistoryRecord[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const onError = (error: Error) =>
      setLoadError(
        error.message.includes("permission")
          ? "Permission denied — deploy database.rules.json to your Firebase project."
          : `Could not load live data: ${error.message}`,
      );
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribeClubs(setClubs, onError),
      subscribePlayers(setPlayers, onError),
      subscribeSegments(setSegments, onError),
      subscribeHistory(setHistory, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading =
    settings === undefined ||
    clubs === undefined ||
    players === undefined ||
    segments === undefined ||
    history === undefined;

  const stats = useMemo(() => {
    const p = players ?? [];
    const c = clubs ?? [];
    const sold = p.filter((x) => x.status === "sold").length;
    const unsold = p.filter((x) => x.status === "unsold").length;
    const totalBudget = c.reduce((sum, club) => sum + club.initialBudget, 0);
    const remainingBudget = c.reduce((sum, club) => sum + club.remainingBudget, 0);

    const segmentStats: SegmentStat[] = Array.from(
      { length: SEGMENT_COUNT },
      (_, i) => {
        const n = i + 1;
        const inSegment = p.filter((x) => x.segment === n);
        const seg = (segments ?? []).find((s) => s.segmentNumber === n);
        const segSold = inSegment.filter((x) => x.status === "sold").length;
        const segUnsold = inSegment.filter((x) => x.status === "unsold").length;
        return {
          segmentNumber: n,
          assigned: inSegment.length,
          sold: segSold,
          unsold: segUnsold,
          resolved: segSold + segUnsold,
          isOrderConfirmed: seg?.isOrderConfirmed ?? false,
          isCompleted: seg?.isCompleted ?? false,
        };
      },
    );

    return {
      sold,
      unsold,
      remaining: p.length - sold - unsold,
      totalBudget,
      remainingBudget,
      segmentStats,
      confirmedOrders: segmentStats.filter((s) => s.isOrderConfirmed).length,
      segmentsWithFullSquads: segmentStats.filter((s) => s.assigned === PLAYERS_PER_SEGMENT).length,
    };
  }, [players, clubs, segments]);

  async function handleInitialize() {
    setInitializing(true);
    try {
      const result = await ensureTournamentDefaults();
      toast.success(
        result.settingsCreated
          ? `Database initialized — created settings${result.segmentsCreated ? ` + ${result.segmentsCreated} segments` : ""}.`
          : "Database already initialized.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize the database.",
      );
    } finally {
      setInitializing(false);
    }
  }

  // ---------- Loading / error states ----------
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="Live snapshot of the auction." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const checklist = [
    { label: "Database initialized", done: settings !== null },
    { label: `At least ${MIN_CLUBS} clubs registered`, done: (clubs ?? []).length >= MIN_CLUBS, hint: `${clubs?.length ?? 0}/${MIN_CLUBS}` },
    { label: `${TOTAL_PLAYERS} players imported`, done: (players ?? []).length === TOTAL_PLAYERS, hint: `${players?.length ?? 0}/${TOTAL_PLAYERS}` },
    { label: `Each of the ${SEGMENT_COUNT} segments has exactly ${PLAYERS_PER_SEGMENT} players`, done: stats.segmentsWithFullSquads === SEGMENT_COUNT, hint: `${stats.segmentsWithFullSquads}/${SEGMENT_COUNT}` },
    { label: "Randomized order confirmed for all segments", done: stats.confirmedOrders === SEGMENT_COUNT, hint: `${stats.confirmedOrders}/${SEGMENT_COUNT}` },
  ];
  const readyCount = checklist.filter((item) => item.done).length;
  const auctionReady = readyCount === checklist.length;

  const currentSegment = settings?.currentSegment ?? 1;
  const currentSegmentStat = stats.segmentStats.find(
    (s) => s.segmentNumber === currentSegment,
  );
  const currentProgress =
    currentSegmentStat && currentSegmentStat.assigned > 0
      ? Math.round((currentSegmentStat.resolved / currentSegmentStat.assigned) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={
          settings?.tournamentName
            ? `${settings.tournamentName} — live snapshot`
            : "Live snapshot of the auction"
        }
        actions={settings ? <AuctionStatusBadge status={settings.auctionStatus} /> : undefined}
      />

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {loadError}
        </div>
      )}

      {settings === null ? (
        <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-white/15">
          <Database className="size-10 text-amber-500" aria-hidden />
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              Database not initialized
            </h2>
            <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              Creates the settings singleton and the five empty segment records in your
              Firebase project. Safe to run once — it never overwrites existing data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInitialize}
            disabled={initializing}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-amber-400 px-6 text-sm font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {initializing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Initializing…
              </>
            ) : (
              "Initialize database"
            )}
          </button>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Clubs" value={clubs?.length ?? 0} icon={Shield} />
            <StatCard label="Players" value={players?.length ?? 0} icon={Users} />
            <StatCard
              label="Sold"
              value={stats.sold}
              subtext={`${stats.remaining} remaining`}
              icon={BadgeCheck}
              tone="green"
            />
            <StatCard label="Unsold" value={stats.unsold} icon={Gavel} tone="red" />
            <StatCard
              label="Budget left"
              value={formatPrice(stats.remainingBudget)}
              subtext={`of ${formatPrice(stats.totalBudget)} total`}
              icon={Wallet}
              tone="amber"
            />
            <StatCard
              label="Segment"
              value={`${currentSegment}/${SEGMENT_COUNT}`}
              subtext={settings?.auctionStatus === "not_started" ? "Awaiting start" : "Current segment"}
              icon={ListOrdered}
              tone="blue"
            />
          </div>

          {/* Segment progress + readiness */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Current segment focus */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] lg:col-span-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Segment progress
                  </p>
                  <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-zinc-800 dark:text-zinc-100">
                    <Trophy className="size-5 text-amber-500" aria-hidden />
                    Segment {currentSegment} of {SEGMENT_COUNT}
                  </h2>
                </div>
                <p className="text-2xl font-black tabular-nums text-zinc-800 dark:text-zinc-100">
                  {currentSegmentStat?.resolved ?? 0}
                  <span className="text-zinc-400 dark:text-zinc-500">
                    /{currentSegmentStat?.assigned ?? PLAYERS_PER_SEGMENT}
                  </span>
                </p>
              </div>
              <Progress
                value={currentProgress}
                className="mt-4 h-2.5"
                aria-label={`Segment ${currentSegment} completion`}
              />
              <div className="mt-5 grid grid-cols-5 gap-2">
                {stats.segmentStats.map((s) => {
                  const isCurrent = s.segmentNumber === currentSegment;
                  return (
                    <div
                      key={s.segmentNumber}
                      className={cn(
                        "rounded-lg border px-2 py-3 text-center transition-colors",
                        s.isCompleted
                          ? "border-emerald-300/70 bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-400/10"
                          : isCurrent
                            ? "border-amber-400/70 bg-amber-50 ring-1 ring-amber-400/60 dark:border-amber-400/40 dark:bg-amber-400/10"
                            : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.02]",
                      )}
                      title={`Segment ${s.segmentNumber}: ${s.sold} sold, ${s.unsold} unsold, ${s.assigned - s.resolved} remaining`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        Seg {s.segmentNumber}
                      </p>
                      <p className="mt-1 text-lg font-black tabular-nums text-zinc-800 dark:text-zinc-100">
                        {s.resolved}
                        <span className="text-xs font-semibold text-zinc-400">/{s.assigned || PLAYERS_PER_SEGMENT}</span>
                      </p>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {s.isCompleted ? "Done" : s.isOrderConfirmed ? "Order ✓" : "Pending"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pre-flight checklist / ready state */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Pre-flight checklist
              </p>
              <h2 className="mt-1 text-lg font-bold text-zinc-800 dark:text-zinc-100">
                {auctionReady ? "Auction ready 🎉" : `${readyCount}/${checklist.length} complete`}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2.5 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-emerald-500" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 size-4.5 shrink-0 text-zinc-300 dark:text-zinc-600" aria-hidden />
                    )}
                    <span
                      className={cn(
                        "text-zinc-600 dark:text-zinc-300",
                        item.done && "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500",
                      )}
                    >
                      {item.label}
                      {item.hint && (
                        <span className="ml-1.5 font-mono text-xs text-zinc-400">
                          ({item.hint})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent results */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-300">
                Recent results
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Live from Firebase
              </span>
            </div>
            {(history ?? []).length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No results recorded yet — the ledger will fill in during the auction.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-white/5">
                {(history ?? []).slice(0, 6).map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-4 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {record.playerName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {record.action === "sold" ? `Sold to ${record.clubName}` : "Unsold"}
                        {" · "}Segment {record.segment}
                        {" · "}
                        {formatTimestamp(record.timestamp)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm font-bold tabular-nums",
                        record.action === "sold"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400",
                      )}
                    >
                      {record.action === "sold" ? formatPrice(record.finalPrice) : "UNSOLD"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
