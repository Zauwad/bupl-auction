"use client";

import { useState } from "react";
import { Gavel, Loader2, RotateCcw, Tag } from "lucide-react";
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
import { segmentDisplayName } from "@/lib/constants";
import type { Player } from "@/types";

interface ReauctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
  loading: boolean;
  onConfirm: (startingBasePrice: number) => Promise<void>;
}

interface ReauctionFormProps {
  player: Player;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (startingBasePrice: number) => Promise<void>;
}

function ReauctionForm({
  player,
  loading,
  onCancel,
  onConfirm,
}: ReauctionFormProps) {
  const [price, setPrice] = useState<number>(player.basePrice);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (price < 0 || !Number.isInteger(price)) {
      setError("Please enter a valid starting price (whole number).");
      return;
    }
    setError(null);
    await onConfirm(price);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
          <Gavel className="size-5 text-amber-500" aria-hidden />
          Re-Auction Player
        </DialogTitle>
        <DialogDescription>
          Place this unsold player back onto the live auction block. The stage projector and spectator mobile screens will display them immediately.
        </DialogDescription>
      </DialogHeader>

      {/* Player details preview card */}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
        <PlayerPhoto photoUrl={player.photoUrl} name={player.name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{player.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {player.category ?? "Player"} · {segmentDisplayName(player.segment)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-300">
            Original Base: <span className="font-semibold">{formatPrice(player.basePrice)}</span>
          </p>
        </div>
      </div>

      {/* Starting base price adjustment */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="reauction-price" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Starting Base Price (৳)
          </Label>
          {price !== player.basePrice && (
            <button
              type="button"
              onClick={() => setPrice(player.basePrice)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:underline dark:text-amber-400"
            >
              <RotateCcw className="size-3" />
              Reset to original ({formatPrice(player.basePrice)})
            </button>
          )}
        </div>

        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="reauction-price"
            type="number"
            min={0}
            step={100}
            value={price}
            onChange={(e) => {
              setPrice(Number(e.target.value));
              setError(null);
            }}
            className="pl-9 font-mono font-semibold"
            required
          />
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Clubs will begin bidding from this price. You may adjust or discount if negotiated.
        </p>
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>

      <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-400 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Putting on block…
            </>
          ) : (
            <>
              <Gavel className="mr-1.5 size-4" />
              Put on Block Now
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ReauctionDialog({
  open,
  onOpenChange,
  player,
  loading,
  onConfirm,
}: ReauctionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {player && (
          <ReauctionForm
            key={player.id}
            player={player}
            loading={loading}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
