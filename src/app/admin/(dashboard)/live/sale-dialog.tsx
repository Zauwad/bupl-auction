"use client";

import { useState } from "react";
import { BadgeDollarSign, Loader2, Wallet, ArrowRight } from "lucide-react";
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
import { PlayerPhoto } from "@/components/common/player-photo";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Club, Player } from "@/types";

export interface SaleFormValues {
  clubId: string;
  price: number;
}

interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
  clubs: Club[];
  /** Performs the atomic purchase. Throw PurchaseError/Error on failure — the dialog stays open and shows it. */
  onSubmit: (values: SaleFormValues) => Promise<void>;
}

/**
 * SOLD confirmation: player summary, club select with live budget math,
 * price validation (≥ base price, ≤ remaining budget), atomic commit.
 */
export function SaleDialog({
  open,
  onOpenChange,
  player,
  clubs,
  onSubmit,
}: SaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {player && (
          <SaleForm
            key={player.id}
            player={player}
            clubs={clubs}
            onSubmit={async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaleForm({
  player,
  clubs,
  onSubmit,
  onCancel,
}: {
  player: Player;
  clubs: Club[];
  onSubmit: (values: SaleFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [clubId, setClubId] = useState("");
  const [price, setPrice] = useState(String(player.basePrice));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedClub = clubs.find((c) => c.id === clubId) ?? null;
  const parsedPrice = Number(price);
  const priceIsInteger = Number.isInteger(parsedPrice) && price.trim() !== "";
  const priceValid = priceIsInteger && parsedPrice >= player.basePrice;
  const budgetValid = selectedClub !== null && selectedClub.remainingBudget >= parsedPrice;
  const remainingAfter = selectedClub ? selectedClub.remainingBudget - parsedPrice : null;

  const validationMessages: string[] = [];
  if (price.trim() === "") validationMessages.push("Enter the final purchase price.");
  else if (!priceIsInteger) validationMessages.push("Price must be a whole number.");
  else if (parsedPrice < player.basePrice)
    validationMessages.push(
      `Price is below the base price of ${formatPrice(player.basePrice)}.`,
    );
  if (clubId === "") validationMessages.push("Select the winning club.");
  else if (!budgetValid)
    validationMessages.push(
      `${selectedClub?.name} has only ${formatPrice(selectedClub?.remainingBudget ?? 0)} remaining — cannot pay ${priceValid ? formatPrice(parsedPrice) : formatPrice(0)}.`,
    );

  const ready = validationMessages.length === 0 && !submitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ clubId, price: parsedPrice });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The sale could not be recorded. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center gap-4">
          <PlayerPhoto photoUrl={player.photoUrl} name={player.name} size={72} />
          <div className="min-w-0">
            <DialogTitle className="truncate text-xl">{player.name}</DialogTitle>
            <DialogDescription>
              Segment {player.segment} · Base price {formatPrice(player.basePrice)}
            </DialogDescription>
            {player.category && (
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                {player.category}
              </p>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Winning club */}
        <div className="space-y-1.5">
          <Label htmlFor="winning-club">Winning club</Label>
          <select
            id="winning-club"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
            autoFocus
          >
            <option value="">Select club…</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} — {formatPrice(club.remainingBudget)} left
              </option>
            ))}
          </select>
        </div>

        {/* Selected club budget math */}
        {selectedClub && (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-white/10 dark:bg-white/[0.03]">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              <Wallet className="size-3.5" aria-hidden />
              {selectedClub.name} — budget
            </p>
            <div className="flex items-center justify-between font-mono">
              <span className="text-zinc-500 dark:text-zinc-400">Remaining before sale</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-100">
                {formatPrice(selectedClub.remainingBudget)}
              </span>
            </div>
            <div
              className={cn(
                "flex items-center justify-between font-mono",
                remainingAfter !== null && remainingAfter < 0 && "text-red-500",
              )}
            >
              <span className="text-zinc-500 dark:text-zinc-400">Remaining after sale</span>
              <span className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
                <ArrowRight className="size-3.5 text-zinc-400" aria-hidden />
                {remainingAfter !== null ? formatPrice(remainingAfter) : "—"}
              </span>
            </div>
          </div>
        )}

        {/* Final price */}
        <div className="space-y-1.5">
          <Label htmlFor="sale-price">Final purchase price</Label>
          <div className="relative">
            <BadgeDollarSign className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
            <Input
              id="sale-price"
              type="number"
              inputMode="numeric"
              min={player.basePrice}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-12 pl-11 font-mono text-lg font-bold tabular-nums"
              placeholder={String(player.basePrice)}
              aria-invalid={validationMessages.length > 0}
            />
          </div>
        </div>

        {/* Validation + transaction error */}
        {validationMessages.length > 0 && (
          <ul className="space-y-1">
            {validationMessages.map((message, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
              >
                <span aria-hidden>•</span>
                {message}
              </li>
            ))}
          </ul>
        )}
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-xs font-medium leading-relaxed text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
          >
            {formError}
          </p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!ready}
          className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          Confirm sale
        </Button>
      </DialogFooter>
    </form>
  );
}
