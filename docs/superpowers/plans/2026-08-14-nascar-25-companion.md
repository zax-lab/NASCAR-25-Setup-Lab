# NASCAR 25 Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable, offline-first NASCAR 25 manual-entry companion with local data ownership, fast entry, curated reference records, setup search, and rich statistics derived only from the owner's log.

**Architecture:** Use the Vinext Site as a single responsive client application. IndexedDB is the only source of truth for personal and manually maintained records; a service worker caches the shell and static assets. Pure TypeScript modules own validation, search, export/import, statistics, and a documented field-size-normalized performance index.

**Tech Stack:** Next/Vinext, React 19, TypeScript, IndexedDB, SVG, CSS, Web App Manifest, Service Worker, Node test runner.

**Implementation status:** Complete. Final verification is recorded in the repository test/build history and Sites checkpoints.

## Global Constraints

- This app has zero integration with the NASCAR 25 game process, save files, or any game API — none exists publicly.
- Every game-related reference field is static, manually maintained, source-labeled, and date-stamped.
- All race results, incident points, and setup notes are entered by the owner after playing.
- Do not add auto-sync, telemetry, overlays, career imports, save-file reads, live-result feeds, scraping, or official-partnership language.
- Do not invent driver ratings, rosters, setup values, track dimensions, exact track shapes, or a numeric current game version.
- A track SVG must say `schematic` unless its path has a reviewed source.
- No backend, app account, or cross-device sync; IndexedDB plus JSON/CSV import/export provides ownership and recovery.
- Optimize all primary workflows for iPhone and Pixel touch use, while supporting Cmd/Ctrl-K on hardware keyboards.
- Ambition appears in interaction design, real self-log visualization, offline behavior, and fast entry, never fake connectivity.

---

### Task 1: Local-first storage, import/export core, and PWA shell

**Files:**
- Modify: `.openai/hosting.json`
- Delete: `app/api/**`, `db/schema.ts`, `lib/repository.ts`, `lib/api-contract.ts`, generated Drizzle migration
- Create: `lib/local-store.ts`
- Create: `lib/portable-data.ts`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `components/pwa-registration.tsx`
- Modify: `app/layout.tsx`
- Test: `tests/local-first-contract.test.mjs`, `tests/portable-data.test.mjs`

**Interfaces:**
- Produces: `loadCompanionData()`, `putRecord(store, record)`, `deleteRecord(store, id)`, `replaceCompanionData(payload)`.
- Produces: `exportJson(data)`, `exportRaceCsv(data)`, and `validatePortableData(input)`.

- [ ] Write failing tests requiring `d1` and `r2` to remain null, no API routes, IndexedDB store names, a versioned portable-data envelope, CSV escaping, manifest fields, and service-worker caching without external feeds.
- [ ] Run the tests and confirm failures come from the D1/API implementation and missing local-first files.
- [ ] Remove server persistence and implement versioned IndexedDB stores for series, drivers, tracks, schedule, races, setups, and metadata.
- [ ] Seed only the reviewed four-series/31-track snapshot on first open; preserve local edits on later opens.
- [ ] Implement validated JSON export/import and race CSV export with no network call.
- [ ] Add the manifest, installable metadata, service worker, and client registration.
- [ ] Run tests and lint; commit the local-first foundation.

### Task 2: Distinctive application shell and manual reference workflows

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- Create/modify: `components/companion-app.tsx`, `components/ui/*`
- Create/modify: `components/screens/driver-directory.tsx`, `track-directory.tsx`, `schedule-screen.tsx`
- Test: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: local-store CRUD and static reviewed seeds.
- Produces: all seven navigation destinations plus complete driver, track, and schedule maintenance flows.

- [ ] Keep the existing failing UI contract for the authoritative title, seven screens, exact guardrail, official source links, focus states, and phone-safe controls.
- [ ] Finish the race-engineering workstation shell with the manual/private/dated truth rail and mobile bottom navigation.
- [ ] Wire directories and schedule forms directly to IndexedDB and local state.
- [ ] Label ratings community-sourced, dates manually maintained, and schedule items real-world references.
- [ ] Run UI/domain tests and lint; preview at phone and desktop widths; commit the coherent reference slice.

### Task 3: Ten-second race entry and manual incident mapping

**Files:**
- Modify: `lib/domain.ts`, `lib/local-store.ts`
- Create: `components/screens/race-log.tsx`
- Modify: `components/companion-app.tsx`
- Test: `tests/domain.test.mjs`, `tests/incident-map.test.mjs`

**Interfaces:**
- Extends `RaceEntry` with optional `fieldSize`, `incidentX`, and `incidentY` normalized to 0–100 percentages.
- Produces: keyboard/touch fast-entry form and a manually tapped schematic incident point.

- [ ] Write failing validation tests for field size, position versus field size, and normalized incident coordinates.
- [ ] Write failing tests for coordinate normalization and the required `schematic` label when no reviewed SVG trace exists.
- [ ] Implement the minimal pure coordinate and validation functions.
- [ ] Build a fast form with sensible focus order, series/track/setup selection, optional incident map, and preserved drafts.
- [ ] Save to IndexedDB, update the dashboard immediately, and support confirmed deletion.
- [ ] Run tests, lint, and interaction QA; commit the race-entry slice.

### Task 4: Real self-log analytics and visualization

**Files:**
- Create: `lib/stats.ts`
- Create: `components/screens/stats-dashboard.tsx`
- Modify: `components/companion-app.tsx`, `app/globals.css`
- Test: `tests/stats.test.mjs`

**Interfaces:**
- Produces: `calculateSummary`, `buildFinishTrend`, `groupByTrackType`, `groupBySeries`, `calculateBoxPlot`, `buildSeasonHeatmap`, and `calculatePerformanceIndex`.
- Pace Index: per race calculate `100 * (fieldSize - finish)/(fieldSize - 1)` when field size > 1, then display the arithmetic mean of eligible event scores. Label it a personal index, not Elo or an official rating.

- [ ] Write failing tests for empty logs, average/best/win/top-five/top-ten metrics, stable chronology, quartiles, grouping, heatmap cells, and exact performance-index examples.
- [ ] Implement pure functions and document the formula beside the UI.
- [ ] Build accessible SVG trend and box plots plus a CSS/SVG season heatmap with text summaries.
- [ ] Build dashboard shortcuts, recent races, and metric deltas from self-entered data only.
- [ ] Run tests, lint, and visual QA; commit analytics.

### Task 5: Setup notebook, local search, command palette, and data ownership

**Files:**
- Create: `lib/search.ts`
- Create: `components/screens/setup-notebook.tsx`
- Create: `components/ui/command-palette.tsx`, `data-tools.tsx`
- Modify: `components/companion-app.tsx`, `app/globals.css`
- Test: `tests/search.test.mjs`, `tests/content-boundary.test.mjs`

**Interfaces:**
- Produces: `buildSearchDocument`, `searchRecords`, Cmd/Ctrl-K routing, JSON/CSV download, and validated replacement import.

- [ ] Write failing tests for token normalization, ranked notes/setup search, zero external indexing, and prohibited connectivity/partnership claims.
- [ ] Implement the small local search index and setup notebook CRUD/filtering.
- [ ] Build the command palette for race entry, navigation, setup search, import, and export.
- [ ] Add JSON/CSV export and confirmed, validated JSON import with clear local-data ownership copy.
- [ ] Run all tests, lint, and phone/keyboard QA; commit the complete experience.

### Task 6: Verification, offline QA, and hosted checkpoints

**Files:**
- Modify only files needed to fix verified defects.

**Interfaces:**
- Produces: verified private production checkpoints and final Site URL.

- [ ] Use agent preview to test all seven screens, filters, fast race entry, incident tap, setup search, command palette, export/import, reload persistence, and phone navigation.
- [ ] Test offline reload after one connected load and verify that no unsupported live-data claim appears.
- [ ] Run unit tests, lint, Vinext build, and artifact validation.
- [ ] Checkpoint the first coherent reference slice, verify its deployment directly, and continue later layers while it deploys.
- [ ] Checkpoint and directly verify the complete experience; return the final private Site URL.
