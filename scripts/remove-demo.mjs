/**
 * DEMO TEARDOWN — remove everything scripts/seed-demo.mjs created.
 *
 *   node --env-file=.env.local --env-file=.env.demo.local scripts/remove-demo.mjs
 *
 * What it removes/resets:
 *   1. /history entries whose playerId starts with "demo-player-"  (hard-delete)
 *   2. /clubs/demo-club-*                                         (hard-delete)
 *   3. /players/demo-player-*                                     (hard-delete)
 *   4. /segments/* — strips demo ids from rosters/orders; if ALL segments are
 *      demo-only, deletes the segments node so a fresh init can recreate it
 *   5. /settings — deletes ONLY if it is the seeded demo singleton (marker
 *      check); a real tournament's settings are never touched
 *   6. Anything else is left untouched.
 */

const DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

if (!DATABASE_URL || !API_KEY || !EMAIL || !PASSWORD) {
  console.error(
    "Missing env. Run with:\n  node --env-file=.env.local --env-file=.env.demo.local scripts/remove-demo.mjs",
  );
  process.exit(1);
}

const DEMO_TOURNAMENT_MARKER = "TEST DATA";
const isDemoId = (id) => typeof id === "string" && id.startsWith("demo-");
const isDemoPlayerId = (id) => typeof id === "string" && id.startsWith("demo-player-");

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
const { idToken } = await authResponse.json();

const authedGet = (path) =>
  fetch(`${DATABASE_URL}/${path}.json?auth=${idToken}`).then(async (r) => {
    if (!r.ok) throw new Error(`Read ${path} failed: ${await r.text()}`);
    return r.json();
  });
const authedDelete = async (path) => {
  const r = await fetch(`${DATABASE_URL}/${path}.json?auth=${idToken}`, { method: "DELETE" });
  if (!r.ok) console.error(`  ✗ delete ${path}: ${await r.text()}`);
  return r.ok;
};
const authedPatch = async (path, body) => {
  const r = await fetch(`${DATABASE_URL}/${path}.json?auth=${idToken}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error(`  ✗ patch ${path}: ${await r.text()}`);
  return r.ok;
};

let removedPlayers = 0;
let removedClubs = 0;
let removedHistory = 0;

// 1. History entries referencing demo players
const history = await authedGet("history");
if (history && typeof history === "object") {
  for (const [key, record] of Object.entries(history)) {
    if (record && isDemoPlayerId(record.playerId)) {
      if (await authedDelete(`history/${key}`)) removedHistory += 1;
    }
  }
}

// 2+3. Demo clubs and players
const clubs = await authedGet("clubs");
if (clubs && typeof clubs === "object") {
  for (const key of Object.keys(clubs)) {
    if (isDemoId(key) && (await authedDelete(`clubs/${key}`))) removedClubs += 1;
  }
}
const players = await authedGet("players");
if (players && typeof players === "object") {
  for (const key of Object.keys(players)) {
    if (isDemoId(key) && (await authedDelete(`players/${key}`))) removedPlayers += 1;
  }
}

// 4. Segments — strip demo ids; if every segment is demo-only, drop the node
const segments = await authedGet("segments");
let segmentsReset = 0;
let segmentsDeleted = false;
if (segments && typeof segments === "object") {
  let allKeysDemoLike = true;
  for (const [segmentKey, segment] of Object.entries(segments)) {
    const roster = Array.isArray(segment?.playerIds) ? segment.playerIds : Object.values(segment?.playerIds ?? {});
    const order = Array.isArray(segment?.randomizedOrder) ? segment.randomizedOrder : Object.values(segment?.randomizedOrder ?? {});
    if (!roster.every(isDemoPlayerId)) allKeysDemoLike = false;

    const keptRoster = roster.filter((id) => !isDemoPlayerId(id));
    const keptOrder = order.filter((id) => !isDemoPlayerId(id));
    if (keptRoster.length !== roster.length || keptOrder.length !== order.length) {
      await authedPatch(`segments/${segmentKey}`, {
        playerIds: keptRoster,
        randomizedOrder: keptOrder,
        isOrderConfirmed: keptOrder.length === roster.length ? segment?.isOrderConfirmed ?? false : false,
        isCompleted: false,
        updatedAt: Date.now(),
      });
      segmentsReset += 1;
    }
  }
  if (allKeysDemoLike) {
    segmentsDeleted = await authedDelete("segments");
  }
}

// 5. Settings — only if it is the seeded demo singleton
let settingsDeleted = false;
const settings = await authedGet("settings");
if (settings && typeof settings === "object") {
  if (typeof settings.tournamentName === "string" && settings.tournamentName.includes(DEMO_TOURNAMENT_MARKER)) {
    settingsDeleted = await authedDelete("settings");
  }
}

console.log("");
console.log("Demo teardown complete.");
console.log(`  players removed      ${removedPlayers}`);
console.log(`  clubs removed        ${removedClubs}`);
console.log(`  history removed      ${removedHistory}`);
if (segmentsDeleted) console.log("  segments node        deleted (was demo-only)");
else console.log(`  segments sanitized   ${segmentsReset} (demo ids stripped)`);
if (settingsDeleted) console.log("  settings             deleted (was the demo singleton)");
else console.log("  settings             untouched (not the demo singleton)");
console.log("");
console.log("A real tournament's data, if any, was left untouched.");
