"use client";

import { useState } from "react";
import { Download, FileUp, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  parsePlayersCsv,
  buildCsvTemplate,
  type CsvParseResult,
} from "@/lib/players-csv";
import { createPlayersBatch } from "@/lib/firebase/players";
import { SEGMENT_COUNT, PLAYERS_PER_SEGMENT, TOTAL_PLAYERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPlayers: Player[];
  onImported: (count: number) => void;
}

type ImportPhase =
  | { step: "idle" }
  | { step: "parsed"; result: CsvParseResult }
  | { step: "importing" };

/** Bulk player import via CSV — validate first, then commit atomically. */
export function CsvImportDialog({
  open,
  onOpenChange,
  existingPlayers,
  onImported,
}: CsvImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <CsvImportForm
            key="csv-form"
            existingPlayers={existingPlayers}
            onImported={onImported}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CsvImportForm({
  existingPlayers,
  onImported,
  onDone,
  onCancel,
}: {
  existingPlayers: Player[];
  onImported: (count: number) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<ImportPhase>({ step: "idle" });
  const [fileName, setFileName] = useState<string>("");
  const [fatalError, setFatalError] = useState<string | null>(null);

  function downloadTemplate() {
    const blob = new Blob([buildCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "players-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setFatalError(null);
    if (file.size > 512 * 1024) {
      setFatalError("File is too large — 50 players should be a few KB. Check the file.");
      return;
    }
    const text = await file.text();
    const result = parsePlayersCsv(text);
    setPhase({ step: "parsed", result });
  }

  const result = phase.step === "parsed" ? phase.result : null;
  const errorCount = result?.errors.length ?? 0;
  const validCount = result?.rows.length ?? 0;

  // Hypothetical segment counts after this import (warnings only)
  const segmentWarnings = (() => {
    if (!result) return [];
    const counts = new Map<number, number>();
    for (const player of existingPlayers) {
      counts.set(player.segment, (counts.get(player.segment) ?? 0) + 1);
    }
    for (const row of result.rows) {
      counts.set(row.segment, (counts.get(row.segment) ?? 0) + 1);
    }
    const warnings: string[] = [];
    for (let n = 1; n <= SEGMENT_COUNT; n += 1) {
      const count = counts.get(n) ?? 0;
      if (count > PLAYERS_PER_SEGMENT) {
        warnings.push(`Segment ${n} would have ${count} players (max ${PLAYERS_PER_SEGMENT}).`);
      }
    }
    const total = (existingPlayers.length ?? 0) + result.rows.length;
    if (total > TOTAL_PLAYERS) {
      warnings.push(`Tournament would have ${total} players (expected ${TOTAL_PLAYERS}).`);
    }
    return warnings;
  })();

  async function handleImport() {
    if (!result || result.rows.length === 0 || result.errors.length > 0) return;
    setPhase({ step: "importing" });
    try {
      const ids = await createPlayersBatch(result.rows);
      onImported(ids.length);
      onDone();
    } catch (error) {
      setFatalError(
        error instanceof Error ? error.message : "Import failed. No players were saved.",
      );
      setPhase({ step: "parsed", result });
    }
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>Import players from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">name,basePrice,segment,department,academicYear,category,photoUrl</code>.
            Only name, basePrice and segment are required. Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        {/* Template + instructions */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            New to the format? Start from the template.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-white/15 dark:text-zinc-200 dark:hover:text-amber-300"
          >
            <Download className="size-3.5" aria-hidden />
            Template
          </button>
        </div>

        {/* File input */}
        <label
          htmlFor="players-csv"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-8 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:border-white/15 dark:hover:border-amber-400/60 dark:hover:bg-amber-400/5"
        >
          <FileUp className="size-7 text-zinc-400" aria-hidden />
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {fileName || "Choose a CSV file"}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            .csv · max 512 KB · one row per player
          </span>
          <input
            id="players-csv"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>

        {fatalError && (
          <p role="alert" className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
            {fatalError}
          </p>
        )}

        {/* Validation report */}
        {result && (
          <div className="space-y-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                errorCount > 0
                  ? "border-red-300/60 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
                  : "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
              )}
            >
              {errorCount > 0 ? (
                <>
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {errorCount} problem{errorCount === 1 ? "" : "s"} found across {result.totalDataRows} row{result.totalDataRows === 1 ? "" : "s"} — fix the file and re-upload.
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  {validCount} valid player{validCount === 1 ? "" : "s"} ready to import.
                </>
              )}
            </div>

            {result.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 font-mono text-[11px] dark:border-white/10">
                {result.errors.slice(0, 50).map((error, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="shrink-0 font-bold text-red-500">
                      {error.row === 0 ? "file" : `row ${error.row}`}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {error.column ? <strong>{error.column}: </strong> : null}
                      {error.message}
                    </span>
                  </li>
                ))}
                {result.errors.length > 50 && (
                  <li className="text-zinc-400">…and {result.errors.length - 50} more</li>
                )}
              </ul>
            )}

            {result.warnings.map((warning, i) => (
              <p
                key={i}
                className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
              >
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {warning}
              </p>
            ))}
            {segmentWarnings.map((warning, i) => (
              <p
                key={`seg-${i}`}
                className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
              >
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {warning}
              </p>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!result || errorCount > 0 || validCount === 0 || phase.step === "importing"}
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300"
          >
            {phase.step === "importing" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Importing…
              </>
            ) : (
              `Import ${validCount} player${validCount === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
    </>
  );
}
