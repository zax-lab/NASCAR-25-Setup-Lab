import assert from "node:assert/strict";
import test from "node:test";

import { exportRaceCsv } from "../lib/portable-data.ts";

const data = {
  series: [
    {
      id: 1,
      name: "NASCAR Cup Series",
      shortCode: "CUP",
      maintenanceStatus: "manual",
      sourceUrl: "https://nascar25.com/",
      reviewedAt: "2026-08-14",
    },
  ],
  drivers: [],
  tracks: [
    {
      id: 1,
      name: "Test Track",
      seriesIds: [1],
      layoutType: "unclassified",
      lengthMiles: null,
      bankingNotes: "",
      notes: "",
      sourceUrl: null,
      reviewedAt: null,
      createdAt: "2026-08-14T00:00:00.000Z",
    },
  ],
  schedule: [],
  races: [
    {
      id: 1,
      seriesId: 1,
      trackId: 1,
      raceDate: "2026-08-14",
      startPosition: 9,
      finishPosition: 4,
      fieldSize: 36,
      lapsLed: 2,
      incidents: 1,
      stageResults: null,
      setupId: null,
      incidentX: null,
      incidentY: null,
      notes: "Late run, car was \"free\"",
      createdAt: "2026-08-14T00:00:00.000Z",
    },
  ],
  setups: [],
};

test("exports user-entered races as escaped CSV", () => {
  const csv = exportRaceCsv(data);

  assert.match(csv, /^date,series,track,start,finish,field_size,laps_led,incidents,notes/m);
  assert.match(csv, /2026-08-14,NASCAR Cup Series,Test Track,9,4,36,2,1,"Late run, car was ""free"""/);
});
