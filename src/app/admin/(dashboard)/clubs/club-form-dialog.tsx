"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { ClubLogo } from "@/components/common/club-logo";
import { CLUB_IMAGES } from "@/lib/images";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import type { Club } from "@/types";

export interface ClubFormValues {
  name: string;
  abbreviation?: string;
  initialBudget: number;
  logoUrl?: string;
}

interface ClubFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this club; otherwise it creates a new one. */
  club?: Club | null;
  onSubmit: (values: ClubFormValues) => Promise<void>;
}

/** Add/edit club dialog: name, initial budget, logo picker. */
export function ClubFormDialog({
  open,
  onOpenChange,
  club,
  onSubmit,
}: ClubFormDialogProps) {
  const isEdit = Boolean(club);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit club" : "Add new club"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes sync to Firebase instantly and appear on the public display."
              : "Creates the club with full remaining budget. You can edit everything before the auction starts."}
          </DialogDescription>
        </DialogHeader>
        {/* Remount on open/target change so the form always starts clean */}
        {open && (
          <ClubForm
            key={club?.id ?? "new"}
            club={club ?? null}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClubForm({
  club,
  onSubmit,
  onCancel,
  onDone,
}: {
  club: Club | null;
  onSubmit: (values: ClubFormValues) => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const isEdit = club !== null;
  const purchasesLocked = (club?.totalPlayersPurchased ?? 0) > 0;

  const [name, setName] = useState(club?.name ?? "");
  const [abbreviation, setAbbreviation] = useState(club?.abbreviation ?? "");
  const [budget, setBudget] = useState(club ? String(club.initialBudget) : "");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(club?.logoUrl ?? undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): ClubFormValues | null {
    const next: Record<string, string> = {};
    const trimmed = name.trim();
    if (trimmed.length < 2) next.name = "Name must be at least 2 characters.";
    else if (trimmed.length > 80) next.name = "Name must be at most 80 characters.";

    const abbr = abbreviation.trim();
    if (abbr.length > 12) next.abbreviation = "Abbreviation must be at most 12 characters.";

    const parsed = Number(budget);
    if (budget.trim() === "" || !Number.isFinite(parsed)) {
      next.budget = "Enter a valid budget amount.";
    } else if (!Number.isInteger(parsed) || parsed < 0) {
      next.budget = "Budget must be a whole number, zero or more.";
    } else if (parsed > 100_000_000) {
      next.budget = "Budget cannot exceed 100,000,000.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return { name: trimmed, abbreviation: abbr ? abbr.toUpperCase() : undefined, initialBudget: parsed, logoUrl };
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
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preview + name */}
      <div className="flex items-start gap-4">
        <ClubLogo logoUrl={logoUrl} name={name || "?"} abbreviation={abbreviation || undefined} size={72} className="mt-6" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="club-name">Club name</Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dhaka Strikers"
            autoFocus
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "club-name-error" : undefined}
          />
          {errors.name && (
            <p id="club-name-error" className="text-xs font-medium text-red-500">
              {errors.name}
            </p>
          )}
        </div>
      </div>

      {/* Abbreviation */}
      <div className="space-y-1.5">
        <Label htmlFor="club-abbr">
          Abbreviation{" "}
          <span className="font-normal text-zinc-400">(optional, max 12 chars, e.g. BUEC)</span>
        </Label>
        <Input
          id="club-abbr"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value.replace(/\s/g, "").slice(0, 12))}
          placeholder="e.g. BUEC"
          maxLength={12}
          className="font-mono uppercase tracking-widest"
          aria-invalid={Boolean(errors.abbreviation)}
          aria-describedby={errors.abbreviation ? "club-abbr-error" : undefined}
        />
        {errors.abbreviation && (
          <p id="club-abbr-error" className="text-xs font-medium text-red-500">
            {errors.abbreviation}
          </p>
        )}
      </div>

      {/* Budget */}
      <div className="space-y-1.5">
        <Label htmlFor="club-budget">
          Initial budget{" "}
          <span className="font-normal text-zinc-400">({CURRENCY_SYMBOL})</span>
        </Label>
        <Input
          id="club-budget"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="e.g. 100000"
          disabled={purchasesLocked}
          aria-invalid={Boolean(errors.budget)}
          aria-describedby={
            purchasesLocked
              ? "club-budget-locked"
              : errors.budget
                ? "club-budget-error"
                : undefined
          }
        />
        {purchasesLocked ? (
          <p id="club-budget-locked" className="text-xs text-zinc-500 dark:text-zinc-400">
            Locked — this club has purchased players. Use the explicit reset procedure to
            change the budget.
          </p>
        ) : (
          errors.budget && (
            <p id="club-budget-error" className="text-xs font-medium text-red-500">
              {errors.budget}
            </p>
          )
        )}
      </div>

      {/* Logo picker */}
      <div className="space-y-1.5">
        <Label>Club logo</Label>
        <ImagePicker
          images={CLUB_IMAGES}
          value={logoUrl}
          onChange={setLogoUrl}
          label="Choose a club logo"
          emptyHint="Club logos go in public/images/clubs/ — add files and redeploy to see them here."
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
          {isEdit ? "Save changes" : "Create club"}
        </Button>
      </DialogFooter>
    </form>
  );
}
