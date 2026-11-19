# BUPL Cricket Auction

Real-time cricket player auction management and public broadcast display for the BUPL university tournament. Admins record physical auction results; the public display updates live on the projector.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Firebase Realtime Database · Firebase Authentication · Static image assets on Vercel · Lucide icons

## Auction format

- 10 clubs (each with an initial ৳100,000 budget, editable in Admin → Clubs)
- 5 segments × 10 players = 50 players, base price per player
- Player order within each segment is randomized and confirmed by the admin before the auction starts
- No online bidding — the admin records finalized, in-room results
- Public audience sees a read-only live display; admins sign in at `/admin`

## Project structure

```
src/
├── app/
│   ├── (public)/              # Public, read-only — header/footer shell
│   │   ├── page.tsx           # Home
│   │   ├── live/              # Live broadcast display (Phase 8) — own full-screen chrome
│   │   ├── squads/            # Squads grid + [clubId] detail (Phase 9)
│   │   ├── history/           # Official ledger (Phase 9)
│   │   └── stats/             # Final statistics (Phase 9)
│   ├── admin/
│   │   ├── login/             # Admin sign-in; redirects to /admin/overview when authed
│   │   ├── page.tsx           # Redirects to /admin/overview
│   │   └── (dashboard)/       # Authenticated area — sidebar shell
│   │       ├── overview|clubs|players|segments|live|history|settings/   # overview & clubs are live; rest scaffold
│   ├── layout.tsx             # Root: fonts, metadata, toaster
│   └── globals.css
├── components/
│   ├── admin/                 # AdminGate (route protection), AdminShell, AdminSidebar
│   ├── brand/                 # Logo
│   ├── common/                # PageHeader, PlaceholderPanel, StatCard, AuctionStatusBadge
│   ├── layout/                # SiteHeader, SiteFooter
│   └── ui/                    # shadcn/ui primitives
├── generated/
│   └── image-manifest.json    # AUTO-GENERATED (predev/prebuild) — do not edit
├── lib/
│   ├── firebase/              # Service layer — see docs/DATABASE.md
│   │   ├── config.ts          # Lazy init (client SDK) + emulator support
│   │   ├── database.ts        # Low-level refs/listeners; no entity logic
│   │   ├── converters.ts      # RTDB snapshots ↔ domain types (defensive)
│   │   ├── settings.ts        # Auction state machine (singleton)
│   │   ├── clubs.ts           # Club CRUD + invariant enforcement
│   │   ├── players.ts         # Player CRUD + CSV batch payload builder
│   │   ├── segments.ts        # Rosters, order confirmation, completion
│   │   ├── history.ts         # Append-only ledger listener
│   │   ├── purchase.ts        # THE atomic sale/unsold commit (multi-path update)
│   │   ├── auth.ts            # Sign-in + /admins allow-list checks
│   │   └── index.ts           # Barrel export
│   ├── images.ts              # Typed access to the static image manifest
│   ├── constants.ts           # SEGMENT_COUNT, paths, currency
│   ├── format.ts              # price/timestamp formatting
│   └── utils.ts               # cn()
└── types/                     # Domain models mirroring the RTDB schema

public/images/{players,clubs}/ # Static player photos & club logos (deployed with app)
scripts/generate-image-manifest.mjs
docs/                          # DECISIONS.md (ADRs), ROADMAP.md (phases), DATABASE.md (schema + integrity model)
```

Architecture rules: **all** Firebase access goes through `src/lib/firebase/*` — components never import the Firebase SDK directly. Shared UI lives in `components/`, domain models in `types/`.

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the Firebase project

1. [Firebase Console](https://console.firebase.google.com) → Add project.
2. Enable **Realtime Database** (start in *locked mode* — rules are in this repo).
3. Enable **Authentication** → Sign-in method → Email/Password.
4. Project Settings → Your apps → Web app → copy the SDK config values.

No Firebase Storage bucket is needed — images are static assets in `public/images/` (see "Player & club images" below).

### 3. Configure environment

```bash
cp .env.local.example .env.local
# fill NEXT_PUBLIC_FIREBASE_* values from the web app config
```

`.env.local` is gitignored — never commit real keys. The `NEXT_PUBLIC_*` values ship to the browser by design; security is enforced by RTDB rules + Auth, not by hiding the config.

### 4. Grant admin access

Admins are allow-listed by UID in `/admins`. After creating an admin user in Firebase Auth (Authentication → Users → Add user), write their entry to the database:

```json
// /admins/{uid}
{ "uid": "<uid>", "email": "admin@example.com", "role": "superadmin", "createdAt": 0 }
```

Add this entry manually via the Firebase console for now; an admin-management script lands in a later phase. RTDB rules enforce `root.child('admins').child(auth.uid).exists()` on every write.

### 5. Deploy database rules

```bash
firebase deploy --only database
```

### 6. Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

## Player & club images

Images are **static files deployed with the frontend** — no Firebase Storage or Blaze plan required.

1. Prepare images: resize photos to ~800px wide, ≤ ~150 KB each (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`). Use human-readable slugs, e.g. `rakib-hasan.jpg`.
2. Drop them into `public/images/players/` or `public/images/clubs/`.
3. The manifest regenerates automatically on `npm run dev` / `npm run build` (via the `predev`/`prebuild` hooks → `scripts/generate-image-manifest.mjs`). You can also run `node scripts/generate-image-manifest.mjs` directly.
4. In the admin create/edit forms (Phases 4 & 5), the image field is a **thumbnail picker** fed by `src/lib/images.ts` — the selected public path (`/images/players/rakib.jpg`) is stored in RTDB.
5. To add/replace images after deploying: commit the new files and redeploy. A redeploy is the only way to change `public/` contents.

Notes:
- Manifest check on Vercel: the build log prints `image-manifest: N player images, M club images` — verify the counts.
- The images are publicly accessible by URL; that's inherent to a public display page. Keep the git repo private if desired — Vercel deploys fine from private repos.
- Emergency path: if a photo is missing on the day, paste any externally hosted URL directly into that player's `photoUrl` in the Firebase console — no redeploy needed.
- Why not Firebase Storage / Drive / Cloudinary? See [docs/DECISIONS.md](docs/DECISIONS.md).

## Demo / test data

The RTDB can be seeded with clearly-marked dummy data (demo-club-*, demo-player-*,
demo tournament singleton) to try the auction loop end-to-end. Teardown removes
exactly what the seed created and leaves anything else untouched.

```bash
node --env-file=.env.local --env-file=.env.demo.local scripts/seed-demo.mjs
node --env-file=.env.local --env-file=.env.demo.local scripts/remove-demo.mjs
```

`.env.demo.local` holds the demo Firebase Auth credentials and is gitignored
(`.env*`). Do not commit it. Note: the database ruleset denies root-level PATCH,
but per-path writes work; the seed script writes per-path for this reason.

## Development roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the annotated roadmap (Phases 4 & 5 amended to use static image selection). Schema and integrity model: [docs/DATABASE.md](docs/DATABASE.md). Phases 1–9 ✅ · Phase 10 pending.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project foundation & architecture | ✅ Done |
| 2 | Firebase DB architecture, services, rules, auth | ✅ Done |
| 3 | Admin auth + dashboard layout + overview | ✅ Done |
| 4 | Clubs management (logo = picker) | ✅ Done |
| 5 | Players management + CSV import (photo = picker) | ✅ Done |
| 6 | Segment randomization | ✅ Done |
| 7 | Live auction admin panel (atomic transactions) | ✅ Done |
| 8 | Public live broadcast display | ✅ Done |
| 9 | Squads, history, statistics | ✅ Done |
| 10 | Testing, security audit, Vercel deployment | Pending |

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | RTDB URL (`https://<project>-default-rtdb.<region>.firebasedatabase.app`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Currently unused (images are static assets); kept for a future Storage fallback |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional Analytics measurement ID (reserved for future use) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app ID |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | `true` to use the local emulator suite (ports 9099/9000/9199) |

## Notes

- Currency symbol lives in `CURRENCY_SYMBOL` in `src/lib/constants.ts` (defaults to ৳).
- The public pages are intentionally read-only; admin writes are only possible from authenticated, allow-listed admins, enforced by `database.rules.json`.
- Architectural decisions and their rationale: [docs/DECISIONS.md](docs/DECISIONS.md).
- Database schema, integrity model and bootstrap steps: [docs/DATABASE.md](docs/DATABASE.md).
