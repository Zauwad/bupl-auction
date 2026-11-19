/**
 * SEED — the real BRAC University player list (50 players, 5 segments × 10).
 *
 *   node --env-file=.env.local --env-file=.env.demo.local scripts/seed-players.mjs
 *
 * Reads Final_Player_List.md at the repo root. The table there is the
 * source of truth: name, segment, university ID. Players are keyed by their
 * university ID (players/{uid}), and photoUrl is resolved by matching the ID
 * against filenames in public/images/players/.
 *
 * Base prices are NOT in the list, so every player is created with a
 * placeholder base price of 5000 — change it in Admin → Players before the
 * auction, or re-run with real prices once you have them.
 *
 * Idempotent: players whose university ID already exists are skipped.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const B = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const API = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

if (!B || !API || !EMAIL || !PASSWORD) {
  console.error("Missing env. Run with:\n  node --env-file=.env.local --env-file=.env.demo.local scripts/seed-players.mjs");
  process.exit(1);
}

const PLACEHOLDER_BASE_PRICE = 5000;

const SEGMENT_NUMBER = {
  "Game Changer": 1,
  "Stroke Maker": 2,
  "Trump Card": 3,
  "Assassin": 4,
  "Young Blood": 5,
};

// ── Parse the markdown table ────────────────────────────────────────────────
const md = fs.readFileSync(path.join(ROOT, "Final_Player_List.md"), "utf8");
const rows = [];
for (const line of md.split("\n")) {
  const m = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(\d+)\*\*/);
  if (m) rows.push({ name: m[1].trim(), segmentName: m[2].trim(), studentId: m[3].trim() });
}
if (rows.length !== 50) {
  console.error(`Expected 50 players in Final_Player_List.md, parsed ${rows.length}.`);
  process.exit(1);
}
const counts = {};
for (const r of rows) counts[r.segmentName] = (counts[r.segmentName] ?? 0) + 1;
for (const [seg, n] of Object.entries(counts)) {
  if (n !== 10) console.error(`WARNING: ${seg} has ${n} players, expected 10`);
}

// ── Match images by ID ───────────────────────────────────────────────────────
const imageDir = path.join(ROOT, "public", "images", "players");
const images = fs.readdirSync(imageDir).filter((f) => /\.(webp|jpg|jpeg|png|avif)$/i.test(f));

for (const row of rows) {
  const hit = images.find((f) => f.includes(row.studentId));
  row.photoUrl = hit ? encodeURI(`/images/players/${hit}`) : undefined;
  if (!hit) console.error(`!! No image found for ${row.studentId} ${row.name}`);
}

// ── Auth ─────────────────────────────────────────────────────────────────────
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
const now = Date.now();

// ── Restore settings singleton first (rules need an explicit not_started) ────
const settingsSnap = await fetch(`${B}/settings.json?auth=${token}`).then((r) => r.json());
if (!settingsSnap) {
  const created = await fetch(`${B}/settings.json?auth=${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tournamentName: "BUPL Cricket Auction",
      totalSegments: 5,
      currentSegment: 1,
      auctionStatus: "not_started",
      currentPlayerId: null,
      updatedAt: now,
    }),
  });
  if (!created.ok) {
    console.error("Could not create settings:", await created.text());
    process.exit(1);
  }
  console.log("Created /settings (not_started). Admin can rename in Admin → Settings.");
} else {
  console.log(`/settings already exists (${settingsSnap.tournamentName}) — leaving it untouched.`);
}

// ── Read existing players (idempotency by university ID) ─────────────────────
const existing = (await fetch(`${B}/players.json?shallow=true&auth=${token}`).then((r) => r.json())) ?? {};

let createdCount = 0;
let skippedCount = 0;
for (const row of rows) {
  if (existing[row.studentId]) {
    skippedCount += 1;
    continue;
  }
  const record = {
    name: row.name,
    studentId: row.studentId,
    basePrice: PLACEHOLDER_BASE_PRICE,
    segment: SEGMENT_NUMBER[row.segmentName],
    status: "upcoming",
    purchasedByClubId: null,
    finalPrice: null,
    createdAt: now,
    updatedAt: now,
  };
  if (row.photoUrl) record.photoUrl = row.photoUrl;
  // PUT — idempotent by university ID key
  const res = await fetch(`${B}/players/${row.studentId}.json?auth=${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (res.ok) createdCount += 1;
  else console.error(`✗ ${row.studentId} ${row.name}: ${res.status}: ${await res.text()}`);
}

// ── Sync segments rosters (orders NOT randomized — admin confirms explicitly) ─
const SEGMENT_ORDER = ["Game Changer", "Stroke Maker", "Trump Card", "Assassin", "Young Blood"];
for (let i = 0; i < SEGMENT_ORDER.length; i += 1) {
  const n = i + 1;
  const name = SEGMENT_ORDER[i];
  const roster = rows
    .filter((r) => r.segmentName === name)
    .map((r) => r.studentId)
    .sort();
  const res = await fetch(`${B}/segments/segment-${n}.json?auth=${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      playerIds: roster,
      randomizedOrder: [],
      isOrderConfirmed: false,
      isCompleted: false,
      segmentNumber: n,
      createdAt: now,
      updatedAt: now,
    }),
  });
  console.log(`segment-${n} (${name}): ${roster.length} players → ${res.status}`);
}

console.log("");
console.log("Seed complete.");
console.log(`  players created: ${createdCount}, skipped (already existed): ${skippedCount}`);
console.log(`  placeholder base price for all players: ${PLACEHOLDER_BASE_PRICE} — update before the auction.`);
console.log("Next: Admin → Players to set base prices, then Admin → Segments → Sync/Confirm each order.");
process.exit(0);
