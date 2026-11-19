"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePicker } from "@/components/common/image-picker";
import { PlayerPhoto } from "@/components/common/player-photo";
import { PLAYER_IMAGES } from "@/lib/images";
import { CURRENCY_SYMBOL, SEGMENT_COUNT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Player, TournamentSettings } from "@/types";

export interface PlayerFormValues {
  name: string;
  department?: string;
  academicYear?: string;
  category?: string;
  basePrice: number;
  segment: number;
  photoUrl?: string;
  /** True when the admin explicitly unlocked correction mode mid-auction. */
  correction: boolean;
}

interface PlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player | null;
  settings: TournamentSettings | null;
  onSubmit: (values: PlayerFormValues) => Promise<void>;
}

/** Add/edit player dialog. Correction mode unlocks price/segment post-start. */
export function PlayerFormDialog({
  open,
  onOpenChange,
  player,
  settings,
  onSubmit,
}: PlayerFormDialogProps) {
  const isEdit = Boolean(player);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit player" : "Add player"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes sync to Firebase instantly."
              : `Assign a base price and a segment (1–${SEGMENT_COUNT}). You can edit everything before the auction starts.`}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PlayerForm
            key={player?.id ?? "new"}
            player={player ?? null}
            settings={settings}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlayerForm({
  player,
  settings,
  onSubmit,
  onCancel,
  onDone,
}: {
  player: Player | null;
  settings: TournamentSettings | null;
  onSubmit: (values: PlayerFormValues) => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const isEdit = player !== null;
  const lifecycleLocked = (settings?.auctionStatus ?? "not_started") !== "not_started";
  const playerSold = player?.status === "sold";
  const hardLocked = playerSold; // sold player: nothing editable here

  const [correction, setCorrection] = useState(false);
  const [name, setName] = useState(player?.name ?? "");
  const [department, setDepartment] = useState(player?.department ?? "");
  const [academicYear, setAcademicYear] = useState(player?.academicYear ?? "");
  const [category, setCategory] = useState(player?.category ?? "");
  const [basePrice, setBasePrice] = useState(player ? String(player.basePrice) : "");
  const [segment, setSegment] = useState<number>(player?.segment ?? 1);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(player?.photoUrl ?? undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const priceSegmentLocked = hardLocked || (lifecycleLocked && !correction);

  function validate(): PlayerFormValues | null {
    const next: Record<string, string> = {};
    const trimmed = name.trim();
    if (trimmed.length < 2) next.name = "Name must be at least 2 characters.";
    else if (trimmed.length > 120) next.name = "Name must be at most 120 characters.";

    const parsed = Number(basePrice);
    if (basePrice.trim() === "" || !Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
      next.basePrice = "Base price must be a whole number, zero or more.";
    } else if (parsed > 10_000_000) {
      next.basePrice = "Base price cannot exceed 10,000,000.";
    }
    if (!Number.isInteger(segment) || segment < 1 || segment > SEGMENT_COUNT) {
      next.segment = `Segment must be 1–${SEGMENT_COUNT}.`;
    }
    if (department.trim().length > 120) next.department = "Department too long (max 120).";
    if (academicYear.trim().length > 40) next.academicYear = "Academic year too long (max 40).";
    if (category.trim().length > 80) next.category = "Category too long (max 80).";

    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return {
      name: trimmed,
      department: department.trim() || undefined,
      academicYear: academicYear.trim() || undefined,
      category: category.trim() || undefined,
      basePrice: parsed,
      segment,
      photoUrl,
      correction,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = validate();
    if (!values) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      onDone();
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preview + name */}
      <div className="flex items-start gap-4">
        <PlayerPhoto photoUrl={photoUrl} name={name || "?"} size={72} className="mt-6" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="player-name">Player name</Label>
          <Input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rakib Hasan"
            disabled={hardLocked}
            autoFocus
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="text-xs font-medium text-red-500">{errors.name}</p>}
        </div>
      </div>

      {/* Correction-mode banner (only post-start, only for non-sold players) */}
      {lifecycleLocked && !playerSold && (
        <label
          htmlFor="correction-mode"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs leading-relaxed transition-colors",
            correction
              ? "border-amber-400/70 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
              : "border-zinc-200 text-zinc-600 hover:border-amber-300 dark:border-white/10 dark:text-zinc-300",
          )}
        >
          <input
            id="correction-mode"
            type="checkbox"
            checked={correction}
            onChange={(e) => setCorrection(e.target.checked)}
            className="mt-0.5 size-4 accent-amber-400"
          />
          <span>
            <strong className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-3.5" aria-hidden />
              Correction mode — authorized edits only
            </strong>
            The auction has started. Base price and segment are locked unless you explicitly
            enable this. All changes appear instantly on the public display.
          </span>
        </label>
      )}
      {playerSold && (
        <p className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
          This player has been sold. Assignment, price and status are locked — recoveries go
          through the explicit admin reset procedure.
        </p>
      )}

      {/* Price + segment */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="player-price">
            Base price{" "}
            <span className="font-normal text-zinc-400">({CURRENCY_SYMBOL})</span>
          </Label>
          <Input
            id="player-price"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="e.g. 10000"
            disabled={priceSegmentLocked}
            aria-invalid={Boolean(errors.basePrice)}
          />
          {errors.basePrice && (
            <p className="text-xs font-medium text-red-500">{errors.basePrice}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="player-segment">Segment</Label>
          <select
            id="player-segment"
            value={segment}
            onChange={(e) => setSegment(Number(e.target.value))}
            disabled={priceSegmentLocked}
            className={inputClass}
            aria-invalid={Boolean(errors.segment)}
          >
            {Array.from({ length: SEGMENT_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Segment {n}
              </option>
            ))}
          </select>
          {errors.segment && <p className="text-xs font-medium text-red-500">{errors.segment}</p>}
        </div>
      </div>

      {/* Department / year / category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="player-department">Department</Label>
          <Input
            id="player-department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. CSE"
            disabled={hardLocked}
          />
          {errors.department && (
            <p className="text-xs font-medium text-red-500">{errors.department}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="player-year">Academic year</Label>
          <Input
            id="player-year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="e.g. 3rd Year"
            disabled={hardLocked}
          />
          {errors.academicYear && (
            <p className="text-xs font-medium text-red-500">{errors.academicYear}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="player-category">Category (optional)</Label>
        <Input
          id="player-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Batsman, Bowler, All-rounder"
          disabled={hardLocked}
        />
        {errors.category && <p className="text-xs font-medium text-red-500">{errors.category}</p>}
      </div>

      {/* Photo picker */}
      <div className="space-y-1.5">
        <Label>Photograph</Label>
        <ImagePicker
          images={PLAYER_IMAGES}
          value={photoUrl}
          onChange={setPhotoUrl}
          label="Choose a player photograph"
          emptyHint="Player photos go in public/images/players/ — add files and redeploy to see them here."
        />
      </div>

      {errors.form && (
        <p
          role="alert"
          className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          {errors.form}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-amber-400 text-zinc-950 hover:bg-amber-300 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {isEdit ? "Save changes" : "Add player"}
        </Button>
      </DialogFooter>
    </form>
  );
}
