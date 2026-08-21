# NASCAR 25 Companion Design

## Objective

Build a private, mobile-first companion for NASCAR 25 that works entirely through manual entry. It combines manually maintained reference records with a personal race log, setup notebook, and statistics derived only from the owner's own entries.

## Governing boundary

> This app has zero integration with the NASCAR 25 game process, save files, or any game API — none exists publicly. Every "game" data point (driver ratings, track list) is static reference data I will maintain manually. All race results are typed in by the user after playing. Do not add auto-sync, live telemetry, save file import, or any feature implying a live connection to the game. Within that constraint, push hard on UI/UX polish, real data visualization of my self-logged stats, offline-first PWA engineering, and fast data entry — ambition should show up in craft and interaction design, not in fake game connectivity.

The product must never imply an official NASCAR or iRacing Studios partnership. It must not scrape community sources or fetch real-world race results automatically. Reference records are always labeled manually maintained and dated.

## Product shape

The app is a single responsive application shell with seven screens: Dashboard, Log a Race, My Stats, Driver Directory, Track Directory, Setups, and Schedule. Navigation is a compact rail on wide screens and a touch-friendly bottom or horizontal navigation surface on phones.

The first viewport prioritizes the personal dashboard: the latest reference review date, races logged, average finish, win/top-five/top-ten rates, and a clear Log a Race action. Empty states teach the manual workflow without pretending sample records are user data.

## Data tiers

### Tier A: manually maintained reference data

- Series: Cup, Xfinity, Craftsman Truck, and ARCA Menards.
- Drivers: name, series membership, team, car number, manufacturer, nullable community-sourced in-game rating, notes, and review date.
- Tracks: name, series membership, layout type, length, banking notes, notes, and review date.
- Schedule events: real-world season, series, track, date, and notes. These are explicitly labeled real-world reference dates, not the in-game career calendar.

No reference value is called live or official. Source links and review dates are preserved when present. Unverified values remain absent rather than being estimated.

### Tier B: owner-entered data

- Race entries: date, series, track, start, finish, optional field size, laps led, incidents, stage results, linked setup, optional hand-tapped schematic coordinates, and notes.
- Setups: track, series, title, freeform setup notes, and created date. These are notebook records, not game files.

The Site remains owner-only and device-local. IndexedDB is the source of truth for personal and manually maintained records; JSON/CSV export provides ownership and recovery. No backend, app account, or cross-device sync is added. If sync is requested later, authentication and row ownership must be designed before any server storage is introduced.

## Components and boundaries

- `lib/local-store.ts`: versioned IndexedDB schema, seeding, CRUD, import, and export.
- `lib/domain.ts`: shared domain types and validation helpers.
- `lib/stats.ts`: pure statistics functions; no UI or database access.
- `lib/search.ts`: client-side tokenization and fuzzy/full-text matching.
- `lib/reference-data.ts`: conservative seed records and dated source metadata.
- `components/companion-app.tsx`: application state, navigation, loading, and orchestration.
- `components/screens/*`: one screen per product responsibility.
- `components/ui/*`: small reusable controls, metrics, tables, and charts.
- `public/manifest.webmanifest` and `public/sw.js`: installability and offline shell/runtime caching.

## Data flow

On load, the client opens IndexedDB and seeds only reviewed series and track references on first use. Forms validate and write locally, then update visible state. Dashboard, box plots, heatmap, trend chart, and personal performance index are calculated from self-entered race records through pure functions. The service worker caches the application shell and static assets; no runtime data feed is involved.

The command palette opens with Cmd/Ctrl-K and routes directly to fast entry, directories, setup search, import, and export. Full-text search is local. Track incident points are manually tapped and stored as normalized coordinates; a map must be labeled schematic unless its SVG trace has a reviewed source.

## Accuracy and provenance

- Every reference section displays "Manually maintained" and a last-reviewed date.
- Driver ratings are nullable and, when present, labeled community-sourced.
- Setup notes are labeled personal notes and never scored as universally fast or verified.
- Schedule records are labeled real-world reference dates.
- A Source & Boundaries panel links to the official NASCAR 25 FAQ, official videos/setup guide, official track catalog, and release-note archive.
- The current reference status may say the latest official release note reviewed is March 11, 2026, but it must not invent a numeric game version.
- No unsupported claims about cross-platform physics parity, telemetry, save imports, live results, or game-data access appear anywhere.

## Error handling

Forms reject missing required fields, impossible finishing positions, negative incidents, and malformed dates. IndexedDB failures leave the user's current form intact and show export/retry guidance. Imports are versioned, validated, and transactional. Empty reference tables remain functional and provide manual-add actions. Delete and replace-import actions require explicit confirmation. Storage failures never fall back to fabricated sample data.

## Visual direction

Use a restrained race-engineering workstation aesthetic: near-black graphite surfaces, warm off-white text, safety yellow for actions and state, cool cyan for data accents, condensed uppercase labels, thin telemetry rules, and subtle grid texture. Avoid NASCAR logos, car photography, fake sponsor marks, checkered-flag clichés, and decorative gauges that imply live telemetry.

The interface is built for iPhone and Pixel use first: 44px minimum targets, no hover-only actions, compact data density, sticky primary actions, readable forms, and charts with text summaries.

## Testing

- Unit-test all derived statistics, personal-rating math, search, validation, and import/export rules.
- Test local-store schema/version contracts and PWA source contracts.
- Test the production HTML for the authoritative title, the zero-integration boundary, and primary navigation labels.
- Preview at phone and desktop widths; exercise logging, filtering, saving a setup, and deletion.
- Run lint, build, artifact validation, and the complete test suite before the final checkpoint.

## Definition of done

The deployed private Site presents all seven screens, works offline after first load, stores manual records device-locally, exports/imports owner data, calculates and visualizes only self-reported statistics, supports fast command-palette entry and reference maintenance, works on phone-sized screens, visibly enforces the zero-integration boundary, and contains no unsupported game-specific data or live-data implication.
