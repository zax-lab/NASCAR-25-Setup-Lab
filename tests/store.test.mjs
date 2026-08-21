import assert from "node:assert/strict";
import test from "node:test";

import {
  createStore,
  createStoreFromSeed,
  createIndexedDbDocumentAdapter,
  createAppStore,
  migrateLegacyData,
  readLegacyIndexedDb,
  toBootstrapPayload,
} from "../lib/store.js";

const NOW = "2026-08-15T12:00:00.000Z";

const seed = {
  series: [
    {
      id: 1,
      name: "NASCAR Cup Series",
      shortCode: "CUP",
      maintenanceStatus: "manual",
      sourceUrl: null,
      reviewedAt: "2026-08-14",
    },
  ],
  drivers: [
    {
      id: 1,
      name: "Test Driver",
      seriesIds: [1],
      team: null,
      carNumber: "1",
      manufacturer: null,
      inGameRating: null,
      ratingSourceUrl: null,
      notes: "",
      reviewedAt: "2026-08-14",
      createdAt: "2026-08-14T00:00:00.000Z",
    },
  ],
  tracks: [
    {
      id: 1,
      name: "Test Track",
      seriesIds: [1],
      layoutType: "intermediate",
      lengthMiles: 1.5,
      bankingNotes: "",
      notes: "",
      sourceUrl: null,
      reviewedAt: "2026-08-14",
      createdAt: "2026-08-14T00:00:00.000Z",
    },
  ],
  schedule: [
    {
      id: 1,
      season: 2026,
      seriesId: 1,
      trackId: 1,
      eventName: "Test 400",
      raceDate: "2026-08-15",
      notes: "",
      sourceUrl: null,
      reviewedAt: "2026-08-14",
      createdAt: "2026-08-14T00:00:00.000Z",
    },
  ],
  races: [],
  setups: [],
};

test("creates the exact versioned root shape and timestamps every stored record", () => {
  const root = createStoreFromSeed(seed, NOW);

  assert.deepEqual(Object.keys(root), [
    "schemaVersion",
    "sessions",
    "setups",
    "tracks",
    "drivers",
    "meta",
  ]);
  assert.equal(root.schemaVersion, 2);
  assert.deepEqual(root.sessions, []);
  assert.deepEqual(root.setups, []);

  for (const record of [
    ...root.tracks,
    ...root.drivers,
    ...root.meta.series,
    ...root.meta.schedule,
  ]) {
    assert.ok(record.id !== undefined);
    assert.ok(record.createdAt);
    assert.ok(record.updatedAt);
  }
});

test("migrates legacy races into sessions and links every setup to a session", () => {
  const legacy = {
    ...seed,
    races: [
      {
        id: 1,
        seriesId: 1,
        trackId: 1,
        raceDate: "2026-08-15",
        startPosition: 8,
        finishPosition: 3,
        fieldSize: 36,
        lapsLed: 4,
        incidents: 0,
        stageResults: "7 / 5",
        setupId: 10,
        incidentX: null,
        incidentY: null,
        notes: "Free late in the run",
        createdAt: "2026-08-15T10:00:00.000Z",
      },
    ],
    setups: [
      {
        id: 10,
        seriesId: 1,
        trackId: 1,
        title: "Race trim",
        setupNotes: "Wedge 49.5",
        createdAt: "2026-08-15T09:00:00.000Z",
      },
      {
        id: 11,
        seriesId: 1,
        trackId: 1,
        title: "Unlinked test",
        setupNotes: "RF pressure 24",
        createdAt: "2026-08-14T09:00:00.000Z",
      },
    ],
  };

  const root = migrateLegacyData(legacy, seed, NOW);
  const race = root.sessions.find((session) => session.id === 1);
  const practice = root.sessions.find((session) => session.sessionType === "practice");

  assert.equal(race.sessionType, "race");
  assert.equal(race.sessionDate, "2026-08-15");
  assert.equal(race.finishPosition, 3);
  assert.equal(race.averageLapSeconds, null);
  assert.equal(race.tireNotes, "");
  assert.equal(root.setups.find((setup) => setup.id === 10).sessionId, race.id);
  assert.ok(practice);
  assert.equal(root.setups.find((setup) => setup.id === 11).sessionId, practice.id);

  for (const record of [...root.sessions, ...root.setups]) {
    assert.ok(record.id !== undefined);
    assert.ok(record.createdAt);
    assert.ok(record.updatedAt);
  }
});

function memoryDocuments() {
  const documents = new Map();
  return {
    documents,
    adapter: {
      async readDocument(key) {
        return documents.has(key) ? structuredClone(documents.get(key)) : null;
      },
      async writeDocument(key, value) {
        documents.set(key, structuredClone(value));
      },
      async deleteDocument(key) {
        documents.delete(key);
      },
    },
  };
}

test("get, set, list, and delete operate on the single canonical root", async () => {
  const { adapter, documents } = memoryDocuments();
  let currentTime = NOW;
  const records = createStore(adapter, {
    clock: () => currentTime,
    readLegacy: async () => null,
  });
  await records.initialize(seed);

  assert.equal(documents.size, 1);
  assert.equal((await records.list("tracks")).length, 1);
  assert.equal((await records.get("tracks", 1)).name, "Test Track");

  const added = await records.set("drivers", {
    name: "Second Driver",
    seriesIds: [1],
    team: null,
    carNumber: "2",
    manufacturer: null,
    inGameRating: null,
    ratingSourceUrl: null,
    notes: "",
    reviewedAt: null,
  });
  assert.equal(added.id, 2);
  assert.equal(added.createdAt, NOW);
  assert.equal(added.updatedAt, NOW);

  currentTime = "2026-08-15T13:00:00.000Z";
  const updated = await records.set("drivers", { ...added, team: "Updated Team" });
  assert.equal(updated.createdAt, NOW);
  assert.equal(updated.updatedAt, currentTime);
  assert.equal((await records.get("drivers", 2)).team, "Updated Team");

  await records.delete("drivers", 2);
  assert.equal(await records.get("drivers", 2), null);
  assert.equal(documents.size, 1);
});

test("initialization keeps the untouched per-mode data under the legacy key", async () => {
  const { adapter, documents } = memoryDocuments();
  const legacy = {
    ...seed,
    races: [],
    setups: [],
    meta: [{ key: "reference-seed", value: "legacy-seed" }],
  };
  const records = createStore(adapter, {
    clock: () => NOW,
    readLegacy: async () => legacy,
  });

  await records.initialize(seed);

  assert.deepEqual(documents.get("legacy-v1"), legacy);
  assert.equal(documents.get("root").meta.referenceSeed, "legacy-seed");
});

test("exports and imports the complete root while backing up the replaced root", async () => {
  const { adapter, documents } = memoryDocuments();
  const records = createStore(adapter, {
    clock: () => NOW,
    readLegacy: async () => null,
  });
  await records.initialize(seed);
  const before = structuredClone(documents.get("root"));

  const exported = await records.exportJson();
  const fileRoot = JSON.parse(exported);
  assert.deepEqual(Object.keys(fileRoot), [
    "schemaVersion",
    "sessions",
    "setups",
    "tracks",
    "drivers",
    "meta",
  ]);

  fileRoot.drivers[0].name = "Imported Driver";
  await records.importJson(JSON.stringify(fileRoot));

  assert.equal((await records.get("drivers", 1)).name, "Imported Driver");
  assert.deepEqual(documents.get(`legacy-import-${NOW}`), before);
});

test("rejects malformed or dangling imports without replacing the current root", async () => {
  const { adapter, documents } = memoryDocuments();
  const records = createStore(adapter, {
    clock: () => NOW,
    readLegacy: async () => null,
  });
  await records.initialize(seed);
  const before = structuredClone(documents.get("root"));
  const invalid = structuredClone(before);
  invalid.sessions.push({
    id: 1,
    createdAt: NOW,
    updatedAt: NOW,
    sessionType: "practice",
    seriesId: 1,
    trackId: 999,
    sessionDate: "2026-08-15",
    averageLapSeconds: null,
    bestLapSeconds: null,
    tireNotes: "",
    notes: "",
  });

  await assert.rejects(records.importJson(JSON.stringify(invalid)), /unknown track/i);
  assert.deepEqual(documents.get("root"), before);
  assert.equal(documents.size, 1);
});

test("projects canonical race sessions into the unchanged screen data contract", () => {
  const legacy = {
    ...seed,
    races: [
      {
        id: 1,
        seriesId: 1,
        trackId: 1,
        raceDate: "2026-08-15",
        startPosition: 5,
        finishPosition: 2,
        fieldSize: 36,
        lapsLed: 8,
        incidents: 0,
        stageResults: null,
        setupId: 10,
        incidentX: null,
        incidentY: null,
        notes: "",
        createdAt: NOW,
      },
    ],
    setups: [
      {
        id: 10,
        seriesId: 1,
        trackId: 1,
        title: "Race setup",
        setupNotes: "Wedge 49.5",
        createdAt: NOW,
      },
    ],
  };
  const root = migrateLegacyData(legacy, seed, NOW);

  const view = toBootstrapPayload(root);

  assert.equal(view.races.length, 1);
  assert.equal(view.races[0].raceDate, "2026-08-15");
  assert.equal(view.races[0].setupId, 10);
  assert.equal(view.setups[0].sessionId, 1);
  assert.equal(view.series[0].shortCode, "CUP");
  assert.equal(view.schedule[0].eventName, "Test 400");
});

test("keeps an unfinished race session out of completed race views", () => {
  const root = createStoreFromSeed(seed, NOW);
  root.sessions.push({
    id: 1,
    createdAt: NOW,
    updatedAt: NOW,
    sessionType: "race",
    seriesId: 1,
    trackId: 1,
    sessionDate: "2026-08-15",
    startPosition: null,
    finishPosition: null,
    fieldSize: null,
    lapsLed: null,
    incidents: null,
    stageResults: null,
    incidentX: null,
    incidentY: null,
    averageLapSeconds: null,
    bestLapSeconds: null,
    tireNotes: "",
    notes: "",
  });

  assert.deepEqual(toBootstrapPayload(root).races, []);
});

test("imports an existing version-1 backup through the same lossless migration", async () => {
  const { adapter } = memoryDocuments();
  const records = createStore(adapter, {
    clock: () => NOW,
    readLegacy: async () => null,
  });
  await records.initialize(seed);
  const legacy = {
    ...seed,
    races: [
      {
        id: 1,
        seriesId: 1,
        trackId: 1,
        raceDate: "2026-08-15",
        startPosition: 12,
        finishPosition: 6,
        fieldSize: 36,
        lapsLed: 0,
        incidents: 1,
        stageResults: null,
        setupId: null,
        incidentX: null,
        incidentY: null,
        notes: "Legacy import",
        createdAt: NOW,
      },
    ],
    setups: [],
  };
  const backup = JSON.stringify({
    kind: "n25-companion-backup",
    version: 1,
    exportedAt: NOW,
    data: legacy,
  });

  await records.importJson(backup);

  const sessions = await records.list("sessions");
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sessionType, "race");
  assert.equal(sessions[0].finishPosition, 6);
});

test("browser persistence fails explicitly when IndexedDB is unavailable", async () => {
  const adapter = createIndexedDbDocumentAdapter(undefined);

  await assert.rejects(adapter.readDocument("root"), /IndexedDB is unavailable/);
  await assert.rejects(readLegacyIndexedDb(undefined), /IndexedDB is unavailable/);
});

test("the compatibility layer writes races and setups into shared sessions", async () => {
  const { adapter } = memoryDocuments();
  const records = createStore(adapter, {
    clock: () => NOW,
    readLegacy: async () => null,
  });
  const appStore = createAppStore(records);
  await appStore.load(seed);

  const setup = await appStore.put("setups", {
    seriesId: 1,
    trackId: 1,
    title: "Shared-session setup",
    setupNotes: "Wedge 49.5",
  });
  const setupSession = await records.get("sessions", setup.sessionId);
  assert.equal(setupSession.sessionType, "practice");

  const race = await appStore.put("races", {
    seriesId: 1,
    trackId: 1,
    raceDate: "2026-08-15",
    startPosition: 10,
    finishPosition: 4,
    fieldSize: 36,
    lapsLed: 2,
    incidents: 0,
    stageResults: null,
    setupId: setup.id,
    incidentX: null,
    incidentY: null,
    notes: "",
  });

  assert.equal(race.setupId, setup.id);
  assert.equal((await records.get("setups", setup.id)).sessionId, race.id);
  assert.equal((await appStore.snapshot()).races.length, 1);

  await appStore.delete("races", race.id);
  const preservedSetup = await records.get("setups", setup.id);
  assert.ok(preservedSetup);
  assert.equal((await records.get("sessions", preservedSetup.sessionId)).sessionType, "practice");
  assert.equal((await appStore.snapshot()).races.length, 0);
});

test("a current session connects setup deltas, pace notes, and race results without duplication", async () => {
  const { adapter } = memoryDocuments();
  const records = createStore(adapter, {
    clock: () => NOW,
    readLegacy: async () => null,
  });
  const appStore = createAppStore(records);
  await appStore.load(seed);

  const current = await appStore.createSession({
    sessionType: "race",
    seriesId: 1,
    trackId: 1,
    sessionDate: "2026-08-15",
    averageLapSeconds: 30.8,
    bestLapSeconds: 30.3,
    tireNotes: "RF faded after 20 laps",
    notes: "Race trim test",
  });
  await appStore.setCurrentSession(current.id);
  const setup = await appStore.saveSetupDelta({
    title: "Race trim v2",
    setupNotes: "Wedge -0.5",
  });
  const race = await appStore.recordRaceResult({
    sessionId: current.id,
    startPosition: 9,
    finishPosition: 3,
    fieldSize: 36,
    lapsLed: 4,
    incidents: 0,
    stageResults: "6 / 4",
    incidentX: null,
    incidentY: null,
    notes: "Passed on the final restart",
  });

  const root = JSON.parse(await appStore.exportJson());
  assert.equal(root.sessions.length, 1);
  assert.equal(root.sessions[0].id, current.id);
  assert.equal(root.sessions[0].finishPosition, 3);
  assert.equal(root.sessions[0].averageLapSeconds, 30.8);
  assert.equal(root.sessions[0].tireNotes, "RF faded after 20 laps");
  assert.equal(root.setups[0].id, setup.id);
  assert.equal(root.setups[0].sessionId, current.id);
  assert.equal(race.id, current.id);
  assert.equal((await appStore.snapshot()).currentSessionId, current.id);
});
