"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  ShieldPlus,
} from "lucide-react";
import {
  subscribeClubs,
  subscribePlayers,
  subscribeSettings,
  createClub,
  updateClub,
  deleteClub,
} from "@/lib/firebase";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { ClubLogo } from "@/components/common/club-logo";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ClubFormDialog, type ClubFormValues } from "./club-form-dialog";
import { SquadDialog } from "./squad-dialog";
import { MAX_CLUBS, MIN_CLUBS } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Club, Player, TournamentSettings } from "@/types";

function budgetTone(remaining: number, initial: number) {
  if (initial <= 0) return "bg-zinc-300 dark:bg-zinc-600";
  const ratio = remaining / initial;
  if (ratio > 0.5) return "bg-emerald-500";
  if (ratio > 0.2) return "bg-amber-400";
  return "bg-red-500";
}

/** Clubs Management — add/edit/delete clubs, budgets, logos, squads. Live from Firebase. */
export function ClubsManager() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deletingClub, setDeletingClub] = useState<Club | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [squadClub, setSquadClub] = useState<Club | null>(null);

  useEffect(() => {
    const onError = (error: Error) =>
      setLoadError(`Could not load clubs: ${error.message}`);
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribeClubs(setClubs, onError),
      subscribePlayers(setPlayers, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = settings === undefined || clubs === undefined || players === undefined;

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = clubs ?? [];
    if (!query) return list;
    return list.filter((club) => club.name.toLowerCase().includes(query));
  }, [clubs, search]);

  const totals = useMemo(() => {
    const list = clubs ?? [];
    return {
      count: list.length,
      initial: list.reduce((s, c) => s + c.initialBudget, 0),
      remaining: list.reduce((s, c) => s + c.remainingBudget, 0),
      squads: list.reduce((s, c) => s + c.totalPlayersPurchased, 0),
    };
  }, [clubs]);

  const auctionStatus = settings?.auctionStatus ?? "not_started";
  const auctionLocked = auctionStatus !== "not_started";

  async function handleFormSubmit(values: ClubFormValues) {
    if (editingClub) {
      await updateClub(editingClub.id, {
        name: values.name,
        abbreviation: values.abbreviation ?? "",
        logoUrl: values.logoUrl ?? "",
        initialBudget: values.initialBudget,
      });
      toast.success(`${values.name} updated.`);
    } else {
      if (totals.count >= MAX_CLUBS) {
        toast.warning(
          `Tournament format expects ${MIN_CLUBS}–${MAX_CLUBS} clubs — this is club #${totals.count + 1}.`,
        );
      }
      await createClub({
        name: values.name,
        abbreviation: values.abbreviation,
        logoUrl: values.logoUrl,
        initialBudget: values.initialBudget,
      });
      toast.success(`${values.name} created.`);
    }
  }

  function openEdit(club: Club) {
    setEditingClub(club);
    setFormOpen(true);
  }

  function openCreate() {
    setEditingClub(null);
    setFormOpen(true);
  }

  function deleteBlockReason(club: Club): string | null {
    if (auctionLocked) return "The auction has started — clubs cannot be deleted now.";
    if (club.totalPlayersPurchased > 0)
      return `This club has purchased ${club.totalPlayersPurchased} ${club.totalPlayersPurchased === 1 ? "player" : "players"}. Use the explicit admin reset procedure instead of deleting.`;
    return null;
  }

  async function confirmDelete() {
    if (!deletingClub) return;
    setDeleteBusy(true);
    try {
      await deleteClub(deletingClub.id, auctionStatus);
      toast.success(`${deletingClub.name} deleted.`);
      setDeletingClub(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs Management"
        description={auctionLocked ? "Auction in progress — club edits are restricted." : "Register clubs, set budgets and manage squads."}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-300"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Add club
          </button>
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

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Clubs", value: `${totals.count}`, sub: `format: ${MIN_CLUBS}–${MAX_CLUBS}` },
          { label: "Total budget", value: formatPrice(totals.initial), sub: "across all clubs" },
          { label: "Remaining", value: formatPrice(totals.remaining), sub: `${totals.squads} players sold` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {item.label}
            </p>
            <p className="mt-1 truncate font-mono text-base font-bold text-zinc-800 dark:text-zinc-100 sm:text-xl" title={item.value}>
              {item.value}
            </p>
            <p className="mt-0.5 hidden text-[11px] text-zinc-400 sm:block">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs by name…"
            aria-label="Search clubs"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-white/5" />
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            {search ? (
              <>
                <Search className="size-8 text-zinc-300 dark:text-zinc-600" aria-hidden />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No clubs match “{search}”.
                </p>
              </>
            ) : (
              <>
                <ShieldPlus className="size-10 text-zinc-300 dark:text-zinc-600" aria-hidden />
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                    No clubs yet
                  </h2>
                  <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                    Register the {MIN_CLUBS}–{MAX_CLUBS} participating clubs before the auction.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold uppercase tracking-wider text-zinc-950 hover:bg-amber-300"
                >
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                  Add the first club
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[34%]">Club</TableHead>
                  <TableHead className="text-right">Initial</TableHead>
                  <TableHead className="w-44">Remaining</TableHead>
                  <TableHead className="text-center">Players</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.map((club) => {
                  const ratio =
                    club.initialBudget > 0
                      ? Math.max(0, Math.min(100, (club.remainingBudget / club.initialBudget) * 100))
                      : 0;
                  const blockReason = deleteBlockReason(club);
                  return (
                    <TableRow key={club.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ClubLogo logoUrl={club.logoUrl} name={club.name} abbreviation={club.abbreviation} size={40} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100" title={club.name}>
                              {club.name}
                            </p>
                            <p className="font-mono text-[10px] text-zinc-400">
                              #{club.id.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                        {formatPrice(club.initialBudget)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-mono text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                            {formatPrice(club.remainingBudget)}
                          </span>
                          <div
                            className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10"
                            role="progressbar"
                            aria-valuenow={Math.round(ratio)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${club.name} budget remaining`}
                          >
                            <div
                              className={cn("h-full rounded-full transition-all", budgetTone(club.remainingBudget, club.initialBudget))}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => setSquadClub(club)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-xs font-bold text-zinc-700 transition-colors hover:bg-amber-100 hover:text-amber-800 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-amber-400/15 dark:hover:text-amber-300"
                          title="View squad"
                        >
                          <Users className="size-3.5" aria-hidden />
                          {club.totalPlayersPurchased}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(club)}
                            aria-label={`Edit ${club.name}`}
                            title="Edit club"
                            className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/5 dark:hover:text-zinc-100"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingClub(club)}
                            aria-label={`Delete ${club.name}`}
                            title={blockReason ?? "Delete club"}
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
      </div>

      {/* Add/Edit dialog */}
      <ClubFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingClub(null);
        }}
        club={editingClub}
        onSubmit={handleFormSubmit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletingClub !== null}
        onOpenChange={(open) => !open && setDeletingClub(null)}
        title={`Delete ${deletingClub?.name ?? "club"}?`}
        description="This permanently removes the club record. This action cannot be undone."
        confirmLabel="Delete club"
        destructive
        blockedReason={deletingClub ? deleteBlockReason(deletingClub) : null}
        loading={deleteBusy}
        onConfirm={confirmDelete}
      >
        {deletingClub && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
            <p className="flex items-center justify-between">
              <span>Players purchased</span>
              <strong className="font-mono">{deletingClub.totalPlayersPurchased}</strong>
            </p>
            <p className="mt-1.5 flex items-center justify-between">
              <span>Budget remaining</span>
              <strong className="font-mono">{formatPrice(deletingClub.remainingBudget)}</strong>
            </p>
          </div>
        )}
      </ConfirmDialog>

      {/* Squad dialog */}
      <SquadDialog
        club={squadClub ? (filteredClubs.find((c) => c.id === squadClub.id) ?? squadClub) : null}
        players={players ?? []}
        onOpenChange={(open) => !open && setSquadClub(null)}
      />
    </div>
  );
}
