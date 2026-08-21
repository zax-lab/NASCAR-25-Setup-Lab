import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("lists only publisher-demonstrated NASCAR 25 garage controls and bounded effects", async () => {
  const setups = await source("components/screens/setup-notebook.tsx");
  for (const control of [
    "Spring Rate",
    "Bump",
    "Rebound",
    "Tire Pressure",
    "Camber",
    "Front Sway Bar",
    "Wheel Lock",
    "Brake Bias",
    "Rear End Ratio",
    "Wedge",
    "Left Side Weight",
    "Nose Weight",
    "Trim",
    "Rear Sway Bar",
  ]) {
    assert.match(setups, new RegExp(control));
  }
  assert.match(setups, /Tight ↔ Loose/);
  assert.match(setups, /No undocumented units, ranges, or “best” values/);
  assert.match(setups, /roughly 25%-toward-Loose example is for Martinsville, not a universal baseline/);
  assert.match(setups, /right-front plus left-rear/);
  assert.match(setups, /not aerodynamic trim/);
  assert.match(setups, /Specific examples stay labeled as examples; undocumented mechanics remain unknown/);
  assert.match(setups, /https:\/\/www\.youtube\.com\/watch\?v=b2gxr0Yw7JQ/);
  assert.match(setups, /https:\/\/nascar25\.com\/videos\//);
  assert.match(setups, /https:\/\/nascar25\.com\/release-notes-oct-21-2025\//);
  assert.match(setups, /Community baselines and unconfirmed absence claims are not seeded/);
});

test("keeps search and storage local and names the generic incident map schematic", async () => {
  const search = await source("lib/search.ts");
  const store = await source("lib/store.js");
  const raceLog = await source("components/screens/race-log.tsx");

  assert.doesNotMatch(search, /fetch\s*\(|https?:\/\//);
  assert.doesNotMatch(store, /fetch\s*\(|https?:\/\//);
  assert.match(raceLog, /Schematic only · hand-tapped by you · never telemetry/);
  assert.match(raceLog, /generic visual aid, not a sourced map/);
});

test("labels the seeded schedule as a dated real-world reference rather than game career data", async () => {
  const schedule = await source("components/screens/schedule-screen.tsx");
  const reference = await source("lib/reference-data.ts");

  assert.match(schedule, /real-world race weekends, not a confirmed in-game career calendar/);
  assert.match(reference, /not a confirmed in-game career date/i);
  assert.match(reference, /2026-08-14/);
  assert.match(reference, /not mapped to Chicago Street Course/);
});

test("publishes first-party roster, track-conflict, and ratings provenance", async () => {
  const drivers = await source("components/screens/driver-directory.tsx");
  const tracks = await source("components/screens/track-directory.tsx");

  assert.match(drivers, /204 current publisher cards/);
  assert.match(drivers, /gallery supersedes the four July\/August roster articles/);
  assert.match(drivers, /Ratings updated through the 2025 season using Racing Insights/);
  assert.match(drivers, /release-notes-dec-8-2025/);
  assert.match(tracks, /Current catalog · CUP 27 · XFI 25 · TRK 23 · ARCA 17/);
  assert.match(tracks, /launch list included Michigan for Xfinity/);
  assert.match(tracks, /Quick Race and Online for Xfinity and ARCA/);
  assert.match(tracks, /release-notes-jan-21-2026/);
});
