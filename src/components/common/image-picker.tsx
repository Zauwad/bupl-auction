"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ImageOff, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  /** Available public image paths (e.g. from CLUB_IMAGES / PLAYER_IMAGES). */
  images: readonly string[];
  value?: string;
  onChange: (path: string | undefined) => void;
  /** Accessible label for the grid. */
  label: string;
  emptyHint?: string;
}

/**
 * Thumbnail grid for picking a static image from /public/images.
 * Searchable by filename; "No image" tile clears the selection.
 * The chosen public path (or undefined) is stored — never a file upload
 * (images ship with the deployment; see docs/DECISIONS.md).
 */
export function ImagePicker({
  images,
  value,
  onChange,
  label,
  emptyHint = "No images found in the public folder yet.",
}: ImagePickerProps) {
  const [query, setQuery] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Keep the selected tile visible when the grid is filtered
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [value]);

  const filtered = images.filter((path) =>
    path.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by filename…"
          aria-label="Filter images"
          className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
        />
      </div>

      <div
        role="radiogroup"
        aria-label={label}
        className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-white/10 sm:grid-cols-6"
      >
        {/* No-image tile */}
        <button
          type="button"
          role="radio"
          aria-checked={value === undefined}
          aria-label="No image"
          onClick={() => onChange(undefined)}
          className={cn(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-500",
            value === undefined
              ? "border-amber-400 bg-amber-50 text-amber-600 ring-2 ring-amber-400/50 dark:border-amber-400/60 dark:bg-amber-400/10 dark:text-amber-400"
              : "border-zinc-300 dark:border-white/15",
          )}
        >
          <ImageOff className="size-5" aria-hidden />
          None
        </button>

        {filtered.map((path) => {
          const selected = path === value;
          return (
            <button
              key={path}
              ref={selected ? activeRef : undefined}
              type="button"
              role="radio"
              aria-checked={selected}
              title={path}
              onClick={() => onChange(path)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-md border bg-zinc-100 outline-none transition-all focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-white/5",
                selected
                  ? "border-amber-400 ring-2 ring-amber-400/70"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-white/10 dark:hover:border-white/25",
              )}
            >
              <Image
                src={path}
                alt={path.split("/").pop() ?? path}
                fill
                sizes="(max-width: 640px) 25vw, 96px"
                className="object-cover transition-transform duration-150 group-hover:scale-105"
              />
              {selected && (
                <span className="absolute right-1 top-1 rounded-full bg-amber-400 p-0.5 text-zinc-950 shadow">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              )}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-zinc-950/70 px-1 py-0.5 text-left text-[9px] text-zinc-100">
                {path.split("/").pop()}
              </span>
            </button>
          );
        })}
      </div>

      {images.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{emptyHint}</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No images match “{query}”.
        </p>
      ) : null}
    </div>
  );
}
