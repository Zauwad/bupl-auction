/**
 * SEED — the 10 real BRAC University clubs.
 *
 *   node --env-file=.env.local --env-file=.env.demo.local scripts/seed-clubs.mjs
 *
 * Idempotent: clubs matched by exact name are skipped, never duplicated.
 * Runs once to populate the real club list. Budgets default to 100,000 — change
 * them any time in Admin → Clubs Management.
 */

const B = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const API = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

if (!B || !API || !EMAIL || !PASSWORD) {
  console.error("Missing env. Run with:\n  node --env-file=.env.local --env-file=.env.demo.local scripts/seed-clubs.mjs");
  process.exit(1);
}

const REAL_CLUBS = [
  { name: "BRAC University Economics Club", abbreviation: "BUEC" },
  { name: "Football Club Of BRAC University", abbreviation: "FCBU" },
  { name: "BRAC University MONON", abbreviation: "MONON" },
  { name: "BRAC University Research For Development Club", abbreviation: "BUReD" },
  { name: "BRAC University Business & Economics Forum", abbreviation: "BUBEF" },
  { name: "BRAC University Business Club", abbreviation: "BIZBEE" },
  { name: "BRAC University Pharma Society", abbreviation: "BUPS" },
  { name: "BRAC University Health & Safety Club", abbreviation: "BUHSC" },
  { name: "BRAC University Drama & Theatre Forum", abbreviation: "BUDTF" },
  { name: "BRAC University Leadership Development Forum", abbreviation: "BULDF" },
];
const CLUB_BUDGET = 100000;

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

// Read existing clubs to avoid duplicates
const existing = (await fetch(`${B}/clubs.json?auth=${token}`).then((r) => r.json())) ?? {};
const existingNames = new Set(Object.values(existing).map((c) => c?.name).filter(Boolean));

const created = [];
const skipped = [];
for (const club of REAL_CLUBS) {
  if (existingNames.has(club.name)) {
    skipped.push(club.abbreviation);
    continue;
  }
  const res = await fetch(`${B}/clubs.json?auth=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: club.name,
      abbreviation: club.abbreviation,
      initialBudget: CLUB_BUDGET,
      remainingBudget: CLUB_BUDGET,
      totalPlayersPurchased: 0,
      purchasedPlayerIds: {},
      createdAt: now,
      updatedAt: now,
    }),
  });
  if (res.ok) created.push(club.abbreviation);
  else console.error(`✗ ${club.abbreviation}: ${res.status}: ${await res.text()}`);
}

console.log("");
console.log("Seed complete.");
console.log(`  created: ${created.length ? created.join(", ") : "none"}`);
console.log(`  skipped (already exist): ${skipped.length ? skipped.join(", ") : "none"}`);
console.log(`  budget set to ${CLUB_BUDGET.toLocaleString()} per club — edit any time in Admin → Clubs.`);
process.exit(0);
