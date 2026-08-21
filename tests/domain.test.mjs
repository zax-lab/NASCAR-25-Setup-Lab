import assert from "node:assert/strict";
import test from "node:test";

import {
  validateDriverInput,
  validateRaceInput,
  validateScheduleInput,
  validateSetupInput,
  validateTrackInput,
} from "../lib/domain.ts";
import { SCHEDULE_SEED, SERIES_SEED, TRACK_SEED } from "../lib/reference-data.ts";
import {
  CURRENT_DRIVER_GALLERY_SOURCE,
  DRIVER_ROSTER_SOURCES,
  DRIVER_SEED,
} from "../lib/driver-reference.ts";

const validRace = {
  seriesId: 1,
  trackId: 2,
  raceDate: "2026-08-14",
  startPosition: 18,
  finishPosition: 7,
  fieldSize: 36,
  lapsLed: 3,
  incidents: 1,
  stageResults: "12 / 9",
  setupId: null,
  incidentX: 61.5,
  incidentY: 28.25,
  notes: "Saved tires for the final run.",
};

test("accepts a complete manual race entry", () => {
  const result = validateRaceInput(validRace);
  assert.equal(result.ok, true);
  assert.equal(result.data.finishPosition, 7);
});

test("rejects a race without required references or date", () => {
  const result = validateRaceInput({
    ...validRace,
    seriesId: 0,
    trackId: null,
    raceDate: "",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    seriesId: "Choose a series.",
    trackId: "Choose a track.",
    raceDate: "Enter a race date.",
  });
});

test("rejects impossible calendar dates instead of normalizing them", () => {
  const race = validateRaceInput({ ...validRace, raceDate: "2026-02-31" });
  const schedule = validateScheduleInput({
    season: 2026,
    seriesId: 1,
    trackId: 2,
    eventName: "Manual reference",
    raceDate: "2026-02-31",
  });

  assert.equal(race.ok, false);
  assert.equal(race.errors.raceDate, "Enter a race date.");
  assert.equal(schedule.ok, false);
  assert.equal(schedule.errors.raceDate, "Enter the real-world race date.");
});

test("rejects impossible positions and negative incidents", () => {
  const result = validateRaceInput({
    ...validRace,
    startPosition: 0,
    finishPosition: -2,
    incidents: -1,
    lapsLed: -4,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    startPosition: "Starting position must be 1 or higher.",
    finishPosition: "Finishing position must be 1 or higher.",
    lapsLed: "Laps led cannot be negative.",
    incidents: "Incidents cannot be negative.",
  });
});

test("validates optional field size and hand-tapped schematic coordinates", () => {
  const result = validateRaceInput({
    ...validRace,
    fieldSize: 6,
    incidentX: 110,
    incidentY: -1,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    fieldSize: "Field size cannot be smaller than a recorded position.",
    incidentLocation: "Incident marker must stay within the schematic.",
  });
});

test("accepts a freeform personal setup note", () => {
  const result = validateSetupInput({
    seriesId: 1,
    trackId: 2,
    title: "Long-run baseline",
    setupNotes: "Personal notes copied from my own garage screen.",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.title, "Long-run baseline");
});

test("rejects a setup without a title or references", () => {
  const result = validateSetupInput({
    seriesId: null,
    trackId: 0,
    title: "   ",
    setupNotes: "",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    seriesId: "Choose a series.",
    trackId: "Choose a track.",
    title: "Name this setup note.",
  });
});

test("seeds only the four confirmed game series", () => {
  assert.deepEqual(
    SERIES_SEED.map((series) => series.shortCode),
    ["CUP", "XFI", "TRK", "ARCA"],
  );
  assert.ok(SERIES_SEED.every((series) => series.maintenanceStatus === "manual"));
});

test("uses the reviewed 31-record official track catalog without invented dimensions", () => {
  const uniqueNames = new Set(TRACK_SEED.map((track) => track.name));
  const portland = TRACK_SEED.find(
    (track) => track.name === "Portland International Raceway",
  );

  assert.equal(TRACK_SEED.length, 31);
  assert.equal(uniqueNames.size, 31);
  assert.deepEqual(portland?.seriesCodes, ["XFI", "ARCA"]);
  assert.deepEqual(
    Object.fromEntries(
      ["CUP", "XFI", "TRK", "ARCA"].map((code) => [
        code,
        TRACK_SEED.filter((track) => track.seriesCodes.includes(code)).length,
      ]),
    ),
    { CUP: 27, XFI: 25, TRK: 23, ARCA: 17 },
  );
  assert.ok(
    TRACK_SEED.every(
      (track) =>
        track.layoutType === "unclassified" &&
        track.lengthMiles === null &&
        track.reviewedAt === "2026-08-14" &&
        track.sourceUrl.startsWith("https://nascar25.com/"),
    ),
  );
  assert.match(portland?.notes ?? "", /Quick Race and Online for Xfinity and ARCA/);
  assert.equal(
    portland?.sourceUrl,
    "https://nascar25.com/release-notes-jan-21-2026/",
  );
  assert.match(
    TRACK_SEED.find((track) => track.name === "Michigan Speedway")?.notes ?? "",
    /publisher catalog reviewed August 14, 2026 omits Xfinity/i,
  );
});

test("transcribes the current official NASCAR 25 driver gallery without stale ratings", () => {
  assert.equal(DRIVER_SEED.length, 204);
  assert.deepEqual(
    Object.fromEntries(
      ["CUP", "XFI", "TRK", "ARCA"].map((code) => [
        code,
        DRIVER_SEED.filter((driver) => driver.seriesCode === code).length,
      ]),
    ),
    { CUP: 47, XFI: 50, TRK: 49, ARCA: 58 },
  );

  const identities = new Set(
    DRIVER_SEED.map(
      (driver) => `${driver.seriesCode}\u0000${driver.carNumber}\u0000${driver.name}`,
    ),
  );
  assert.equal(identities.size, DRIVER_SEED.length);
  assert.ok(DRIVER_SEED.every((driver) => driver.inGameRating === null));
  assert.ok(
    DRIVER_SEED.every((driver) => driver.sourceUrl === CURRENT_DRIVER_GALLERY_SOURCE.url),
  );
  assert.deepEqual(Object.keys(DRIVER_ROSTER_SOURCES), ["CUP", "XFI", "TRK", "ARCA"]);
  assert.ok(
    Object.values(DRIVER_ROSTER_SOURCES).every((source) =>
      source.url.startsWith("https://nascar25.com/nascar-25-driver-roster-"),
    ),
  );

  assert.ok(
    DRIVER_SEED.some(
      (driver) =>
        driver.seriesCode === "TRK" &&
        driver.carNumber === "44" &&
        driver.name === "Bayley Currey",
    ),
  );
  assert.ok(
    DRIVER_SEED.some(
      (driver) =>
        driver.seriesCode === "ARCA" &&
        driver.team === "Pinnacle Racing Group",
    ),
  );
  for (const name of [
    "BJ McLeod",
    "Dawson Cram",
    "Nick Leitz",
    "Brad Perez",
    "Caesar Bacarella",
    "Jesse Iwuji",
    "Caleb Costner",
    "Greg Van Alst",
  ]) {
    assert.ok(DRIVER_SEED.some((driver) => driver.name === name));
  }
});

test("requires a manually entered driver name and at least one series", () => {
  const result = validateDriverInput({ name: " ", seriesIds: [] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    name: "Enter a driver name.",
    seriesIds: "Choose at least one series.",
  });
});

test("accepts nullable manually sourced driver details", () => {
  const result = validateDriverInput({
    name: "Manual reference driver",
    seriesIds: [1, 2],
    team: "Reference team",
    carNumber: "00",
    manufacturer: "Reference manufacturer",
    inGameRating: null,
    ratingSourceUrl: "",
    notes: "Entered manually.",
    reviewedAt: "2026-08-14",
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.inGameRating, null);
});

test("rejects an unclassified manual track without a name or series", () => {
  const result = validateTrackInput({
    name: "",
    seriesIds: [],
    layoutType: "unclassified",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    name: "Enter a track name.",
    seriesIds: "Choose at least one series.",
  });
});

test("requires schedule records to be clearly dated real-world references", () => {
  const result = validateScheduleInput({
    season: 2026,
    seriesId: 1,
    trackId: 2,
    eventName: "",
    raceDate: "not-a-date",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    eventName: "Enter the real-world event name.",
    raceDate: "Enter the real-world race date.",
  });
});

test("seeds a dated 2026 real-world Cup schedule without forcing absent tracks into the game catalog", () => {
  assert.equal(SCHEDULE_SEED.length, 38);
  assert.ok(SCHEDULE_SEED.every((event) => event.season === 2026 && event.seriesCode === "CUP"));
  assert.equal(
    SCHEDULE_SEED.find((event) => event.eventName === "NASCAR Cup Series Race at Chicagoland")?.trackName,
    null,
  );
  assert.match(
    SCHEDULE_SEED.find((event) => event.eventName === "Cook Out Clash at Bowman Gray Stadium")?.notes ?? "",
    /exhibition\/non-points/i,
  );
  assert.ok(SCHEDULE_SEED.every((event) => event.reviewedAt === "2026-08-14"));
  assert.ok(
    SCHEDULE_SEED.every(
      (event) => event.trackName === null || TRACK_SEED.some((track) => track.name === event.trackName),
    ),
  );
});
