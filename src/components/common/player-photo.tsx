"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PlayerPhotoProps {
  photoUrl?: string;
  name: string;
  /** Pixel size of the square avatar. */
  size?: number;
  className?: string;
}

/** Player avatar with initials fallback — missing images never break rendering. */
export function PlayerPhoto({ photoUrl, name, size = 40, className }: PlayerPhotoProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const hasCustomSize =
    className &&
    (/\bsize-\S+/.test(className) ||
      (/\bw-\S+/.test(className) && /\bh-\S+/.test(className)));

  const box = {
    ...(hasCustomSize ? {} : { width: size, height: size }),
    fontSize: Math.max(10, Math.round(size * 0.36)),
  };

  if (!photoUrl || failed) {
    return (
      <span
        aria-hidden
        style={box}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-br from-sky-400/25 to-sky-400/5 font-black tracking-wider text-sky-600 dark:text-sky-400",
          className,
        )}
      >
        {initials || "?"}
      </span>
    );
  }

  const isStaticPath = photoUrl.startsWith("/");
  return (
    <span
      style={box}
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/5",
        className,
      )}
    >
      <Image
        src={photoUrl}
        alt={name}
        fill
        sizes={`${size}px`}
        unoptimized={!isStaticPath}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
