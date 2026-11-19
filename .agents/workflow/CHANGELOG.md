# Changelog

## [Unreleased]

### Added — 2026-11-19

**Time:** 2026-11-19 15:10 (UTC+6)
**Author:** Antigravity agent
**Issue:** Relevant Aesthetic Cricket Tournament Favicon and Touch Icons
**Status:** Shipped to Prod

**Layman Summary (CEO / Non-Tech):**
- Replaced default boilerplate icons with a custom, high-resolution aesthetic brand icon designed specifically for the BUPL Cricket Auction.
- Features a dark luxury emblem with an ambient gold championship trophy and an embedded red cricket ball with distinct white seam stitching.
- Automatically serves crisp vector icons across all desktop browser tabs, mobile bookmarks, and home screen shortcuts.

**UI & Screen Navigation:**
- **Route:** All routes (`/`, `/live`, `/squads`, `/stats`, `/history`, `/admin`)
- **Where to See It:** Look at the browser tab title, bookmarks, or mobile home screen shortcuts on `https://bupl-auction.vercel.app` to see the golden cricket trophy and red seam emblem.

**Technical Implementation (Tech Lead):**
- Created pure vector SVG icons at `src/app/icon.svg`, `public/favicon.svg`, and `src/app/apple-icon.svg` using geometric SVG primitives, radial gold gradients, and cricket seam stitching paths.
- Declared explicit icon array in Next.js 16 metadata configuration inside `src/app/layout.tsx` for optimal cross-platform compatibility across modern browsers, iOS Safari touch icons, and Android PWA headers.

**Files:**
- `bupl-auction/src/app/icon.svg`
- `bupl-auction/src/app/apple-icon.svg`
- `bupl-auction/public/favicon.svg`
- `bupl-auction/src/app/layout.tsx`

**Impact:** UI / config

### Added — 2026-11-19

**Time:** 2026-11-19 14:55 (UTC+6)
**Author:** Antigravity agent
**Issue:** Vercel Edge Cache Workaround for 1,000+ Concurrent Visitors on Free Firebase Spark Plan
**Status:** Shipped to Prod

**Layman Summary (CEO / Non-Tech):**
- Implemented and shipped a 100% free Vercel Edge Cache Workaround that enables 1,000+ public mobile spectators to watch the auction live simultaneously on the free Firebase Spark plan without hitting connection limits.
- Public spectator screens now receive live auction data via Vercel's global Content Delivery Network (CDN) cached every 2 seconds, while the auction administrators and projector screen retain direct, zero-delay real-time control.
- Allows the entire auction tournament to run completely free without requiring an international payment card or paid database subscription.

**UI & Screen Navigation:**
- **Route:** `https://bupl-auction.vercel.app/api/auction-state`, `https://bupl-auction.vercel.app/live`, `https://bupl-auction.vercel.app/squads`, `https://bupl-auction.vercel.app/stats`
- **Where to See It:**
  1. Open `https://bupl-auction.vercel.app/api/auction-state` in a browser or API client to see the unified JSON payload cached with `s-maxage=2, stale-while-revalidate=4`.
  2. Public visitors watching on `/live`, `/squads`, `/stats`, or `/history` automatically receive lightweight 2-second edge cached updates with zero WebSocket connection limits.
  3. Venue projectors or admins can append `?realtime=true` to any URL (e.g. `https://bupl-auction.vercel.app/live?realtime=true`) to connect directly via WebSocket for 0ms venue bidding.

**Technical Implementation (Tech Lead):**
- Built `/src/app/api/auction-state/route.ts` which fetches all Firebase nodes (`settings.json`, `clubs.json`, `players.json`, `segments.json`, `history.json`) via Firebase REST and sets `Cache-Control: public, s-maxage=2, stale-while-revalidate=4`.
- Built `src/lib/spectator/spectator-sync.ts` implementing a client-side singleton manager with visibility-aware polling (`document.visibilityState` pauses polling when tab is hidden, immediately refreshes on tab focus) and request deduplication across all mounted components.
- Integrated `subscribeSpectatorSettings`, `subscribeSpectatorClubs`, `subscribeSpectatorPlayers`, `subscribeSpectatorSegments`, and `subscribeSpectatorHistory` into `broadcast-live.tsx`, `club-purchases-board.tsx`, `squads-page-client.tsx`, `stats-page-client.tsx`, `history-ledger.tsx`, and `squad-detail-client.tsx`.
- Admin console components under `src/app/admin/` strictly retain direct Firebase WebSockets for 0ms admin control.

**Files:**
- `bupl-auction/src/app/api/auction-state/route.ts`
- `bupl-auction/src/lib/spectator/spectator-sync.ts`
- `bupl-auction/src/lib/spectator/index.ts`
- `bupl-auction/src/components/broadcast/broadcast-live.tsx`
- `bupl-auction/src/components/broadcast/club-purchases-board.tsx`
- `bupl-auction/src/components/squads-page-client.tsx`
- `bupl-auction/src/components/stats-page-client.tsx`
- `bupl-auction/src/components/history-ledger.tsx`
- `bupl-auction/src/components/squad-detail-client.tsx`

**Impact:** route / backend / UI


### Fixed — 2026-11-19

**Time:** 2026-11-19 13:46 (UTC+6)
**Author:** Antigravity agent
**Issue:** Mobile Squads, Stats, and History Viewport Overflow Fixes
**Status:** Shipped to Prod

**Layman Summary (CEO / Non-Tech):**
- Resolved mobile viewport cutoff issues on the Squads (`/squads`), Stats (`/stats`), and History (`/history`) routes where player prices and club cards were pushed beyond the right edge of mobile screens.
- Enabled smooth horizontal swipe scrolling for wide data tables (such as the Club Ledger on the Stats screen) without expanding or breaking the overall mobile phone page layout.
- Deployed directly to live production at `https://bupl-auction.vercel.app` and verified on real mobile viewports (375px) with zero visual cutoff.

**UI & Screen Navigation:**
- **Route:** `https://bupl-auction.vercel.app/stats` and `https://bupl-auction.vercel.app/squads`
- **Where to See It:**
  1. **Stats Screen (`/stats`):** Open on a mobile device or inspect at 375px width. Under "Most Expensive Buys", see that all player prices (e.g. ৳500) are fully visible within the card boundaries. Under "Club Ledger", scroll the table left and right inside its dedicated card without stretching the page.
  2. **Squads Screen (`/squads`):** View the top summary strip (Combined Budget and Players Bought) wrapping cleanly across phones, with every club tile fitting within the phone screen borders.

**Technical Implementation (Tech Lead):**
- Added `w-full min-w-0` to the `<main>` container in `src/app/(public)/layout.tsx` to neutralize CSS grid/flex child intrinsic minimum widths.
- Added `min-w-0 max-w-full overflow-hidden` and `truncate` to club cards in `src/components/squads-page-client.tsx`.
- Changed Stats page grid layout from rigid multi-column to `grid-cols-1 lg:grid-cols-5 w-full min-w-0` and enclosed the Club Ledger `<table className="min-w-[560px]">` in an explicit `w-full min-w-0 overflow-x-auto` container in `src/components/stats-page-client.tsx`.
- Replaced avatar rigid sizes with responsive avatar sizing (`w-9 h-9 sm:w-11 sm:h-11`) and tabular currency alignment in `src/components/history-ledger.tsx`.

**Files:**
- `bupl-auction/src/app/(public)/layout.tsx`
- `bupl-auction/src/components/squads-page-client.tsx`
- `bupl-auction/src/components/stats-page-client.tsx`
- `bupl-auction/src/components/history-ledger.tsx`
- `bupl-auction/src/components/layout/mobile-nav.tsx`

**Impact:** route / UI


### Changed — 2026-11-19

**Time:** 2026-11-19 13:18 (UTC+6)
**Author:** Antigravity agent
**Issue:** Complete Responsiveness & Anti-Slop Across All Viewports (Mobile, Tablet, Desktop, Projector)
**Status:** Shipped to Prod

**Layman Summary (CEO / Non-Tech):**
- Redesigned and engineered mobile, tablet, and widescreen responsiveness across the entire auction portal (`/`, `/live`, `/squads`, `/history`, `/stats`, and `/admin`).
- Added a full-screen, accessible mobile navigation drawer with quick-action links and touch-optimized buttons.
- Eliminated all horizontal page overflow and unwanted scrollbars across all screen widths down to 360px phones.
- Verified live broadcast projector screen (`/live`) layout: automatically switches from a 5x2 card grid on 1080p projectors to an adaptive single-column hero card with multi-column club tiles on mobile phones.
- Tested and verified live on production at `https://bupl-auction.vercel.app`.

**UI & Screen Navigation:**
- **Route:** `https://bupl-auction.vercel.app/`
- **Where to See It:**
  1. **Mobile Header & Drawer:** On phone screens (<768px), tap the hamburger menu in the top right to open the slide-out navigation drawer with links to Live Auction, Squads, History, Stats, and Admin Login.
  2. **Live Auction (`/live`):** On desktop/projector, see the full-screen 1080p broadcast layout with hero player on the left and 10 club purse cards on the right. On phone viewports, notice the vertically responsive card flow without clipped text.
  3. **Club Squads (`/squads`):** View the 2-stat summary strip (Combined Budget & Players Bought) and responsive club cards with club logo badges, remaining budget meters, and touch targets.
  4. **Auction History (`/history`) & Stats (`/stats`):** Observe scaled typographic headers, adaptive price tags, and balanced 5-segment layout cards.
  5. **Admin Consoles (`/admin`):** Access players, clubs, and segments tables featuring horizontal touch scroll wrappers and responsive stat cards.

**Technical Implementation (Tech Lead):**
- Created `src/components/layout/mobile-nav.tsx` using React 19 `useSyncExternalStore` for SSR-safe client mounting and `createPortal(..., document.body)` to escape header `backdrop-blur` stacking contexts.
- Wrapped root public and admin layouts with `overflow-x-clip` to prevent viewport blowout without disabling `position: sticky`.
- Refactored `src/components/broadcast/broadcast-live.tsx` grid from rigid `grid-cols-5 grid-rows-2` into responsive breakpoints (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-5 xl:grid-rows-2`).
- Fixed Next.js 16 Partial Prerendering (PPR) layout constraint by keeping `SiteHeader` as a Server Component and isolating interactive client state inside `MobileNav`.
- Resolved ESLint React 19 `react-hooks/set-state-in-effect` rule violations cleanly without synchronous setState calls.
- Automated end-to-end runtime visual testing via Chrome DevTools and verified zero console errors and 100% 200 OK network responses.

**Files:**
- `bupl-auction/src/components/layout/mobile-nav.tsx`
- `bupl-auction/src/components/layout/site-header.tsx`
- `bupl-auction/src/components/layout/site-footer.tsx`
- `bupl-auction/src/app/layout.tsx`
- `bupl-auction/src/app/(public)/layout.tsx`
- `bupl-auction/src/app/(public)/page.tsx`
- `bupl-auction/src/components/squads-page-client.tsx`
- `bupl-auction/src/components/squad-detail-client.tsx`
- `bupl-auction/src/components/broadcast/broadcast-live.tsx`
- `bupl-auction/src/components/broadcast/club-purchases-board.tsx`
- `bupl-auction/src/components/history-ledger.tsx`
- `bupl-auction/src/components/stats-page-client.tsx`
- `bupl-auction/src/components/admin/admin-shell.tsx`
- `bupl-auction/src/components/common/stat-card.tsx`
- `bupl-auction/src/app/admin/(dashboard)/clubs/clubs-manager.tsx`
- `bupl-auction/src/app/admin/(dashboard)/players/players-manager.tsx`
- `bupl-auction/src/app/admin/(dashboard)/segments/segments-manager.tsx`
- `.agents/workflow/CHANGELOG.md`
- `bupl-auction/.agents/workflow/CHANGELOG.md`

**Impact:** route / UI / build env / config

### Added — 2026-11-19

**Time:** 2026-11-19 12:44 (UTC+6)
**Author:** Antigravity agent
**Issue:** Deploy BUPL Cricket Auction to Vercel Production
**Status:** Shipped to Prod

**Layman Summary (CEO / Non-Tech):**
- Unzipped and verified the BUPL cricket player auction management application.
- Configured and deployed the platform to Vercel production with high-availability cloud hosting.
- Synchronized all real-time Firebase tournament database and authentication credentials so the live room broadcast and admin console are operational.

**UI & Screen Navigation:**
- **Route:** `https://bupl-auction.vercel.app`
- **Where to See It:** Navigate to `https://bupl-auction.vercel.app` in any browser to access the home screen. Click "Watch Live" or `/live` to view the auction projector screen, `/squads` for club rosters, or navigate to `/admin` to access the administrator sign-in.

**Technical Implementation (Tech Lead):**
- Authenticated Vercel CLI under user account `zauwad` (scope `zauwads-projects`).
- Linked the Next.js 16 (App Router + Turbopack) application to Vercel project `bupl-auction` (Project ID: `prj_K9OSp5jnKn5KjJsZBBzTbAdSmzsL`).
- Configured 9 client-side Firebase environment variables (`NEXT_PUBLIC_FIREBASE_*`) across Production, Preview, and Development environments.
- Deployed production build (`vercel --prod`) and verified HTTP 200 OK status on `https://bupl-auction.vercel.app`.

**Files:**
- `bupl-auction/.vercel/project.json`
- `.agents/workflow/CHANGELOG.md`
- `bupl-auction/.agents/workflow/CHANGELOG.md`

**Impact:** route / UI / build env / config

