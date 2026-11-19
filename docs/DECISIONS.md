# Decision Log

Lightweight ADRs. Newest first. These capture *why* the architecture is the
way it is — read before changing an approach that looks odd.

## 2026-11-18 — Segment called by name; auctioneer picks the order

**Decision.** The five segments have fixed display names baked into
`SEGMENT_NAMES` (Game Changer · Stroke Maker · Trump Card · Assassin · Young
Blood), in order 1–5. The auctioneer chooses which segment opens the auction,
and after each segment finishes, chooses the next segment from the remaining
ones — the room is not locked to a numeric sequence. The picker lives in the
Admin Live console: pre-start selection grid, and a "Which segment next?"
dialog after each segment is marked complete.

**Why.** The auctioneer runs the physical room and needs to react to the order
the room wants; segment names make the choices legible ("Trump Card next?")
without the auctioneer having to remember which number is which.

**Consequences.** Segments still use numeric keys 1–5 internally (validator,
rules, players' segment field, order grid, seeds) — names are a presentation
layer (`Segment.name`, falls back to constants). The Admin console gates
"Start" on all-5-orders-confirmed and ≥50 players; segment completion clears
the block but never auto-advances — the auctioneer must pick the next
segment (complete-then-pick is two explicit steps, nothing surprising
happens behind their back).

## 2026-11-15 — Public `/live` is a full-screen broadcast route group, not the public site shell

**Decision.** `/live` lives in `(broadcast)` with its own `h-screen` chrome:
no nav, no footer, minimal hover-revealed escape hatch. Typography is Barlow
Condensed (`--font-display`) with a dot-grid/gold-glow background. The page is
read-only and driven purely by RTDB listeners; an unauthenticated visitor sees
current auction state (by design — the broadcast is public).

**Why.** A projector page needs maximum vertical space and zero accidental
touch interactions; the audience site's header/footer would be clutter and a
misclick risk.

**Consequences.** `/live` has no site chrome; both route groups are fine to
evolve independently. Clock is rendered client-only (no SSR `Date()` under
Cache Components). Per-club accent hues are derived from the club name (no
color field in the schema). Honest verification note: only the empty-waiting
state was screenshot-verified (1920×1080); the data-rich states (on-block,
between players, completed) render from the same subscriptions but need a
populated DB — verify in the admin UI test pass.

## 2026-11-15 — Next-player derivation: first 'upcoming' in confirmed order (no position counters)

**Decision.** The live auction never stores "current position". Pointer
(`settings.currentPlayerId`) tracks only who is on the block; advancing derives
the next player as the first \'upcoming\' entry in the segment's confirmed
`randomizedOrder`. Finalizing clears the pointer atomically (in the same
multi-path update as the sale), so there is no window where a player is both
resolved and on the block.

**Why.** Position counters drift (mid-auction edits, crashes, admin refreshes,
unsold re-offers). Deriving from player status keeps the order authoritative
and the pointer self-healing — monotone, refresh-proof, concurrency-safe.

**Consequence.** Unsold players stay 'unsold' — they are NOT re-offered in the
same round. A future "re-offer unsold players" feature would be a new action,
not a change to this rule.

## 2026-11-15 — Admin route protection is a client-side gate; RTDB rules enforce writes only

**Decision.** `/admin/*` (except `/admin/login`) is gated in the browser by
`AdminGate` (subscribes to Firebase Auth, requires /admins/{uid}, else
redirects to login). Authorization for **writes** is fully enforced by the
RTDB rules — an unauthenticated visitor gains zero write access and cannot
read or modify anything the rules forbid.

**Truth about reads:** all auction data (settings, clubs, players, segments,
history) is **public-read** by design — the unauthenticated live broadcast
display depends on it, which is what the product brief requires. The AdminGate
is therefore a UX/navigation barrier only, not a data-secrecy boundary; player
names, departments, budgets and photos are world-readable (they are projected
on a screen in a public hall anyway). Do not put anything into RTDB that isn't
meant to be public.

**Why not server-side route protection.** It would need session cookies + token
verification (Admin SDK + backend routes). Not worth it under the public-read
model; the rules already guarantee write integrity (the thing that actually
matters on auction day).

**Consequences.** `/admin/*` URLs return HTTP 200 with a shell; anyone can
*view* underlying data via RTDB REST calls, nobody can change it. Phase 10
should verify gate behavior in the audit.

## 2026-11-15 — Sale commit: one atomic multi-path update, rules as commit-time enforcers

**Decision.** A sale/unsold is a single root-level `update()` spanning
`players/{id}`, `clubs/{id}`, `history/{pushId}` and `settings/`. Sold-player
immutability is enforced by `.validate` on `players` (not just client
pre-checks), so two concurrent *SOLD* commits on the same player cannot both
win — the loser's whole update aborts atomically. `remainingBudget >= 0` is
likewise rule-enforced.

**Why.** RTDB transactions are single-location; a root transaction would need
root write permission (which would cascade-grant `/admins`). Multi-path
updates are all-or-nothing and keep `.write` scoped per node.

**Residual risk (accepted, documented).** Two *different* players of the same
club finalized in the same instant both compute budgets from a snapshot — the
later absolute write can lose a deduction. Acceptable for a single-operator
live room; rules guarantee budgets never go negative; fix path documented in
docs/DATABASE.md (derive budget from the ledger) if it ever matters.

**Caveat.** The segments post-start rule relies on deep equality of arrays
(`randomizedOrder` unchanged). Verified as documented RTDB semantics but not
executed against an emulator yet — Phase 10 must test it.

## 2026-11-15 — purchasedPlayerIds is `{ [playerId]: true }`, never an array

**Decision.** Squad membership is stored as a keyed map.

**Why.** RTDB serializes JS arrays with integer keys; splicing renumbers all
siblings and corrupts concurrent writes. `squadIds(club)` derives the array in
memory.

## 2026-11-15 — currentPlayerId gates finalization

**Decision.** Only the player at `settings.currentPlayerId` can be sold/unsold
(service-layer check), and every finalization clears the pointer.

**Why.** Prevents "wrong player" sales in a 12-player segment and keeps the
public display consistent on refresh. Advancing to the next player is Phase 7's
job.

## 2026-11-15 — Images: static `/public` assets + build-time manifest (no Storage, no upload)

**Decision.** Player photos and club logos are static files in
`public/images/{players,clubs}`, deployed with the frontend on Vercel. The
admin picks an image from a picker grid generated from a build-time manifest
(`src/generated/image-manifest.json`) rather than uploading files. RTDB stores
plain public paths (`/images/players/foo.jpg`) in `photoUrl`/`logoUrl`.

**Why.**
- Firebase Cloud Storage now requires the Blaze (pay-as-you-go) plan for new
  projects — effectively free at this scale, but requires a credit/debit card,
  which is unavailable/undesirable for this project.
- The roster and photos are finalized *before* auction day, so runtime upload
  is not needed. Static assets on Vercel's CDN are fast for a projector and
  cost nothing.
- Google Drive hotlinks: rate limits, no write-access rules, fragile for a
  live event. Rejected.
- Cloudinary / Supabase Storage remain the documented fallback if images ever
  need to be added/changed *after* deployment (see below).

**Consequences.**
- Adding or replacing an image **requires a redeploy** (`git push` → Vercel,
  or `vercel --prod`). Not possible to change photos on auction day without a
  redeploy.
- The image picker only shows files present at build time; running
  `npm run prebuild` (or the `predev`/`prebuild` hooks) regenerates the
  manifest.
- Images in `public/` are publicly accessible — acceptable because the public
  display page shows the photos anyway. Keep the git repo private if desired.
- Sizing guidance: resize photos to ~800px wide, ≤ ~150 KB each (~72 images
  ≈ 10–11 MB). Filenames are not semantically linked to players — the admin
  selects visually. Use human-readable slugs (`rakib-hasan.jpg`).
- Escape hatch: `photoUrl`/`logoUrl` accept any string, so an externally
  hosted URL (Cloudinary/Drive) can be saved directly in the Firebase console
  in an emergency, and `next/image` is pre-configured
  (`res.cloudinary.com`, `**.googleusercontent.com`) for those hosts.

## 2026-11-15 — Admin authorization: `/admins/{uid}` allow-list enforced by RTDB rules

**Decision.** Admins are allow-listed by UID under `/admins/{uid}` in the
Realtime Database. Client-side checks (`checkIsAdmin`) hide UI; **the actual
enforcement is in `database.rules.json`** — every write requires
`root.child('admins').child(auth.uid).exists()`. The `admins` node is
write-disabled from all clients (managed via Firebase console / Admin SDK).

**Why.** RTDB has no custom-claims-from-client path; allow-list in RTDB +
rules is the simplest enforceable model without a backend. Prevents privilege
escalation from the client.

**Consequences.** Bootstrapping the first admin is manual (console). Phase
3/10 may add a small seed script.

## 2026-11-14 — Stack: Next.js App Router + Firebase RTDB (not Firestore)

**Decision.** Realtime Database (not Firestore) because the auction display
is a single high-fanout read stream with simple denormalized shapes;
`runTransaction` + multi-location updates give the atomic sale guarantee the
live auction depends on. Zustand/Redux deliberately avoided — Firebase
`onValue` listeners are the state layer.

## 2026-11-14 — Auction integrity over cosmetics

**Decision.** Final priority (from the product brief): reliability and
correctness of auction transactions > visual effects. Concretely: all budget
mutations go through a single transactional purchase routine; the public
display never writes; admin routes get gated in Phase 3; the transaction
integrity comes from multi-path atomic commits, not from locking.

## 2026-11-17 — Admin "Reset auction" wipes everything, anytime

**Decision.** The admin "Reset auction" button (Settings → Danger zone) wipes
everything — players back to `upcoming`, clubs to full budget, segments
unconfirmed/uncompleted, settings to `not_started`, **and deletes history** — regardless
of `auctionStatus`. The earlier rule-based lifecycle gating (not_started-only
rewrites, history immutable for admins) was removed specifically because the
auctioneer wanted to be able to re-run the whole auction at any time.

**Why.** This is the admin's own tournament — they asked for a full reset
after a dry run, at any time, with no obstacle. The reset must therefore work
while the auction is live, paused or completed, and clear the ledger so
statistics read clean. The typed "RESET" confirmation + the atomic, single-commit
multi-location update is the safeguard against accidents.

**Consequences.** The ledger is not append-only; sold-player records are
mutable by admins; clubs and segments can be rewritten anytime. Accidental
clicks are the only protection. If you want immutability back, reapply the
gating in `database.rules.json` (see docs/DATABASE.md) and redeploy.