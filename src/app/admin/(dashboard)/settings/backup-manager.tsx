"use client";

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  FileJson,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  exportTournamentSnapshot,
  restoreTournamentSnapshot,
  type TournamentBackupSnapshot,
} from "@/lib/firebase";
import { formatTimestamp } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function BackupManager() {
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [parsedBackup, setParsedBackup] = useState<TournamentBackupSnapshot | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const snapshot = await exportTournamentSnapshot();
      const jsonStr = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const fileName = `bupl-tournament-backup-${timestamp}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `Backup downloaded (${snapshot.stats.totalPlayers} players, ${snapshot.stats.totalClubs} clubs, ${snapshot.stats.historyRecords} history entries).`,
      );
    } catch (err) {
      console.error("Failed to export tournament backup:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate tournament backup.",
      );
    } finally {
      setExporting(false);
    }
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as TournamentBackupSnapshot;

        if (!parsed || parsed.schemaVersion !== 1 || !parsed.data) {
          throw new Error("Invalid BUPL backup file format. Expected schemaVersion 1.");
        }

        setParsedBackup(parsed);
        setRestoreConfirmText("");
        setRestoreOpen(true);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not parse JSON backup file.",
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmRestore() {
    if (!parsedBackup) return;
    setRestoring(true);
    try {
      const summary = await restoreTournamentSnapshot(parsedBackup);
      toast.success(
        `Tournament restored successfully (${summary.playersCount} players, ${summary.clubsCount} clubs, ${summary.historyCount} history logs).`,
      );
      setRestoreOpen(false);
      setParsedBackup(null);
    } catch (err) {
      console.error("Failed to restore tournament snapshot:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to restore tournament state.",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
            <ShieldCheck className="size-4" aria-hidden />
            Disaster Recovery & State Backups
          </h2>
          <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Tournament State Snapshots
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Download a 1-click JSON backup of all tournament records (budgets, rosters, segment orders, and history logs) after each round. If a cloud outage, accidental reset, or quota limit ever occurs, you can restore full tournament state in seconds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <Button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="bg-zinc-900 font-bold text-amber-400 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Exporting snapshot…
              </>
            ) : (
              <>
                <Download className="mr-1.5 size-4" />
                Download Backup (.json)
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            className="border-zinc-300 font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            <Upload className="mr-1.5 size-4" />
            Restore Backup…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <FileJson className="size-5" />
              Restore Tournament State?
            </DialogTitle>
            <DialogDescription>
              You are about to restore this point-in-time tournament snapshot into the live database.
            </DialogDescription>
          </DialogHeader>

          {parsedBackup && (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs dark:border-white/10 dark:bg-white/[0.02]">
                <p className="font-bold text-zinc-800 dark:text-zinc-100">
                  {parsedBackup.tournamentName}
                </p>
                <p className="mt-0.5 text-zinc-500">
                  Exported: {formatTimestamp(new Date(parsedBackup.exportedAt).getTime())}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded border border-zinc-200/80 bg-white p-2 dark:border-white/5 dark:bg-zinc-900/50">
                    <span className="text-zinc-500">Clubs:</span>{" "}
                    <strong>{parsedBackup.stats.totalClubs}</strong>
                  </div>
                  <div className="rounded border border-zinc-200/80 bg-white p-2 dark:border-white/5 dark:bg-zinc-900/50">
                    <span className="text-zinc-500">Players:</span>{" "}
                    <strong>{parsedBackup.stats.totalPlayers}</strong> (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {parsedBackup.stats.soldPlayers} sold
                    </span>
                    )
                  </div>
                  <div className="rounded border border-zinc-200/80 bg-white p-2 dark:border-white/5 dark:bg-zinc-900/50">
                    <span className="text-zinc-500">Unsold:</span>{" "}
                    <strong>{parsedBackup.stats.unsoldPlayers}</strong>
                  </div>
                  <div className="rounded border border-zinc-200/80 bg-white p-2 dark:border-white/5 dark:bg-zinc-900/50">
                    <span className="text-zinc-500">History:</span>{" "}
                    <strong>{parsedBackup.stats.historyRecords}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  This will <strong>overwrite</strong> the current live auction state with this backup file. Type <strong>RESTORE</strong> below to proceed.
                </span>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirm-restore-input"
                  className="text-[10px] font-bold uppercase tracking-wider text-zinc-500"
                >
                  Type &quot;RESTORE&quot; to confirm
                </label>
                <input
                  id="confirm-restore-input"
                  type="text"
                  value={restoreConfirmText}
                  onChange={(e) => setRestoreConfirmText(e.target.value)}
                  placeholder="RESTORE"
                  autoFocus
                  autoComplete="off"
                  className="h-10 w-full rounded-md border border-amber-300 bg-amber-50/50 px-3 font-mono text-sm uppercase tracking-widest outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-400/40 dark:bg-amber-400/5 dark:text-amber-100"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={restoring}
              onClick={() => {
                setRestoreOpen(false);
                setParsedBackup(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={restoreConfirmText.trim().toUpperCase() !== "RESTORE" || restoring}
              onClick={handleConfirmRestore}
              className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {restoring ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Restoring database…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 size-4" />
                  Confirm Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

