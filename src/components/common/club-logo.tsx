"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ClubLogoProps {
  logoUrl?: string;
  name: string;
  /** Registered club abbreviation (e.g. "BUEC") — used when no image exists. */
  abbreviation?: string;
  /** Pixel size of the square logo. */
  size?: number;
  className?: string;
}

/**
 * Club badge: renders the static logo (or any stored URL) with graceful
 * fallback to the club's abbreviation — a missing image can never break a page.
 * The abbreviation is rendered through an SVG with textLength, so it always
 * fits the badge whatever the string length or font metrics.
 */
function deriveAbbreviation(name: string): string {
  const stop = new Set(["of", "and", "the", "for", "university"]);
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .filter((w) => !stop.has(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 5);
  return letters || (name[0]?.toUpperCase() ?? "?");
}

export function ClubLogo({ logoUrl, name, abbreviation, size = 40, className }: ClubLogoProps) {
  const [failed, setFailed] = useState(false);
  const label = (abbreviation?.trim() || deriveAbbreviation(name)).slice(0, 6);

  if (!logoUrl || failed) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-400/25 to-amber-400/5 text-amber-600 dark:text-amber-400",
          className,
        )}
      >
        <svg viewBox="0 0 100 100" width="88%" height="88%" role="img" aria-label={label}>
          <text
            x="50"
            y="50"
            dominantBaseline="central"
            textAnchor="middle"
            fontSize="42"
            fontWeight={800}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fill="currentColor"
            textLength={92}
            lengthAdjust="spacingAndGlyphs"
          >
            {label}
          </text>
        </svg>
      </span>
    );
  }

  const isStaticPath = logoUrl.startsWith("/");
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/5",
        className,
      )}
    >
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        fill
        sizes={`${size}px`}
        unoptimized={!isStaticPath}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
