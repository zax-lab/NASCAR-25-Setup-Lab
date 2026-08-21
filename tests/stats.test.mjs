import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTrackView,
  fastestAverageLapSetup,
  computeBoxPlot,
  computePaceIndex,
  groupFinishesByLayout,
  summarizeRaces,
  toRaceEntries,
} from "../lib/stats.ts";

const race = (id, finishPosition, fieldSize, trackId = 1) => ({
  id,
  seriesId: 1,
  trackId,
  raceDate: `2026-08-${String(id).padStart(2, "0")}`,
  startPosition: 8,
  finishPosition,
  fieldSize,
  lapsLed: null,
  incidents: null,
  stageResults: null,
  setupId: null,
  incidentX: null,
  incidentY: null,
  notes: "",
  createdAt: `2026-08-${String(id).padStart(2, "0")}T00:00:00.000Z`,
});

test("summarizes only the user's race entries", () => {
  const summary = summarizeRaces([
    race(1, 1, 10),
    race(2, 5, 10),
    race(3, 12, 20),
  ]);

  assert.deepEqual(summary, {
    racesLogged: 3,
    averageFinish: 6,
    bestFinish: 1,
    wins: 1,
    winRate: 33.3,
    top5Rate: 66.7,
    top10Rate: 66.7,
    averagePositionsGained: 2,
  });
});

test("uses a documented field-normalized pace index and excludes missing field sizes", () => {
  const result = computePaceIndex([
    race(1, 1, 10),
    race(2, 10, 10),
    race(3, 2, null),
  ]);

  assert.deepEqual(result, { value: 50, sampleSize: 2 });
});

test("computes five-number box-plot summaries", () => {
  assert.deepEqual(computeBoxPlot([4, 1, 3, 2]), {
    min: 1,
    q1: 1.5,
    median: 2.5,
    q3: 3.5,
    max: 4,
  });
  assert.equal(computeBoxPlot([]), null);
});

test("groups finish positions by manually maintained track layout", () => {
  const groups = groupFinishesByLayout(
    [race(1, 3, 20, 4), race(2, 7, 20, 5)],
    [
      { id: 4, layoutType: "short_track" },
      { id: 5, layoutType: "road_course" },
    ],
  );

  assert.deepEqual(groups, [
    { layoutType: "short_track", finishes: [3] },
    { layoutType: "road_course", finishes: [7] },
  ]);
});

const session = (id, overrides = {}) => ({
  id,
  createdAt: `2026-08-${String(id).padStart(2, "0")}T00:00:00.000Z`,
  updatedAt: `2026-08-${String(id).padStart(2, "0")}T00:00:00.000Z`,
  sessionType: "race",
  seriesId: 1,
  trackId: 1,
  sessionDate: `2026-08-${String(id).padStart(2, "0")}`,
  startPosition: 8,
  finishPosition: 4,
  fieldSize: 36,
  lapsLed: 0,
  incidents: 0,
  stageResults: null,
  incidentX: null,
  incidentY: null,
  averageLapSeconds: 31,
  bestLapSeconds: 30.5,
  tireNotes: "Stable over the run",
  notes: "Manual result",
  ...overrides,
});

test("derives race views and setup performance from canonical sessions at read time", () => {
  const sessions = [
    session(1, { averageLapSeconds: 31.2, finishPosition: 5 }),
    session(2, { averageLapSeconds: 30.8, finishPosition: 2 }),
  ];
  const setups = [
    {
      id: 10,
      createdAt: sessions[0].createdAt,
      updatedAt: sessions[0].updatedAt,
      sessionId: 1,
      seriesId: 1,
      trackId: 1,
      title: "Opening run",
      setupNotes: "Wedge -0.5",
    },
    {
      id: 11,
      createdAt: sessions[1].createdAt,
      updatedAt: sessions[1].updatedAt,
      sessionId: 2,
      seriesId: 1,
      trackId: 1,
      title: "Late run",
      setupNotes: "RF pressure -1",
    },
  ];

  const races = toRaceEntries(sessions, setups);
  assert.equal(races.length, 2);
  assert.equal(races[1].setupId, 11);

  assert.deepEqual(fastestAverageLapSetup(setups, sessions), {
    setupId: 11,
    sessionId: 2,
    averageLapSeconds: 30.8,
    finishPosition: 2,
    trackId: 1,
    title: "Late run",
  });

  const track = deriveTrackView(1, sessions, setups);
  assert.equal(track.sessions.length, 2);
  assert.equal(track.summary.averageFinish, 3.5);
  assert.equal(track.bestSetup?.setupId, 11);
});
