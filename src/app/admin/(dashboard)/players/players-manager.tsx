"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Upload,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import {
  subscribePlayers,
  subscribeSettings,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "@/lib/firebase";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { PlayerPhoto } from "@/components/common/player-photo";
import { PlayerStatusBadge } from "@/components/common/player-status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PlayerFormDialog, type PlayerFormValues } from "./player-form-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { SEGMENT_COUNT, PLAYERS_PER_SEGMENT, TOTAL_PLAYERS } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Player, PlayerStatus, TournamentSettings } from "@/types";

type SegmentFilter = "all" | number;
type StatusFilter = "all" | PlayerStatus;

/** Players Management — add/edit/delete, CSV import, segment counters, live. */
export function PlayersManager() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  useEffect(() => {
    const onError = (error: Error) =>
      setLoadError(`Could not load players: ${error.message}`);
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribePlayers(setPlayers, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = settings === undefined || players === undefined;
  const auctionStatus = settings?.auctionStatus ?? "not_started";
  const auctionLocked = auctionStatus !== "not_started";

  const segmentCounts = useMemo(() => {
    const counts = Array.from({ length: SEGMENT_COUNT }, () => 0);
    for (const p of players ?? []) {
      if (p.segment >= 1 && p.segment <= SEGMENT_COUNT) counts[p.segment - 1] += 1;
    }
    return counts;
  }, [players]);

  const segmentsFull = segmentCounts.filter((c) => c === PLAYERS_PER_SEGMENT).length;
  const allFull = segmentsFull === SEGMENT_COUNT;
  const totalBaseValue = useMemo(
    () => (players ?? []).reduce((s, p) => s + p.basePrice, 0),
    [players],
  );

  const filtered = useMemo(() => {
    const list = players ?? [];
    const query = search.trim().toLowerCase();
    return list.filter((p) => {
      if (segmentFilter !== "all" && p.segment !== segmentFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!query) return true;
      return [p.name, p.department ?? "", p.academicYear ?? "", p.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [players, search, segmentFilter, statusFilter]);

  async function handleFormSubmit(values: PlayerFormValues) {
    if (!settings) {
      throw new Error("Settings not loaded — refresh and try again.");
    }
    if (editingPlayer) {
      await updatePlayer(
        editingPlayer.id,
        {
          name: values.name,
          department: values.department,
          academicYear: values.academicYear,
          category: values.category,
          basePrice: values.basePrice,
          segment: values.segment,
          photoUrl: values.photoUrl ?? "",
        },
        settings,
        { allowCorrection: values.correction },
      );
      toast.success(
        values.correction && auctionLocked
          ? `${values.name} corrected — changes are live on the public display.`
          : `${values.name} updated.`,
      );
    } else {
      await createPlayer({
        name: values.name,
        department: values.department,
        academicYear: values.academicYear,
        category: values.category,
        basePrice: values.basePrice,
        segment: values.segment,
        photoUrl: values.photoUrl,
      });
      toast.success(`${values.name} added to segment ${values.segment}.`);
    }
  }

  function deleteBlockReason(player: Player): string | null {
    if (auctionLocked) return "The auction has started — players cannot be deleted now.";
    if (player.status === "sold") return "A sold player cannot be deleted.";
    return null;
  }

  async function confirmDelete() {
    if (!deletingPlayer) return;
    setDeleteBusy(true);
    try {
      await deletePlayer(deletingPlayer.id, auctionStatus);
      toast.success(`${deletingPlayer.name} deleted.`);
      setDeletingPlayer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Players Management"
        description={
          auctionLocked
            ? "Auction in progress — price and segment are locked (correction mode available in edit)."
            : "Register all 50 players, assign segments and set base prices."
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCsvOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-4 text-xs font-bold uppercase tracking-wider text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 dark:border-white/15 dark:text-zinc-200 dark:hover:text-amber-300"
            >
              <Upload className="size-4" aria-hidden />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPlayer(null);
                setFormOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300"
            >
              <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              <span className="hidden sm:inline">Add player</span>
            </button>
          </div>
        }
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          {loadError}
        </div>
      )}

      {/* Readiness banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
          allFull
            ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
            : "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
        )}
      >
        {allFull ? (
          <>
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            All {SEGMENT_COUNT} segments have exactly {PLAYERS_PER_SEGMENT} players — {TOTAL_PLAYERS}/{TOTAL_PLAYERS}. Auction ready.
          </>
        ) : (
          <>
            <ListChecks className="size-5 shrink-0" aria-hidden />
            {segmentsFull}/{SEGMENT_COUNT} segments at {PLAYERS_PER_SEGMENT} players ·{" "}
            {players?.length ?? 0}/{TOTAL_PLAYERS} total · base value {formatPrice(totalBaseValue)}
          </>
        )}
      </div>

      {/* Segment counters (click to filter) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <button
          type="button"
          onClick={() => setSegmentFilter("all")}
          aria-pressed={segmentFilter === "all"}
          className={cn(
            "rounded-lg border px-2 py-2.5 text-center transition-all",
            segmentFilter === "all"
              ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/50 dark:border-amber-400/60 dark:bg-amber-400/10"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.03]",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            All
          </p>
          <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-zinc-800 dark:text-zinc-100">
            {players?.length ?? 0}
          </p>
        </button>
        {segmentCounts.map((count, i) => {
          const n = i + 1;
          const active = segmentFilter === n;
          const tone =
            count === PLAYERS_PER_SEGMENT
              ? "border-emerald-300 dark:border-emerald-400/40"
              : count > PLAYERS_PER_SEGMENT
                ? "border-red-400 dark:border-red-400/50"
                : "border-zinc-200 dark:border-white/10";
          return (
            <button
              key={n}
              type="button"
              onClick={() => setSegmentFilter(active ? "all" : n)}
              aria-pressed={active}
              className={cn(
                "rounded-lg border bg-white px-2 py-2.5 text-center transition-all hover:border-amber-300 dark:bg-white/[0.03]",
                tone,
                active &&
                  "border-amber-400 bg-amber-50 ring-2 ring-amber-400/50 dark:border-amber-400/60 dark:bg-amber-400/10",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Seg {n}
              </p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-lg font-black tabular-nums",
                  count === PLAYERS_PER_SEGMENT
                    ? "text-emerald-600 dark:text-emerald-400"
                    : count > PLAYERS_PER_SEGMENT
                      ? "text-red-500"
                      : "text-zinc-800 dark:text-zinc-100",
                )}
              >
                {count}
                <span className="text-xs font-semibold text-zinc-400">/{PLAYERS_PER_SEGMENT}</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, department, year or category…"
            aria-label="Search players"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
        >
          <option value="all">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="current">On the block</option>
          <option value="sold">Sold</option>
          <option value="unsold">Unsold</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Users className="size-8 text-zinc-300 dark:text-zinc-600" aria-hidden />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {search || statusFilter !== "all" || segmentFilter !== "all"
                ? "No players match this filter."
                : "No players yet — add them individually or import a CSV."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Player</TableHead>
                  <TableHead>Department / Year</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Segment</TableHead>
                  <TableHead className="text-right">Base price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((player) => {
                  const blockReason = deleteBlockReason(player);
                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PlayerPhoto photoUrl={player.photoUrl} name={player.name} size={38} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100" title={player.name}>
                              {player.name}
                            </p>
                            {player.status === "sold" && player.finalPrice !== null && (
                              <p className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                SOLD · {formatPrice(player.finalPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                        {player.department ?? "—"}
                        {player.academicYear && (
                          <span className="text-zinc-400"> · {player.academicYear}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                        {player.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex size-7 items-center justify-center rounded-md bg-zinc-100 font-mono text-xs font-bold text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
                          {player.segment}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                        {formatPrice(player.basePrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <PlayerStatusBadge status={player.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlayer(player);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${player.name}`}
                            title="Edit player"
                            className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/5 dark:hover:text-zinc-100"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPlayer(player)}
                            aria-label={`Delete ${player.name}`}
                            title={blockReason ?? "Delete player"}
                            className={cn(
                              "rounded-md p-2 transition-colors",
                              blockReason
                                ? "cursor-not-allowed text-zinc-200 dark:text-zinc-700"
                                : "text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-400",
                            )}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <p className="border-t border-zinc-100 px-4 py-2 text-right text-[11px] text-zinc-400 dark:border-white/5">
            Showing {filtered.length} of {players?.length ?? 0} players
          </p>
        )}
      </div>

      {/* Dialogs */}
      <PlayerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPlayer(null);
        }}
        player={editingPlayer}
        settings={settings ?? null}
        onSubmit={handleFormSubmit}
      />
      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        existingPlayers={players ?? []}
        onImported={(count) => toast.success(`Imported ${count} players.`)}
      />
      <ConfirmDialog
        open={deletingPlayer !== null}
        onOpenChange={(open) => !open && setDeletingPlayer(null)}
        title={`Delete ${deletingPlayer?.name ?? "player"}?`}
        description="This permanently removes the player record. This action cannot be undone."
        confirmLabel="Delete player"
        destructive
        blockedReason={deletingPlayer ? deleteBlockReason(deletingPlayer) : null}
        loading={deleteBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
