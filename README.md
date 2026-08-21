# NASCAR 25 Setup Lab

An offline-first, device-local companion for NASCAR 25. It provides a personal race log, setup notebook, self-log analytics, and manually maintained driver, track, and real-world schedule references.

## Hard boundary

This app does not connect to the NASCAR 25 game process, telemetry, save files, or a game API. Race results and setup notes are typed by the user after playing. The app does not claim an official NASCAR or iRacing Studios partnership, scrape community sources, import career progress, or fetch live results.

## Data model

- Reference data: four confirmed series, the 31-entry current publisher track catalog, and 204 name/number/team entries transcribed from the current publisher driver gallery. All remain local, editable snapshots; unknown values remain blank.
- Personal data: race entries, optional hand-tapped schematic incident points, setup notes, and free-text notes.
- Storage: IndexedDB in the current browser/device. There is no app backend, account, or cross-device sync.
- Portability: versioned JSON backup/import and a CSV export of self-entered races.

## Product surfaces

- Dashboard with self-log summary metrics and data ownership tools
- Fast manual race entry with optional field size and incident schematic
- Finish trend, box plots, result heatmap, series splits, and documented Pace Index
- Driver, track, and real-world schedule reference directories
- Personal setup notebook with publisher-verified garage field names
- Cmd/Ctrl-K local command palette and notes search
- Installable PWA shell with same-origin offline caching

## Accuracy policy

Publisher sources reviewed for the reference snapshot:

- [NASCAR 25 FAQ](https://nascar25.com/faq/)
- [Dated official driver roster tables](https://nascar25.com/category/driver-rosters/)
- [NASCAR 25 track catalog](https://nascar25.com/tracks/)
- [September 10, 2025 track list](https://nascar25.com/nascar-25-track-list-reveal/)
- [Official videos and setup guide](https://nascar25.com/videos/)
- [Release-note archive](https://nascar25.com/category/release-notes/)

The full 23-post release-note archive was audited from October 10, 2025 through March 11, 2026. The current track catalog and the September launch list disagree on Michigan/Xfinity, so the app follows the current catalog and displays the conflict. The January 21 patch controls Portland availability: Quick Race and Online for Xfinity and ARCA. The current publisher driver gallery (47 Cup, 50 Xfinity, 49 Truck, 58 ARCA) supersedes the four earlier roster articles, which total 196 entries; the older pages remain linked as dated lineage.

No setup units, numeric ranges, “best” values, exact track outlines, numeric driver ratings, or numeric current game version are invented. A reference record always remains editable and dated.

## Development

Requires Node.js 22.13 or newer.

```bash
npm run dev
npm run lint
node --test tests/*.test.mjs
npm run build
```

`npm run build` creates and validates the Vinext Sites artifact. D1 and R2 bindings remain disabled in `.openai/hosting.json` because persistence is intentionally client-side.

## Product audit

The repository includes the [August 21, 2026 full-site audit](docs/audits/2026-08-21-full-site-audit.md) and its route-by-route screenshot evidence. The audit documents product-scope, data-integrity, accessibility, security, performance, offline, and information-architecture findings.
