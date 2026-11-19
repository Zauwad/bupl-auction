/**
 * Static image manifest for player photos and club logos.
 *
 * Images live in /public/images/{players,clubs} and are deployed with the
 * frontend (Vercel static assets). The manifest is regenerated on every
 * `predev` / `prebuild` by scripts/generate-image-manifest.mjs — never edit
 * src/generated/image-manifest.json by hand.
 *
 * Components should import from here, never read the JSON directly.
 */
import manifest from "@/generated/image-manifest.json";

export interface ImageManifest {
  /** Public paths, e.g. "/images/players/rakib.jpg" */
  players: string[];
  clubs: string[];
}

const typed = manifest as ImageManifest;

export const PLAYER_IMAGES: readonly string[] = typed.players;
export const CLUB_IMAGES: readonly string[] = typed.clubs;

export function getImageManifest(): ImageManifest {
  return typed;
}
