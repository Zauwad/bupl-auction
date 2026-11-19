/**
 * DEMO SEED — populate the Firebase RTDB with clearly-marked test data so the
 * auction loop can be exercised end-to-end.
 *
 *   node --env-file=.env.local --env-file=.env.demo.local scripts/seed-demo.mjs
 *
 * What it does (per-path PATCH writes — root-level PATCH is denied by rules):
 *   note: NOT atomic between paths; all-or-nothing is not guaranteed.
 *   - /settings        demo tournament singleton (DEMO marker in name)
 *   - /clubs/demo-club-01..12
 *   - /players/demo-player-01..50          (5 segments × 10 players)
 *   - /segments/segment-1..5               (rosters synced, orders confirmed)
 *
 * Everything it creates uses the `demo-` prefix (or the DEMO marker) so that
 * scripts/remove-demo.mjs can remove it later without touching real data.
 * Idempotent: re-running just overwrites the same demo nodes.
 */

const DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

if (!DATABASE_URL || !API_KEY || !EMAIL || !PASSWORD) {
  console.error(
    "Missing env. Run with:\n  node --env-file=.env.local --env-file=.env.demo.local scripts/seed-demo.mjs",
  );
  process.exit(1);
}

// ── Demo data ────────────────────────────────────────────────────────────────

const DEMO_TOURNAMENT_NAME = "BUPL Demo Cricket Auction (TEST DATA)";

const CLUBS = [
  "Dilkusha Strikers", "Chamelibag Titans", "Rupsha Warriors",
  "Lalmatia Kings", "Nawabganj Falcons",
  "Hatirpool Panthers", "Mohammadpur Monarchs", "Mirpur Maulers",
  "Uttara United", "Tejgaon Thunder",
];
const CLUB_BUDGET = 100000;

const PLAYER_NAMES = [
  "Rakib Hasan", "Nila Ahmed", "Tanvir Islam", "Mehedi Hasan", "Anika Islam", "Sifat Chowdhury",
  "Nusrat Jahan", "Lamya Akter", "Ibrahim Khalil", "Sadek Hossain", "Bristy Das", "Jahidul Islam",
  "Shanto Roy", "Prosenjit Chakraborty", "Monisha Rani", "Amirul Islam", "Farzana Akter", "Nayeem Uddin",
  "Sumaiya Islam", "Ishrat Jahan", "Zahid Hasan", "Tisha Chowdhury", "Palash Mondal", "Ritu Dey",
  "Puja Rani", "Samiul Alam", "Labonya Sen", "Arif Chowdhury", "Sharmin Akter", "Maisha Islam",
  "Rafiq Uddin", "Taraka Dey", "Sheikh Sadek", "Dimple Rani", "Rini Biswas", "Polok Saha",
  "Ayesha Siddika", "Monjur Hasan", "Anik Sarker", "Mithila Rahman", "Sania Yasmin", "Trina Chowdhury",
  "Habib Rahman", "Pritty Rani", "Tawhid Rahman", "Fahim Shahriar", "Mahiyat Tasnim", "Farhan Karim",
  "Emam Hossain", "Kamrul Hassan",
];

const DEPARTMENTS = ["CSE", "BBA", "EEE", "English", "Law", "Pharmacy", "Textile", "Civil", "Economics", "Zoology"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"];
const CATEGORIES = ["Batsman", "Bowler", "All-rounder", "Wicket-keeper"];
const PRICES = [5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000];

const now = Date.now();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const updates = {};

// /settings — demo singleton
updates["/settings"] = {
  tournamentName: DEMO_TOURNAMENT_NAME,
  totalSegments: 5,
  currentSegment: 1,
  auctionStatus: "not_started",
  currentPlayerId: null,
  updatedAt: now,
};

// /clubs/demo-club-01..10 — operating budget = CLUB_BUDGET each
for (let i = 0; i < CLUBS.length; i += 1) {
  const key = String(i + 1).padStart(2, "0");
  updates[`/clubs/demo-club-${key}`] = {
    name: CLUBS[i],
    initialBudget: CLUB_BUDGET,
    remainingBudget: CLUB_BUDGET,
    totalPlayersPurchased: 0,
    purchasedPlayerIds: {},
    createdAt: now,
    updatedAt: now,
  };
}

// /players/demo-player-01..50 — 10 per segment
for (let i = 0; i < 50; i += 1) {
  const key = String(i + 1).padStart(2, "0");
  const segment = Math.floor(i / 10) + 1;
  updates[`/players/demo-player-${key}`] = {
    name: PLAYER_NAMES[i],
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    academicYear: YEARS[i % YEARS.length],
    category: CATEGORIES[i % CATEGORIES.length],
    basePrice: PRICES[(i * 5) % PRICES.length],
    segment,
    status: "upcoming",
    purchasedByClubId: null,
    finalPrice: null,
    createdAt: now,
    updatedAt: now,
  };
}

// /segments/segment-1..5 — roster + CONFIRMED randomized order
for (let n = 1; n <= 5; n += 1) {
  const ids = [];
  for (let i = (n - 1) * 10; i < n * 10; i += 1) {
    ids.push(`demo-player-${String(i + 1).padStart(2, "0")}`);
  }
  updates[`/segments/segment-${n}`] = {
    segmentNumber: n,
    playerIds: ids,
    randomizedOrder: shuffle(ids),
    isOrderConfirmed: true,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Auth + atomic write ──────────────────────────────────────────────────────

const authResponse = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  },
);
if (!authResponse.ok) {
  console.error("Sign-in failed:", await authResponse.text());
  process.exit(1);
}
const { idToken, localId } = await authResponse.json();

// Write per-path (not one root-level PATCH) — the root denies write in these
// rules, and we want failures to identify exactly which path is rejected.
const results = [];
for (const [path, body] of Object.entries(updates)) {
  const url = `${DATABASE_URL}${path.replace("/", "/")}.json?auth=${idToken}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  results.push({ path, ok: res.ok, status: res.status, text: res.ok ? null : await res.text() });
}
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error("Some paths were rejected by the rules:");
  for (const f of failed.slice(0, 5)) {
    console.error(`  ${f.path} -> ${f.status}: ${f.text}`);
  }
  if (failed.length > 5) console.error(`  …and ${failed.length - 5} more`);
  console.error("\nNothing was rolled back automatically — run scripts/remove-demo.mjs first, then retry.");
  process.exit(1);
}

// ── Verify (public reads — root itself is denied by rules, so read per-node) ─

const clubKeys = Object.keys(await fetch(`${DATABASE_URL}/clubs.json?shallow=true`).then((r) => r.json()));
const playerKeys = Object.keys(await fetch(`${DATABASE_URL}/players.json?shallow=true`).then((r) => r.json()));
const segmentKeys = Object.keys(await fetch(`${DATABASE_URL}/segments.json?shallow=true`).then((r) => r.json()));
const settingsCheck = await fetch(`${DATABASE_URL}/settings.json`).then((r) => r.json());

console.log("");
console.log("Demo data seeded (per-path writes — root-level PATCH is denied by the rules).");
console.log(`  admin uid          ${localId}`);
console.log(`  tournament         ${settingsCheck?.tournamentName ?? "(unreadable)"}`);
console.log(`  segments           ${segmentKeys.length} (${segmentKeys.join(", ")}) — orders CONFIRMED`);
console.log(`  clubs              ${clubKeys.length} (demo-club-01…12)`);
console.log(`  players            ${playerKeys.length} (demo-player-01…50)`);
console.log("  segments           5, orders CONFIRMED — ready to start the auction");
console.log("");
console.log("Now: sign in at /admin/login with your admin account → Overview → Start Auction.");
console.log("Remove the demo data:  node --env-file=.env.local --env-file=.env.demo.local scripts/remove-demo.mjs");
