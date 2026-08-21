import assert from "node:assert/strict";
import test from "node:test";

import { searchCompanion } from "../lib/search.ts";

const data = {
  series: [{ id: 1, name: "Cup", shortCode: "CUP" }],
  drivers: [
    {
      id: 1,
      name: "Manual Driver",
      team: "Copperline Racing",
      carNumber: "00",
      manufacturer: null,
      notes: "",
    },
  ],
  tracks: [{ id: 2, name: "Phoenix Raceway", notes: "desert reference" }],
  schedule: [],
  races: [
    {
      id: 3,
      seriesId: 1,
      trackId: 2,
      raceDate: "2026-08-14",
      notes: "Saved right front on the long run",
    },
  ],
  setups: [
    {
      id: 4,
      seriesId: 1,
      trackId: 2,
      title: "Long-run baseline",
      setupNotes: "One click tighter for the final run",
    },
  ],
};

test("finds setup notes, race notes, drivers, and tracks without a network index", () => {
  assert.deepEqual(
    searchCompanion(data, "tighter").map((item) => item.kind),
    ["setup"],
  );
  assert.deepEqual(
    searchCompanion(data, "right front").map((item) => item.kind),
    ["race"],
  );
  assert.deepEqual(
    searchCompanion(data, "Copperline").map((item) => item.kind),
    ["driver"],
  );
  assert.deepEqual(
    searchCompanion(data, "Phoenix").map((item) => item.kind),
    ["track", "race", "setup"],
  );
});

test("uses token-prefix matching and returns no results for a blank query", () => {
  assert.equal(searchCompanion(data, "base")[0].title, "Long-run baseline");
  assert.deepEqual(searchCompanion(data, "   "), []);
});
