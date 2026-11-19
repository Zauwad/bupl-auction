#!/usr/bin/env node
/**
 * Scans public/images/{players,clubs} and writes src/generated/image-manifest.json.
 * The admin "create player/club" form reads this manifest to render the image picker.
 * Runs automatically via the `predev` and `prebuild` npm scripts.
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const IMAGE_DIRS = {
  players: "public/images/players",
  clubs: "public/images/clubs",
};

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const manifest = {};
for (const [key, relDir] of Object.entries(IMAGE_DIRS)) {
  const dir = join(ROOT, relDir);
  const files = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            !entry.name.startsWith(".") &&
            ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase()),
        )
        .map((entry) => `/images/${key}/${entry.name}`)
        .sort((a, b) => a.localeCompare(b))
    : [];
  manifest[key] = files;
}

const outDir = join(ROOT, "src", "generated");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "image-manifest.json");
writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `image-manifest: ${manifest.players.length} player images, ${manifest.clubs.length} club images -> ${outFile}`,
);
