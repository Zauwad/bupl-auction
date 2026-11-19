"use client";

import { useEffect, useState } from "react";
import {
  Settings2,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  subscribeSettings,
  subscribeClubs,
  subscribePlayers,
  subscribeSegments,
  setTournamentName,
  resetAuction,
} from "@/lib/firebase";
import { PageHeader } from "@/components/common/page-header";
import { AuctionStatusBadge } from "@/components/common/auction-status-badge";
import { segmentDisplayName, SEGMENT_COUNT } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Club, Player, Segment, TournamentSettings } from "@/types";

/** Admin Settings — tournament identity + auction lifecycle controls. */
export function SettingsClient() {
  const [settings, setSettings] = useState<TournamentSettings | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[] | undefined>(undefined);
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  /** null = user hasn't edited yet — render the server-side name instead */
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  useEffect(() => {
    const onError = (error: Error) =>
      setLoadError(`Could not load settings: ${error.message}`);
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribeClubs(setClubs, onError),
      subscribePlayers(setPlayers, onError),
      subscribeSegments(setSegments, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading =
    settings === undefined ||
    clubs === undefined ||
    players === undefined ||
    segments === undefined;

  const nameValue = nameDraft ?? settings?.tournamentName ?? "";
  const nameDirty = nameDraft !== null && nameDraft !== (settings?.tournamentName ?? "");
  const status = settings?.auctionStatus ?? "not_started";
  // Reset is always available — the typed confirmation is the only guard.
  const canReset = true;
  const lifecycleNote =
    status === "live" || status === "paused"
      ? "Auction is live or paused — the reset will discard everything so far."
      : status === "completed"
        ? "Auction is marked complete — the reset will erase every result and reopen it."
        : "Auction has not started — safe to wipe for a clean run.";

  async function handleSaveName() {
    const next = (nameDraft ?? "").trim();
    if (next.length < 2) {
      toast.error("Tournament name must be at least 2 characters.");
      return;
    }
    setSavingName(true);
    try {
      await setTournamentName(next);
      toast.success("Tournament name saved.");
      setNameDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setResetResult(null);
    try {
      const result = await resetAuction();
      if (result.atomic) {
        const summary = `Reset complete — ${result.players} players, ${result.clubs} clubs, ${result.segments} segments`;
        setResetResult(summary);
        toast.success(summary);
      } else if (result.partialFailures.length > 0) {
        const summary = `Partial reset — ${result.partialFailures.length} item(s) blocked by deployed rules: ${result.partialFailures.slice(0, 3).join(", ")}${result.partialFailures.length > 3 ? " …" : ""}. Deploy the latest database.rules.json, then reset again.`;
        setResetResult(summary);
        toast.error("Partial reset — some nodes were blocked by live rules.", { description: summary });
      } else {
        const summary = `Reset complete (multi-step) — ${result.players} players, ${result.clubs} clubs, ${result.segments} segments`;
        setResetResult(summary);
        toast.success(summary);
      }
      setResetOpen(false);
      setResetPhrase("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reset failed.";
      toast.error(message);
      setResetResult(`Reset failed — nothing was changed. (${message})`);
    } finally {
      setResetting(false);
    }
  }

  const confirmedSegments = (segments ?? []).filter((s) => s.isOrderConfirmed).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Tournament identity, live state and the auction lifecycle controls — including the full reset."
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-white/5" />
          <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-white/5" />
        </div>
      ) : (
        <>
          {/* Tournament identity */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                <Settings2 className="size-4" aria-hidden />
                Tournament
              </h2>
              <label htmlFor="tournament-name" className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Tournament name
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="tournament-name"
                  value={nameValue}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={120}
                  className="h-10 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || !nameDirty || nameValue.trim().length < 2}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-xs font-bold uppercase tracking-wider text-amber-400 transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                >
                  {savingName ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </button>
              </div>
              <dl className="mt-5 space-y-3 border-t border-zinc-100 pt-4 text-sm dark:border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Auction status</dt>
                  <dd><AuctionStatusBadge status={status} /></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Segments</dt>
                  <dd className="font-mono text-zinc-700 dark:text-zinc-200">
                    {SEGMENT_COUNT} · current: {segmentDisplayName(settings?.currentSegment ?? 1)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Orders confirmed</dt>
                  <dd className="font-mono text-zinc-700 dark:text-zinc-200">
                    {confirmedSegments}/{SEGMENT_COUNT}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Status, the current segment and order confirmations are managed from the{" "}
                <strong>Live Auction</strong> and <strong>Segments Management</strong> screens.
              </p>
            </div>

            {/* Snapshot */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Live snapshot
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Clubs", value: clubs?.length ?? 0 },
                  { label: "Players", value: players?.length ?? 0 },
                  { label: "Sold", value: (players ?? []).filter((p) => p.status === "sold").length },
                  { label: "Unsold", value: (players ?? []).filter((p) => p.status === "unsold").length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.02]"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      {item.label}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-black tabular-nums text-zinc-800 dark:text-zinc-100">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Figures are read live from Firebase — this is the same data the public display shows.
              </p>
            </div>
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border-2 border-red-300/70 bg-red-50/50 p-6 dark:border-red-400/30 dark:bg-red-400/[0.05]">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-red-600 dark:text-red-400">
              <Trash2 className="size-4" aria-hidden />
              Danger zone
            </h2>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-xl space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Reset the auction</h3>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  Wipes every result and restores the pre-auction defaults:
                </p>
                <ul className="ml-4 list-disc space-y-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <li><strong>Players</strong> → all 50 back to <code>upcoming</code> (names, photos, base prices, student IDs kept)</li>
                  <li><strong>Clubs</strong> → budgets restored to initial, squads and purchase counts cleared (logos & abbreviations kept)</li>
                  <li><strong>Segments</strong> → orders un-confirmed, auction order erased (rosters and names kept)</li>
                  <li><strong>History</strong> → every transaction record deleted</li>
                  <li><strong>Admins</strong> → untouched, however the reset is all-or-nothing — an error leaves nothing half-written</li>
                </ul>
                <p className="flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {lifecycleNote}
                  The whole reset happens in ONE atomic commit — either everything resets, or nothing does.
                </p>
                {resetResult && (
                  <p
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                      resetResult.startsWith("Reset failed")
                        ? "border-red-300/70 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
                        : "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
                    )}
                  >
                    {resetResult.startsWith("Reset failed")
                      ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
                    {resetResult}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                disabled={!canReset}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-5 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-500 dark:hover:bg-red-400"
              >
                <Trash2 className="size-5" aria-hidden />
                Reset auction…
              </button>
            </div>
            {(status === "live" || status === "paused") && (
              <p className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400">
                Auction is {status} — resetting now wipes all in-flight results and reopens the tournament.
              </p>
            )}
          </section>
        </>
      )}

      {/* Reset confirmation — typed to confirm */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-5" aria-hidden />
              Reset the auction?
            </DialogTitle>
            <DialogDescription>
              Every result will be erased and all clubs will get their starting budgets back. Nothing about
              the players or clubs themselves is deleted — this only resets the auction state.
              Type <strong>RESET</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="reset-confirm" className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            Type “RESET”
          </label>
          <input
            id="reset-confirm"
            value={resetPhrase}
            onChange={(e) => setResetPhrase(e.target.value)}
            placeholder="RESET"
            autoFocus
            autoComplete="off"
            className="h-11 w-full rounded-md border border-red-300 bg-red-50/50 px-3 font-mono text-sm uppercase tracking-widest outline-none transition placeholder:text-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-red-400/40 dark:bg-red-400/5 dark:text-red-100"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={resetPhrase.trim().toUpperCase() !== "RESET" || resetting}
              onClick={handleReset}
              className="bg-red-600 text-white hover:bg-red-500 disabled:opacity-40"
            >
              {resetting && <Loader2 className="animate-spin" aria-hidden />}
              Erase and reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
