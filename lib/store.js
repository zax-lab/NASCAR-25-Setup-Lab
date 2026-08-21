export const SCHEMA_VERSION = 2;

function timestamp(value, fallback) {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

function withTimestamps(record, now) {
  const createdAt = timestamp(record.createdAt, now);
  return {
    ...record,
    createdAt,
    updatedAt: timestamp(record.updatedAt, createdAt),
  };
}

export function createStoreFromSeed(seed, now = new Date().toISOString()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    sessions: [],
    setups: [],
    tracks: seed.tracks.map((record) => withTimestamps(record, now)),
    drivers: seed.drivers.map((record) => withTimestamps(record, now)),
    meta: {
      createdAt: now,
      updatedAt: now,
      referenceSeed: "official-catalog-reviewed-2026-08-14-r5",
      migratedAt: null,
      currentSessionId: null,
      series: seed.series.map((record) => withTimestamps(record, now)),
      schedule: seed.schedule.map((record) => withTimestamps(record, now)),
    },
  };
}

function legacyRaceToSession(race, now) {
  const createdAt = timestamp(race.createdAt, now);
  return {
    id: race.id,
    createdAt,
    updatedAt: createdAt,
    sessionType: "race",
    seriesId: race.seriesId,
    trackId: race.trackId,
    sessionDate: race.raceDate,
    startPosition: race.startPosition,
    finishPosition: race.finishPosition,
    fieldSize: race.fieldSize ?? null,
    lapsLed: race.lapsLed ?? null,
    incidents: race.incidents ?? null,
    stageResults: race.stageResults ?? null,
    incidentX: race.incidentX ?? null,
    incidentY: race.incidentY ?? null,
    averageLapSeconds: null,
    bestLapSeconds: null,
    tireNotes: "",
    notes: race.notes ?? "",
  };
}

function setupOnlySession(setup, id, now) {
  const createdAt = timestamp(setup.createdAt, now);
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    sessionType: "practice",
    seriesId: setup.seriesId,
    trackId: setup.trackId,
    sessionDate: createdAt.slice(0, 10),
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
  };
}

export function migrateLegacyData(legacy, seed, now = new Date().toISOString()) {
  const source = {
    series: Array.isArray(legacy.series) ? legacy.series : seed.series,
    drivers: Array.isArray(legacy.drivers) ? legacy.drivers : seed.drivers,
    tracks: Array.isArray(legacy.tracks) ? legacy.tracks : seed.tracks,
    schedule: Array.isArray(legacy.schedule) ? legacy.schedule : seed.schedule,
    races: Array.isArray(legacy.races) ? legacy.races : [],
    setups: Array.isArray(legacy.setups) ? legacy.setups : [],
  };
  const root = createStoreFromSeed(source, now);
  root.sessions = source.races.map((race) => legacyRaceToSession(race, now));

  let nextSessionId = Math.max(0, ...root.sessions.map((session) => session.id)) + 1;
  let nextSetupId = Math.max(0, ...source.setups.map((setup) => setup.id)) + 1;
  const migratedSetups = [];

  for (const setup of source.setups) {
    const linkedRaces = source.races.filter((race) => race.setupId === setup.id);
    if (linkedRaces.length === 0) {
      const session = setupOnlySession(setup, nextSessionId, now);
      nextSessionId += 1;
      root.sessions.push(session);
      migratedSetups.push({
        ...withTimestamps(setup, now),
        sessionId: session.id,
      });
      continue;
    }

    linkedRaces.forEach((race, index) => {
      migratedSetups.push({
        ...withTimestamps(setup, now),
        id: index === 0 ? setup.id : nextSetupId++,
        sessionId: race.id,
      });
    });
  }

  root.setups = migratedSetups;
  root.meta.migratedAt = now;
  root.meta.currentSessionId = null;
  root.meta.updatedAt = now;
  root.meta.referenceSeed = Array.isArray(legacy.meta)
    ? legacy.meta.find((entry) => entry?.key === "reference-seed")?.value ?? root.meta.referenceSeed
    : root.meta.referenceSeed;
  return root;
}

export const ROOT_KEY = "root";
export const LEGACY_BACKUP_KEY = "legacy-v1";
export const CANONICAL_DB_NAME = "n25-setup-lab-store";
const DOCUMENT_STORE = "documents";
const LEGACY_DB_NAME = "n25-companion";

function clone(value) {
  return structuredClone(value);
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("Device storage request failed.")),
      { once: true },
    );
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("Device storage transaction was cancelled.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("Device storage transaction failed.")),
      { once: true },
    );
  });
}

function requireIndexedDb(indexedDb) {
  if (!indexedDb) throw new Error("IndexedDB is unavailable in this browser.");
  return indexedDb;
}

function openCanonicalDb(indexedDb) {
  const factory = requireIndexedDb(indexedDb);
  return new Promise((resolve, reject) => {
    const request = factory.open(CANONICAL_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
        database.createObjectStore(DOCUMENT_STORE, { keyPath: "key" });
      }
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("Could not open canonical device storage.")),
      { once: true },
    );
  });
}

export function createIndexedDbDocumentAdapter(indexedDb = globalThis.indexedDB) {
  return {
    async readDocument(key) {
      const database = await openCanonicalDb(indexedDb);
      try {
        const transaction = database.transaction(DOCUMENT_STORE, "readonly");
        const record = await requestValue(transaction.objectStore(DOCUMENT_STORE).get(key));
        await transactionComplete(transaction);
        return record?.value ?? null;
      } finally {
        database.close();
      }
    },
    async writeDocument(key, value) {
      const database = await openCanonicalDb(indexedDb);
      try {
        const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
        transaction.objectStore(DOCUMENT_STORE).put({ key, value });
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async deleteDocument(key) {
      const database = await openCanonicalDb(indexedDb);
      try {
        const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
        transaction.objectStore(DOCUMENT_STORE).delete(key);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
  };
}

export async function readLegacyIndexedDb(indexedDb = globalThis.indexedDB) {
  const factory = requireIndexedDb(indexedDb);
  let createdEmptyDatabase = false;
  const database = await new Promise((resolve, reject) => {
    const request = factory.open(LEGACY_DB_NAME);
    request.addEventListener("upgradeneeded", () => {
      createdEmptyDatabase = true;
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("Could not inspect legacy device storage.")),
      { once: true },
    );
  });

  const names = ["series", "drivers", "tracks", "schedule", "races", "setups", "meta"]
    .filter((name) => database.objectStoreNames.contains(name));
  if (names.length === 0) {
    database.close();
    if (createdEmptyDatabase) factory.deleteDatabase(LEGACY_DB_NAME);
    return null;
  }

  try {
    const transaction = database.transaction(names, "readonly");
    const entries = await Promise.all(
      names.map(async (name) => [name, await requestValue(transaction.objectStore(name).getAll())]),
    );
    await transactionComplete(transaction);
    return Object.fromEntries(entries);
  } finally {
    database.close();
  }
}

function collection(root, name) {
  if (["sessions", "setups", "tracks", "drivers"].includes(name)) return root[name];
  if (name === "series" || name === "schedule") return root.meta[name];
  throw new Error(`Unknown store collection: ${name}`);
}

function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateRecords(records, label) {
  const ids = new Set();
  for (const record of records) {
    if (!object(record) || !Number.isInteger(record.id) || record.id < 1) {
      throw new Error(`Canonical store contains an invalid ${label} ID.`);
    }
    if (ids.has(record.id)) throw new Error(`Canonical store contains a duplicate ${label} ID.`);
    if (!validTimestamp(record.createdAt) || !validTimestamp(record.updatedAt)) {
      throw new Error(`Canonical store contains an invalid ${label} timestamp.`);
    }
    ids.add(record.id);
  }
  return ids;
}

export function validateCanonicalRoot(root) {
  if (!object(root)) throw new Error("Canonical store root is missing.");
  const expectedKeys = ["schemaVersion", "sessions", "setups", "tracks", "drivers", "meta"];
  if (JSON.stringify(Object.keys(root)) !== JSON.stringify(expectedKeys)) {
    throw new Error("Canonical store root has an unsupported shape.");
  }
  if (root.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Canonical store schema version is not supported.");
  }
  for (const name of ["sessions", "setups", "tracks", "drivers"]) {
    if (!Array.isArray(root[name])) throw new Error(`Canonical store is missing ${name}.`);
  }
  if (
    !object(root.meta) ||
    !Array.isArray(root.meta.series) ||
    !Array.isArray(root.meta.schedule) ||
    !validTimestamp(root.meta.createdAt) ||
    !validTimestamp(root.meta.updatedAt)
  ) {
    throw new Error("Canonical store metadata is invalid.");
  }

  const seriesIds = validateRecords(root.meta.series, "series");
  const trackIds = validateRecords(root.tracks, "track");
  const sessionIds = validateRecords(root.sessions, "session");
  validateRecords(root.setups, "setup");
  validateRecords(root.drivers, "driver");
  validateRecords(root.meta.schedule, "schedule");

  for (const track of root.tracks) {
    if (!Array.isArray(track.seriesIds) || track.seriesIds.some((id) => !seriesIds.has(id))) {
      throw new Error("Canonical track references an unknown series.");
    }
  }
  for (const driver of root.drivers) {
    if (!Array.isArray(driver.seriesIds) || driver.seriesIds.some((id) => !seriesIds.has(id))) {
      throw new Error("Canonical driver references an unknown series.");
    }
  }
  for (const session of root.sessions) {
    if (!["practice", "qualifying", "race"].includes(session.sessionType)) {
      throw new Error("Canonical session has an invalid type.");
    }
    if (!seriesIds.has(session.seriesId)) {
      throw new Error("Canonical session references an unknown series.");
    }
    if (!trackIds.has(session.trackId)) {
      throw new Error("Canonical session references an unknown track.");
    }
    if (typeof session.sessionDate !== "string") {
      throw new Error("Canonical session date is missing.");
    }
  }
  for (const setup of root.setups) {
    if (!sessionIds.has(setup.sessionId)) {
      throw new Error("Canonical setup references an unknown session.");
    }
    if (!trackIds.has(setup.trackId)) {
      throw new Error("Canonical setup references an unknown track.");
    }
    const session = root.sessions.find((record) => record.id === setup.sessionId);
    if (session.seriesId !== setup.seriesId || session.trackId !== setup.trackId) {
      throw new Error("Canonical setup must match its linked session.");
    }
  }
  if (
    root.meta.currentSessionId !== undefined &&
    root.meta.currentSessionId !== null &&
    !sessionIds.has(root.meta.currentSessionId)
  ) {
    throw new Error("Canonical current session references an unknown session.");
  }
  for (const event of root.meta.schedule) {
    if (!seriesIds.has(event.seriesId)) {
      throw new Error("Canonical schedule record references an unknown series.");
    }
    if (event.trackId !== null && !trackIds.has(event.trackId)) {
      throw new Error("Canonical schedule record references an unknown track.");
    }
  }
  return root;
}

export function parseCanonicalJson(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Choose a valid NASCAR 25 Setup Lab JSON file.");
  }
  return validateCanonicalRoot(parsed);
}

export function toBootstrapPayload(root) {
  return {
    series: clone(root.meta.series),
    drivers: clone(root.drivers),
    tracks: clone(root.tracks),
    schedule: clone(root.meta.schedule),
    sessions: clone(root.sessions),
    currentSessionId: root.meta.currentSessionId ?? null,
    races: root.sessions
      .filter(
        (session) =>
          session.sessionType === "race" &&
          Number.isInteger(session.startPosition) &&
          Number.isInteger(session.finishPosition),
      )
      .map((session) => ({
        id: session.id,
        seriesId: session.seriesId,
        trackId: session.trackId,
        raceDate: session.sessionDate,
        startPosition: session.startPosition,
        finishPosition: session.finishPosition,
        fieldSize: session.fieldSize,
        lapsLed: session.lapsLed,
        incidents: session.incidents,
        stageResults: session.stageResults,
        setupId: root.setups.find((setup) => setup.sessionId === session.id)?.id ?? null,
        incidentX: session.incidentX,
        incidentY: session.incidentY,
        notes: session.notes,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    setups: clone(root.setups),
  };
}

export function createStore(adapter, options = {}) {
  const clock = options.clock ?? (() => new Date().toISOString());
  const readLegacy = options.readLegacy ?? (async () => null);
  let writeQueue = Promise.resolve();
  let seedForMigration = null;

  async function readRoot() {
    await writeQueue;
    const root = await adapter.readDocument(ROOT_KEY);
    if (!root) throw new Error("Canonical store has not been initialized.");
    return validateCanonicalRoot(root);
  }

  function mutate(change) {
    const job = writeQueue.then(async () => {
      const root = await adapter.readDocument(ROOT_KEY);
      if (!root) throw new Error("Canonical store has not been initialized.");
      const draft = clone(root);
      const result = await change(draft);
      draft.meta.updatedAt = clock();
      validateCanonicalRoot(draft);
      await adapter.writeDocument(ROOT_KEY, draft);
      return clone(result);
    });
    writeQueue = job.then(() => undefined, () => undefined);
    return job;
  }

  return {
    async initialize(seed) {
      seedForMigration = seed;
      const existing = await adapter.readDocument(ROOT_KEY);
      if (existing) return clone(existing);
      const legacy = await readLegacy();
      const now = clock();
      const root = legacy
        ? migrateLegacyData(legacy, seed, now)
        : createStoreFromSeed(seed, now);
      validateCanonicalRoot(root);
      if (legacy) await adapter.writeDocument(LEGACY_BACKUP_KEY, legacy);
      await adapter.writeDocument(ROOT_KEY, root);
      return clone(root);
    },
    async get(name, id) {
      const root = await readRoot();
      return clone(collection(root, name).find((record) => record.id === id) ?? null);
    },
    async set(name, input) {
      return mutate((root) => {
        const records = collection(root, name);
        const existing = input.id === undefined
          ? null
          : records.find((record) => record.id === input.id) ?? null;
        const now = clock();
        const id = existing?.id ?? input.id ?? Math.max(0, ...records.map((record) => record.id)) + 1;
        const record = {
          ...existing,
          ...input,
          id,
          createdAt: existing?.createdAt ?? timestamp(input.createdAt, now),
          updatedAt: now,
        };
        const index = records.findIndex((item) => item.id === id);
        if (index === -1) records.push(record);
        else records[index] = record;
        return record;
      });
    },
    async list(name) {
      const root = await readRoot();
      return clone(collection(root, name));
    },
    async setMeta(patch) {
      return mutate((root) => {
        root.meta = { ...root.meta, ...patch };
        return clone(root.meta);
      });
    },
    async delete(name, id) {
      return mutate((root) => {
        const records = collection(root, name);
        const index = records.findIndex((record) => record.id === id);
        if (index !== -1) records.splice(index, 1);
        return null;
      });
    },
    async exportJson() {
      const root = await readRoot();
      return JSON.stringify(root, null, 2);
    },
    async importJson(json) {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error("Choose a valid NASCAR 25 Setup Lab JSON file.");
      }
      const now = clock();
      const imported = parsed?.kind === "n25-companion-backup" && parsed?.version === 1
        ? migrateLegacyData(parsed.data, seedForMigration, now)
        : clone(validateCanonicalRoot(parsed));
      validateCanonicalRoot(imported);
      const backupKey = `legacy-import-${now}`;
      const job = writeQueue.then(async () => {
        const current = await adapter.readDocument(ROOT_KEY);
        if (!current) throw new Error("Canonical store has not been initialized.");
        await adapter.writeDocument(backupKey, current);
        await adapter.writeDocument(ROOT_KEY, imported);
        return clone(imported);
      });
      writeQueue = job.then(() => undefined, () => undefined);
      return job;
    },
  };
}

function blankSession(input) {
  return {
    sessionType: input.sessionType,
    seriesId: input.seriesId,
    trackId: input.trackId,
    sessionDate: input.sessionDate,
    startPosition: input.startPosition ?? null,
    finishPosition: input.finishPosition ?? null,
    fieldSize: input.fieldSize ?? null,
    lapsLed: input.lapsLed ?? null,
    incidents: input.incidents ?? null,
    stageResults: input.stageResults ?? null,
    incidentX: input.incidentX ?? null,
    incidentY: input.incidentY ?? null,
    averageLapSeconds: input.averageLapSeconds ?? null,
    bestLapSeconds: input.bestLapSeconds ?? null,
    tireNotes: input.tireNotes ?? "",
    notes: input.notes ?? "",
  };
}

function raceView(session, setupId = null) {
  return {
    id: session.id,
    seriesId: session.seriesId,
    trackId: session.trackId,
    raceDate: session.sessionDate,
    startPosition: session.startPosition,
    finishPosition: session.finishPosition,
    fieldSize: session.fieldSize,
    lapsLed: session.lapsLed,
    incidents: session.incidents,
    stageResults: session.stageResults,
    setupId,
    incidentX: session.incidentX,
    incidentY: session.incidentY,
    notes: session.notes,
    createdAt: session.createdAt,
  };
}

export function createAppStore(records) {
  async function snapshot() {
    return toBootstrapPayload(JSON.parse(await records.exportJson()));
  }

  return {
    async load(seed) {
      return toBootstrapPayload(await records.initialize(seed));
    },
    async put(name, input) {
      if (name === "races") {
        return this.recordRaceResult(input);
      }
      if (name === "setups") {
        const date = typeof input.createdAt === "string"
          ? input.createdAt.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const session = await this.createSession({
          sessionType: "practice",
          seriesId: input.seriesId,
          trackId: input.trackId,
          sessionDate: date,
        });
        return this.saveSetupDelta({ ...input, sessionId: session.id });
      }
      return records.set(name, input);
    },
    async createSession(input) {
      const session = await records.set("sessions", blankSession(input));
      await records.setMeta({ currentSessionId: session.id });
      return session;
    },
    async updateSession(sessionId, input) {
      const existing = await records.get("sessions", sessionId);
      if (!existing) throw new Error("Session record not found.");
      return records.set("sessions", {
        ...existing,
        ...input,
        id: sessionId,
      });
    },
    async setCurrentSession(sessionId) {
      if (sessionId === null) {
        await records.setMeta({ currentSessionId: null });
        return null;
      }
      const session = await records.get("sessions", sessionId);
      if (!session) throw new Error("Session record not found.");
      await records.setMeta({ currentSessionId: session.id });
      return session;
    },
    async saveSetupDelta(input) {
      const root = JSON.parse(await records.exportJson());
      const sessionId = input.sessionId ?? root.meta.currentSessionId;
      const session = root.sessions.find((record) => record.id === sessionId);
      if (!session) throw new Error("Choose or create a current session first.");
      const existing = input.id === undefined
        ? null
        : root.setups.find((record) => record.id === input.id) ?? null;
      return records.set("setups", {
        ...existing,
        ...input,
        id: input.id,
        sessionId: session.id,
        seriesId: session.seriesId,
        trackId: session.trackId,
      });
    },
    async recordRaceResult(input) {
      const root = JSON.parse(await records.exportJson());
      const requestedSessionId = input.sessionId ?? root.meta.currentSessionId;
      const existing = root.sessions.find((record) => record.id === requestedSessionId) ?? null;
      const session = existing
        ? await records.set("sessions", {
          ...existing,
          ...blankSession({
            ...existing,
            ...input,
            sessionType: "race",
            sessionDate: input.raceDate ?? existing.sessionDate,
          }),
          id: existing.id,
        })
        : await records.set("sessions", blankSession({
          ...input,
          sessionType: "race",
          sessionDate: input.raceDate,
        }));
      let setupId = input.setupId ?? null;
      if (setupId !== null) {
        const setup = await records.get("setups", setupId);
        if (setup) {
          await records.set("setups", {
            ...setup,
            sessionId: session.id,
            seriesId: session.seriesId,
            trackId: session.trackId,
          });
        } else {
          setupId = null;
        }
      }
      await records.setMeta({ currentSessionId: session.id });
      return raceView(session, setupId);
    },
    async delete(name, id) {
      if (name === "races") {
        const session = await records.get("sessions", id);
        if (!session) return;
        const linkedSetups = (await records.list("setups"))
          .filter((setup) => setup.sessionId === id);
        let fallbackSessionId = null;
        for (const setup of linkedSetups) {
          const replacementSession = await records.set("sessions", blankSession({
            sessionType: "practice",
            seriesId: session.seriesId,
            trackId: session.trackId,
            sessionDate: session.sessionDate,
          }));
          fallbackSessionId = replacementSession.id;
          await records.set("setups", { ...setup, sessionId: replacementSession.id });
        }
        const root = JSON.parse(await records.exportJson());
        if (root.meta.currentSessionId === id) {
          await records.setMeta({ currentSessionId: fallbackSessionId });
        }
        await records.delete("sessions", id);
        return;
      }
      await records.delete(name, id);
    },
    async deleteTrackIfUnlinked(trackId) {
      const [sessions, setups, schedule] = await Promise.all([
        records.list("sessions"),
        records.list("setups"),
        records.list("schedule"),
      ]);
      if (
        sessions.some((session) => session.trackId === trackId) ||
        setups.some((setup) => setup.trackId === trackId) ||
        schedule.some((event) => event.trackId === trackId)
      ) return false;
      await records.delete("tracks", trackId);
      return true;
    },
    async unlinkSetupAndDelete(setupId) {
      await records.delete("setups", setupId);
    },
    async exportJson() {
      return records.exportJson();
    },
    async importJson(json) {
      return toBootstrapPayload(await records.importJson(json));
    },
    snapshot,
  };
}

export const store = createStore(createIndexedDbDocumentAdapter(), {
  readLegacy: () => readLegacyIndexedDb(),
});

export const appStore = createAppStore(store);
