# Database Architecture — BUPL Cricket Auction

Firebase Realtime Database. This document is the source of truth for the schema,
the integrity model, and how to operate the database. Read it before changing
`purchase.ts`, `database.rules.json`, or any service module.

## Tree layout

```
/ (root)
├── settings/                  # singleton — auction state machine
│     tournamentName: string
│     totalSegments: number          (1..10, = 5 for this tournament)
│     currentSegment: number         (1-based)
│     auctionStatus: "not_started" | "live" | "paused" | "completed"
│     currentPlayerId: string | null (deleted when no player is on the block)
│     updatedAt: number              (ms)
│
├── admins/{uid}/              # write-only-via-console/Admin SDK allow-list
│     email: string
│     role: "superadmin" | "admin"
│     createdAt: number
│
├── clubs/{clubId}/
│     name: string
│     logoUrl?: string               (path under /public/images/clubs or a URL)
│     initialBudget: number
│     remainingBudget: number        (>= 0, <= initialBudget)
│     totalPlayersPurchased: number
│     purchasedPlayerIds: { [playerId]: true }   # map, NOT an array
│     createdAt: number   updatedAt: number
│
├── players/{playerId}/
│     name: string
│     photoUrl?/department?/academicYear?/category?: string
│     basePrice: number              (>= 0)
│     segment: number                (1..totalSegments)
│     status: "upcoming" | "current" | "sold" | "unsold"
│     purchasedByClubId: string | null
│     finalPrice: number | null
│     createdAt: number   updatedAt: number
│
├── segments/segment-{n}/      # n = 1..5
│     segmentNumber: number
│     playerIds: string[]            (roster — the 10 players of the segment)
│     randomizedOrder: string[]      (confirmed auction sequence, positions 1..12)
│     isOrderConfirmed: boolean      (locked once the auction starts)
│     isCompleted: boolean
│     createdAt: number   updatedAt: number
│
└── history/{pushId}/          # append-only ledger
      playerId, playerName, clubId?, clubName?, finalPrice?, segment,
      action: "sold" | "unsold", adminUid, timestamp
```

## Design decisions

### 1. Denormalization on purpose
History records carry `playerName`, `clubName`, `segment` so the public ledger
and statistics render from a single listener without joins. Player/club records
are the editable source; history is immutable.

### 2. purchasedPlayerIds is a map, not an array
RTDB stores JS arrays as objects with sequential keys; splicing one out
renumbers everything and breaks concurrent writes. `{ [playerId]: true }` adds
and removes by key with no side effects. Use `squadIds(club)` to list them.

### 3. Counter budgets with an atomic sale commit
`remainingBudget` and `totalPlayersPurchased` are maintained counters (fast
listeners, exactly what a projector scoreboard wants). The sale is committed as
ONE multi-path `update()` at the root containing player + club + history +
settings. It is all-or-nothing — no partial sales.

**Double-sell protection lives in the rules, evaluated atomically at commit:**
`players/$id` validation refuses any transition out of `status: "sold"` unless
the club and price are unchanged. Two admins clicking *SOLD* on the same player
cannot both win — the second commit fails and its entire update aborts (no
history record, no budget deducted). This is why `.validate`
(not just `.write`) guards players.

**Known residual risk (documented, accepted):** two admins finalizing two
*different* players *of the same club* in the same instant both compute
`remainingBudget` from a snapshot and the later write wins — a deduction could
be lost. Mitigations: (a) the auction runs single-operator by design;
(b) the UI disables controls while a commit is in flight; (c) `remainingBudget >= 0`
is enforced by rules, so it can never go negative. If this ever matters, switch
to deriving budget from the history ledger (no counters to race) — a contained
change in `purchase.ts` + `clubs.ts` + the scoreboard listener.

### 4. auctionStatus is the lifecycle gate
Rules read `/settings/auctionStatus` directly for destructive operations:
- players deletable only when `not_started` and not sold,
- clubs deletable only when `not_started` with zero purchases,
- segment order/roster/number locked after `not_started` (only `isCompleted`
  may flip — via deep-equality rule; see "Caveats").

### 5. currentPlayerId drives "who is on the block"
Only the player at `settings.currentPlayerId` can be finalized (service-layer
check). "Next player" advances this pointer (Phase 7). Refreshing mid-auction
loses nothing.

## Security rules

`database.rules.json` — deploy with `firebase deploy --only database` (or paste
into Console → Realtime Database → Rules).

- Public: **read-only** on settings/clubs/players/segments/history.
- Admins (`/admins/{uid}` exists): writes on those paths, subject to validation.
- `admins`: each signed-in user may read **only their own** `/admins/{uid}` entry; **never** writable from clients. The allow-list itself is not publicly enumerable.
- Everything else: denied.
- Sold-player records, purchased clubs and segment order/roster: no longer protected by
  `auctionStatus` gating in the write rule. This was deliberately relaxed so the admin
  "Reset auction" action works even mid-event. Deleting data is still denied (`newData.exists()` required for
  settings/clubs/players/segments).
- History: admins may create or delete at any time (`.write`: admin-only, no status gate). This is deliberate — it enables "Reset auction" to work even mid-event. Creation is still validated. If you want an immutable ledger back, change `history/$historyId/.write` to require `!data.exists()` and redeploy.

### Operational notes
- **Public-read is intentional** (the unauthenticated live display depends on
  it). Do not store private data in RTDB.
- Anyone can create a Firebase Auth account for this project, but a random
  account passes no write rule and can only read the public data plus their
  own (nonexistent) admin entry. Consider enabling *Email enumeration
  protection* in Console → Authentication → Settings as extra hardening.
- The AdminGate (UI) is a UX barrier, not an authorization boundary — see
  DECISIONS.md. Authorization = these rules.

### Caveats
- The segments post-start rule relies on **deep equality of arrays**
  (`newData.child('randomizedOrder').val() === data.child('randomizedOrder').val()`).
  This is the documented RTDB semantics for `===`, but it must be exercised in
  Phase 10's emulator/audit pass; if the deployed rules engine rejects it, the
  rule fails *closed* (segment writes blocked post-start) and needs revisiting.
- Rules were not executed against an emulator during Phase 2 (no Java runtime
  available). Phase 10 must run the emulator suite.

## Bootstrap (first-time setup)

1. Create Firebase project, enable Realtime Database + Email/Password Auth.
2. Create the admin user: Authentication → Users → Add user.
3. Allow-list them: Realtime Database → `/admins/{uid}` with
   `{ "email": ..., "role": "superadmin", "createdAt": <ms> }`.
4. Deploy rules: `firebase deploy --only database`.
5. In the app (Phase 3): Settings → "Initialize database" calls
   `ensureTournamentDefaults()` (creates `/settings` + the 5 empty segments).
   Until then the app shows an empty state.

## Integrity rules cheat-sheet

| Invariant | Enforced by |
|---|---|
| Sold is terminal; buyer & price immutable after sale | `.validate` on players |
| remainingBudget ∈ [0, initialBudget] | `.validate` on clubs |
| finalPrice ≥ basePrice | `.validate` on players |
| Segment ∈ [1, totalSegments] | `.validate` on players/segments |
| Admin absolute control | `.write` admin allow-list everywhere; no lifecycle gate, no sold-immutability gate |
| Deletes only pre-auction & with no purchases | `.write` on players/clubs |
| Segment order/roster locked post-start | `.write` on segments |
| Admins only via allow-list | every write checks `/admins/{uid}` |
