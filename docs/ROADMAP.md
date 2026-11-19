# Roadmap — BUPL Cricket Auction

Annotated version of the 10-phase brief. Amendments from the decisions in
[DECISIONS.md](DECISIONS.md) are marked **(Amended 2026-11-15)**.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project foundation & architecture | ✅ Done |
| 2 | Firebase DB architecture, services, rules, auth | ✅ Done |
| 3 | Admin auth + dashboard layout + overview | ✅ Done |
| 4 | Clubs management | ✅ Done — logo = pick from manifest (Amended) |
| 5 | Players management + CSV import | ✅ Done — photo = pick from manifest (Amended) |
| 6 | Segment randomization | ✅ Done |
| 7 | Live auction admin panel (atomic transactions) | ✅ Done |
| 8 | Public live broadcast display | ✅ Done |
| 9 | Squads, history, statistics | ✅ Done |
| 10 | Testing, security audit, Vercel deployment | Pending |

## Amendment: image handling (Phases 4 & 5)

Original brief: *"Upload player photographs"*, *"Upload or provide a club logo"*.

**Amended behavior:**
- No upload mechanism is built. Images are static files supplied before the
  event; the admin **selects** one from a thumbnail picker in the create/edit
  form (sourced from `src/generated/image-manifest.json` via
  `src/lib/images.ts`).
- The picker shows `public/images/players/*` (or `clubs/`) thumbnails; the
  chosen public path is stored in `photoUrl`/`logoUrl`.
- "Clear selection" returns the field to unset. An (advanced) free-text field
  may remain so an externally hosted URL can be pasted in an emergency — not
  a file upload.
- CSV import references image paths/filenames validated against the manifest;
  unknown filenames are reported as row errors.

Everything else in the brief stands unchanged.

## Amendment: tournament format change (2026-11-18)

The format changed from 5 × 12 players / up to 12 clubs to **5 segments × 10
players = 50 players, 10 clubs**. The 10 real BRAC University clubs (with their
registered abbreviations) are seeded via `scripts/seed-clubs.mjs` — idempotent,
name-matched. Player CSV import, rosters, pickers, rules and all validators use
`PLAYERS_PER_SEGMENT` / `TOTAL_PLAYERS` from `src/lib/constants.ts`, so the
entire app adjusted from one source.

## Amendment: named segments + auctioneer-chosen order (2026-11-18)

Segments now carry display names — **Game Changer · Stroke Maker · Trump Card
· Assassin · Young Blood** — and the auctioneer decides the order the room
wants, both at the opening and between segments. The Admin Live console has a
segment picker before the start and a "Which segment next?" dialog after each
segment completes. Names are a presentation layer over the numeric segment
keys (validation, seeds, and the database rules are unchanged). The
`settings` rule no longer permits deleting the tournament settings even by an
authenticated admin (the teardown script in Phase 10 caught that).

## Operating procedure notes (for auction day)

1. Before the event: resize/name all images, drop into `public/images/...`,
   commit, and deploy. Verify the manifest logged the expected counts in the
   Vercel build output (`image-manifest: N player images …`).
2. Adding/replacing an image during the event → commit + redeploy only. RTDB
   paths must be updated correspondingly.
3. If a photo is genuinely missing on the day: paste any hosted URL into the
   Firebase console for that player (`photoUrl`) — no redeploy needed.
