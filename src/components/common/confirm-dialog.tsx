"use client";

import { useEffect, useRef } from "react";
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
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** Content rendered above the footer (e.g. impact summary, block reasons). */
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the confirm button is disabled and this message is shown instead. */
  blockedReason?: string | null;
  loading?: boolean;
  onConfirm: () => void;
}

/** Generic destructive/important-action confirmation dialog. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  blockedReason = null,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && !blockedReason) {
      // Autofocus cancel by default for destructive actions is safer; keep
      // confirm focus only for non-destructive flows.
      if (!destructive) confirmRef.current?.focus();
    }
  }, [open, blockedReason, destructive]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && (
              <AlertTriangle className="size-5 text-red-500" aria-hidden />
            )}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children}

        {blockedReason && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
          >
            {blockedReason}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading || Boolean(blockedReason)}
            className={cn(
              destructive &&
                "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500",
            )}
          >
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
