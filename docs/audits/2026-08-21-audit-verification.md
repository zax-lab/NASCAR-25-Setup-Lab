# NASCAR 25 Setup Lab — Audit Verification

**What this is:** an independent check of the claims in `docs/audits/2026-08-21-full-site-audit.md` against the actual source, before any code is changed.
**Verified against:** the current repository `main`, commit `70edad0` ("Match the complete Version 8 source tree"). The original audit was written against **Version 7 + an unpublished working copy**, so part of the job is noting where the current tree differs.
**Method:** direct source reading of the store, stats, domain, screens, service worker, CSS, and config; running the pure-logic test suite; structural cross-checks (grep) for absence claims. The full Cloudflare Sites (`vinext`) build was not run in this environment; where a claim depends on the built artifact or the hosting console, that is stated.

## Verdict at a glance

| # | Finding | Verdict | Core evidence |
|---|---|---|---|
| P1.1 | New race silently converts the current session | **Confirmed** | `race-log.tsx` sends `sessionId: null`; `store.js recordRaceResult` falls back to `currentSessionId` and overwrites it with `sessionType:"race"` |
| P1.2 | Applied setup not durable; divergent inference | **Confirmed** | No `appliedSetupId` on the session; `toBootstrapPayload` uses **first match**, `stats.toRaceEntries` uses **latest `updatedAt`** |
| P1.3 | Lap pace attributed at the wrong level | **Confirmed** | `averageLapSeconds` is session-level; `fastestAverageLapSetup` credits it to a setup |
| P1.4 | Import validation shallow; unsafe URIs | **Confirmed** (with location/nuance correction) | Validation lives in `store.js validateCanonicalRoot`, not `portable-data.ts`; `sourceUrl` rendered as raw `<a href>` after trim-only |
| P1.5 | "PRIVATE" copy vs public hosting | **Partially confirmed** | "PRIVATE" badge is real in the UI; hosting access mode is not encoded in the repo and can't be confirmed from code |
| P2 | Multi-tab data loss | **Confirmed** | Whole-document read-modify-write in `store.js mutate()`; no `BroadcastChannel`/`storage`/CAS anywhere |
| P2 | URL/state split | **Confirmed** | Sidebar uses real `<a href>` routes; dashboard buttons and command palette use `setActive` state |
| P2 | Offline deep links fall back to dashboard | **Confirmed** | `sw.js` precaches only `/`; navigate fallback is `caches.match(request) ?? "/"` |
| P2 | Command palette focus not trapped/restored | **Confirmed** | `aria-modal="true"` with no focus trap, `inert`, or focus restoration |
| P2 | Mobile nav: 7×92px, 9px labels, horizontal scroll | **Confirmed** | `globals.css` mobile block: `flex:0 0 92px`, `font-size:9px`, `overflow-x:auto` |
| P2 | Setup actions share one feedback state | **Confirmed** | `setup-notebook.tsx` one `pending/errors/message` for 3 handlers; `message` renders only by the delta button |
| P2 | Series/track integrity not enforced | **Confirmed** | `validateCanonicalRoot` never checks the session series is in the track's `seriesIds` |
| P2 | No migration registry | **Confirmed** | Only legacy-v1→canonical path; `SCHEMA_VERSION=2` with no general migration map |
| P2/P3 | Overloaded destructive controls; render-all directories | **Confirmed** | Driver directory renders all 204 with a `Delete record` on each; no pagination/virtualization |
| P3 | No CSP/security headers | **Confirmed** | No `Content-Security-Policy`/`X-Frame-Options`/`headers()` in `next.config.ts` or `worker/` |
| P3 | SVG-only PWA icons; broad SW cache cleanup | **Confirmed** | `public/` has only `favicon.svg`; `sw.js activate` deletes all non-matching caches, no expiration |
| — | Review map / robots / sitemap | **Status changed** | Described in the audit as *unpublished*; now **committed** in v8 with `robots:{index:true}` |
| — | Engineering quality (lint/test/build, 51 tests) | **Confirmed as far as runnable** | 51 test cases present; 35 logic tests pass here; full Sites build not run in this sandbox |

Bottom line: the audit is accurate. Every P1 mechanism reproduces in the current code. The corrections below are refinements, not refutations — and none of them make any finding less serious.

---

## P1 findings

### P1.1 — A new race can silently convert the current session — CONFIRMED

`components/screens/race-log.tsx` submit handler:

```js
const result = await onCreate({
  sessionId: selectedSession?.id ?? null,   // "New race session" → selectedSession is null → null
  ...
});
```

`lib/store.js` `recordRaceResult`:

```js
const requestedSessionId = input.sessionId ?? root.meta.currentSessionId;   // null → current session
const existing = root.sessions.find((record) => record.id === requestedSessionId) ?? null;
const session = existing
  ? await records.set("sessions", { ...existing, ...blankSession({ ...existing, ...input, sessionType: "race", ... }), id: existing.id })
  : ...
```

`currentSessionId` is set by `createSession` (used by the setup notebook and any practice/qualifying session). So the sequence *start a practice/setup session → go to Log a Race → "New race session" → save* rewrites that practice session in place as a race, inheriting its id and merging the race data. The session-type classification and any prior practice content are lost. Exactly as described.

### P1.2 — Applied-setup attribution is not durable, and two paths disagree — CONFIRMED

There is no `appliedSetupId` (or equivalent) on `SessionRecord` (`lib/domain.ts`) — the only setup→session link is `SetupRecord.sessionId`, and multiple setups may share one `sessionId`. The two render paths resolve that ambiguity differently:

- `lib/store.js` `toBootstrapPayload`: `setupId: root.setups.find((setup) => setup.sessionId === session.id)?.id ?? null` — **first match in array order**.
- `lib/stats.ts` `toRaceEntries`: builds `setupBySession` keeping `setup.updatedAt > existing.updatedAt` — **latest updated**.

The same race can therefore show one setup on the Log/dashboard path and a different setup on the Stats/track path. `recordRaceResult` does accept an `input.setupId` and re-parents that setup to the session, but it stores nothing durable on the race, so on reload the association is re-inferred by the two conflicting rules.

### P1.3 — Lap pace is attributed at the session level, then presented as setup performance — CONFIRMED

`averageLapSeconds` / `bestLapSeconds` live on `SessionRecord`, not on `SetupRecord`. `lib/stats.ts` `fastestAverageLapSetup` maps each setup to its session and treats `session.averageLapSeconds` as that setup's pace, then sorts to pick a "fastest." Every setup sharing a session inherits the identical session lap, so multiple deltas in one session cannot be separated and the "fastest setup" is decided by the same first-match/latest-update lottery as P1.2. Surfaced as **"Fastest avg-lap setup"** (`stats-dashboard.tsx:158`), **"Fastest avg lap" / "Best setup result"** and **"Best observed setup"** (`track-detail.tsx:52–67`).

**Nuance (audit slightly overstated):** `track-detail.tsx:75` already prints a caveat — *"This is the fastest manual observation in your history, not a claim of universal causation."* So the "unsupported causal claim" is partly hedged in copy. The underlying data defect (wrong-setup attribution, mixed deltas) is unaffected and remains real.

### P1.4 — Import validation is shallow and accepts dangerous URIs — CONFIRMED (with two corrections)

**Correction 1 — location.** The import validator is `validateCanonicalRoot` in `lib/store.js`, invoked by `store.importJson`. `lib/portable-data.ts` is **export-only** (CSV) and does no import validation, so the audit's "portable-data.ts" attribution is off; the substance holds.

**What is checked:** root key shape, `schemaVersion`, arrays present, integer/unique ids, `Date.parse`-able timestamps, referential integrity (series/track/session/setup), `sessionType` enum, and `typeof sessionDate === "string"`.

**What is not checked:** numeric ranges (finish/field-size/positions), lap-value constraints, real date validity (any string passes), text lengths, and — most importantly — **URL schemes**. `SeriesRecord.sourceUrl`, `TrackRecord.sourceUrl`, `ScheduleRecord.sourceUrl`, and `DriverRecord.ratingSourceUrl` pass through `nullableText` (trim only) and are rendered as raw anchors, e.g.:

```jsx
// track-directory.tsx:290, schedule-screen.tsx:100, driver-directory.tsx:186
<a href={track.sourceUrl} rel="noreferrer" target="_blank">Recorded source ↗</a>
```

The in-app forms use `<input type="url">`, but **import bypasses the forms entirely**, so a crafted backup with `sourceUrl: "javascript:…"` yields a clickable `javascript:` anchor in the app origin. Confirmed.

**Correction 2 — not quite "all-or-nothing".** `store.importJson` writes a `legacy-import-${now}` recovery copy of the current root before replacing it, and the UI (`data-tools.tsx`) shows a `window.confirm`. So a recovery point exists — but there is no dry-run/preview of the incoming data, which is the real gap. Confirmed with that refinement.

### P1.5 — "PRIVATE" wording vs public hosting — PARTIALLY CONFIRMED

The **"PRIVATE"** badge is real: `data-boundary.tsx` (`<span>PRIVATE</span>`) and the topline truth-rail in `companion-app.tsx`. The device-local claim itself is accurate (IndexedDB, no sync). Whether the **hosted** app is public is a Sites console setting; `.openai/hosting.json` contains only `project_id`/`d1`/`r2` and does not encode an access mode, so I cannot confirm "public access" from the repository — that part rests on the platform state the auditor observed, not on code. The copy-precision recommendation ("your records stay in this browser unless you export them") is still worth taking.

---

## P2 findings — all confirmed

- **Multi-tab loss.** `store.js mutate()` does `readDocument(ROOT_KEY)` → `clone` → mutate → `writeDocument(ROOT_KEY)` with no version/compare-and-swap. `writeQueue` serialises writes only *within one tab's* store instance. Grep confirms no `BroadcastChannel`, `storage` event, or CAS anywhere. Two tabs → last writer wins, silently.
- **URL/state split.** `app-nav.tsx` renders real `<a href={item.href}>` (`/`, `/view/log`, …). The dashboard hero buttons call `goTo` = `setActive` (`companion-app.tsx`), and the command palette calls `onNavigate` = `setActive`. Both leave the URL unchanged, so back/refresh/share behave differently depending on how you navigated. The dashboard hero also exposes only "Log a race" and "Open track catalog" — no "Start setup session," as the audit says.
- **Offline deep links.** `sw.js` install precaches only `/` (plus `manifest`/`favicon` and assets scraped from `/`'s HTML). The `navigate` handler falls back to `caches.match(event.request) ?? caches.match("/")`, so a first-load offline hit on an unvisited `/view/*` resolves to the dashboard.
- **Command palette focus.** `command-palette.tsx` sets `role="dialog"` + `aria-modal="true"` and `autoFocus` on the input, but there is no focus trap, no `inert`/hidden background, and no focus restoration on Escape/close. Notably `track-directory.tsx:102–106` *does* implement `returnFocus` for its own modal — so the pattern exists in the codebase and the palette is simply inconsistent with it.
- **Mobile navigation.** `globals.css` mobile block: `.app-nav { display:flex; overflow-x:auto; position:fixed; bottom:0 }` and `.nav-item { flex:0 0 92px; font-size:9px; min-height:56px }`. Seven items × 92px ≈ 644px overflow a phone width into a horizontally scrolling strip with 9px labels. (Touch height 56px is fine; the 9px label legibility is the real issue.)
- **Setup action feedback.** `setup-notebook.tsx` has a single `pending`/`errors`/`message` triple (lines 114–116) shared by start-session, update-session, and save-delta handlers, but `message` is rendered only next to the "Save setup delta" button (line 349). Starting or updating a session shows its status beside the wrong control.
- **Series/track integrity.** `validateCanonicalRoot` verifies a session's `seriesId`/`trackId` exist and that a setup matches its session's series/track, but never that the session's series is listed in the track's `seriesIds`. A session/setup can reference a series the track doesn't offer.
- **No migration registry.** Only `migrateLegacyData` (legacy-v1 → canonical) exists. `SCHEMA_VERSION = 2` with no general per-version migration map, so future schema changes have no upgrade path.

---

## P3 spot-checks

- **Render-all directories + prominent destructive controls.** Driver directory: `visible` is a search/series *filter* only (no pagination/virtualization); with no query it renders all **204** seeded drivers, each card carrying a `Delete record` button on official reference data. Confirmed. The 217 KB/154 KB HTML byte figures are build-time measurements I did not reproduce here, but they're consistent with all-records-at-once server rendering.
- **Security headers / CSP.** None found in `next.config.ts` or `worker/index.ts`. Confirmed absent.
- **PWA icons.** `public/` ships only `favicon.svg` (plus decorative `file.svg`/`globe.svg`/`window.svg`); no PNG/Apple-touch icons. Confirmed.
- **Service-worker cache hygiene.** `activate` deletes every cache whose key ≠ `CACHE_NAME` (can remove unrelated same-origin caches on a shared host), and the fetch handler caches same-origin GETs indefinitely with no expiration/versioning beyond the manual `-v3` name. Confirmed.

---

## Differences from the audited state (v7 → v8)

The audit flagged the crawler/review artifacts as **unpublished working-copy changes** ("Hosted Sites version 7 may not include those changes"). In the current tree they are **committed**: `app/review/page.tsx` (with `robots: { index: true, follow: true }`), `app/robots.txt/route.ts`, `app/sitemap.xml/route.ts`, and the `/view/[view]` routes all exist on `main`. So the "AI Review Map" recommendation (keep review maps out of production and out of public indexing) now applies to shipped code rather than a working copy — v8 committed close to exactly what the audit warned against. Worth an explicit decision.

## Engineering-quality claims

- **51 tests:** confirmed — 51 `test(`/`it(` cases across 10 `tests/*.test.mjs` files.
- **They pass:** the 35 pure-logic tests (`store`, `stats`, `domain`, `portable-data`, `search`) run green directly here (`node --test`). The remaining suites and `npm test`/`npm run build`/`npm run lint` depend on the bounded Cloudflare Sites (`vinext` + `wrangler`) pipeline, which I did not run in this sandbox — so I can corroborate the logic tests but not independently re-run the full green build.
- **The important point stands:** the suite is green *and* the P1 defects are present, because existing tests cover the shared-session happy path (`store.test.mjs`: "a current session connects setup deltas, pace notes, and race results without duplication") but not the mutation/attribution edge cases. That is precisely the audit's "gaps are semantic and interaction-level" conclusion.

## Net assessment

The audit is trustworthy and can be acted on. The only substantive corrections: the import validator lives in `store.js` (not `portable-data.ts`) and does write a pre-replace recovery backup; the "best observed setup" copy already carries a causation caveat; and the P1.5 hosting-access claim can't be verified from the repo. None of these reduce the severity of the five P1 items. If you want, the natural next step is the audit's **Phase 0** gate — fix session mutation, add a durable applied-setup reference, unify the two attribution paths, and add URL-scheme + range validation on import — each of which now has an exact code location above.
