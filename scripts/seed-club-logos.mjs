/**
 * Link club logo files to club records.
 *
 *   node --env-file=.env.local --env-file=.env.demo.local scripts/seed-club-logos.mjs
 *
 * Matches each file in public/images/clubs/ to a club by ABBREVIATION
 * (case-insensitive) and PATCHes its logoUrl. Existing logo paths are left
 * alone unless the abbreviation matches, so re-running is idempotent.
 */
import { readdirSync, existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const B = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const API = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

if (!B || !API || !EMAIL || !PASSWORD) {
  console.error("Missing env. Run with:\n  node --env-file=.env.local --env-file=.env.demo.local scripts/seed-club-logos.mjs");
  process.exit(1);
}

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const imageDir = join(ROOT, "public", "images", "clubs");
const files = existsSync(imageDir) ? readdirSync(imageDir) : [];
const byAbbrev = new Map();
for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!ALLOWED.has(ext)) continue;
  byAbbrev.set(file.slice(0, -ext.length).toUpperCase(), `/images/clubs/${file}`);
}

const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
}).then((r) => r.json());
if (auth.error) {
  console.error("Sign-in failed:", auth.error.message ?? auth.error);
  process.exit(1);
}
const token = auth.idToken;

const clubs = (await fetch(`${B}/clubs.json?auth=${token}`).then((r) => r.json())) ?? {};
const clubEntries = Object.entries(clubs);
console.log(`${clubEntries.length} clubs in the database`);

const linked = [];
const unmatched = [];
for (const [key, club] of clubEntries) {
  const abbr = club?.abbreviation?.toUpperCase();
  const logoPath = abbr ? byAbbrev.get(abbr) : undefined;
  if (!logoPath) {
    unmatched.push(`${club?.name ?? key} (abbreviation: ${abbr ?? "none"})`);
    continue;
  }
  const res = await fetch(`${B}/clubs/${key}.json?auth=${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logoUrl: logoPath }),
  });
  if (res.ok) linked.push(`${club.abbreviation} -> ${logoPath}`);
  else console.error(`✗ ${club?.name}: ${res.status}: ${await res.text()}`);
}

console.log("");
console.log("Logos linked:");
for (const l of linked) console.log("  ✓", l);
if (unmatched.length) {
  console.log("");
  console.log("Could not match (no action taken):");
  for (const u of unmatched) console.log("  !", u);
}
process.exit(0);
