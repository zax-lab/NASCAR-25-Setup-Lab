export type LayoutType =
  | "short_track"
  | "intermediate"
  | "superspeedway"
  | "road_course"
  | "dirt"
  | "unclassified";

export type SeriesRecord = {
  id: number;
  name: string;
  shortCode: string;
  maintenanceStatus: "manual";
  sourceUrl: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DriverRecord = {
  id: number;
  name: string;
  seriesIds: number[];
  team: string | null;
  carNumber: string | null;
  manufacturer: string | null;
  inGameRating: number | null;
  ratingSourceUrl: string | null;
  notes: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DriverInput = Omit<DriverRecord, "id" | "createdAt">;

export type TrackRecord = {
  id: number;
  name: string;
  seriesIds: number[];
  layoutType: LayoutType;
  lengthMiles: number | null;
  bankingNotes: string;
  notes: string;
  sourceUrl: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrackInput = Omit<TrackRecord, "id" | "createdAt">;

export type ScheduleRecord = {
  id: number;
  season: number;
  seriesId: number;
  trackId: number | null;
  eventName: string;
  raceDate: string;
  notes: string;
  sourceUrl: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleInput = Omit<ScheduleRecord, "id" | "createdAt">;

export type RaceInput = {
  seriesId: number;
  trackId: number;
  raceDate: string;
  startPosition: number;
  finishPosition: number;
  fieldSize: number | null;
  lapsLed: number | null;
  incidents: number | null;
  stageResults: string | null;
  setupId: number | null;
  incidentX: number | null;
  incidentY: number | null;
  notes: string;
};

export type RaceEntry = RaceInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionType = "practice" | "qualifying" | "race";

export type SessionRecord = {
  id: number;
  createdAt: string;
  updatedAt: string;
  sessionType: SessionType;
  seriesId: number;
  trackId: number;
  sessionDate: string;
  startPosition: number | null;
  finishPosition: number | null;
  fieldSize: number | null;
  lapsLed: number | null;
  incidents: number | null;
  stageResults: string | null;
  incidentX: number | null;
  incidentY: number | null;
  averageLapSeconds: number | null;
  bestLapSeconds: number | null;
  tireNotes: string;
  notes: string;
};

export type SessionInput = Pick<
  SessionRecord,
  | "sessionType"
  | "seriesId"
  | "trackId"
  | "sessionDate"
  | "averageLapSeconds"
  | "bestLapSeconds"
  | "tireNotes"
  | "notes"
>;

export type SetupInput = {
  seriesId: number;
  trackId: number;
  title: string;
  setupNotes: string;
};

export type SetupRecord = SetupInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
  sessionId: number;
};

export type BootstrapPayload = {
  series: SeriesRecord[];
  drivers: DriverRecord[];
  tracks: TrackRecord[];
  schedule: ScheduleRecord[];
  sessions: SessionRecord[];
  currentSessionId: number | null;
  races: RaceEntry[];
  setups: SetupRecord[];
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nullableNonNegativeInteger(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : "invalid";
}

function nullablePositiveInteger(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "invalid";
}

function nullableCoordinate(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : "invalid";
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function positiveIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map(positiveInteger).filter((item): item is number => item !== null)),
  );
}

function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalReviewedDate(
  value: unknown,
  errors: Record<string, string>,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (!isValidIsoDate(value)) {
    errors.reviewedAt = "Enter a valid review date.";
    return null;
  }
  return value;
}

export function validateRaceInput(input: Record<string, unknown>): ValidationResult<RaceInput> {
  const errors: Record<string, string> = {};
  const seriesId = positiveInteger(input.seriesId);
  const trackId = positiveInteger(input.trackId);
  const startPosition = positiveInteger(input.startPosition);
  const finishPosition = positiveInteger(input.finishPosition);
  const fieldSize = nullablePositiveInteger(input.fieldSize);
  const lapsLed = nullableNonNegativeInteger(input.lapsLed);
  const incidents = nullableNonNegativeInteger(input.incidents);
  const incidentX = nullableCoordinate(input.incidentX);
  const incidentY = nullableCoordinate(input.incidentY);
  const setupId =
    input.setupId === null || input.setupId === undefined || input.setupId === ""
      ? null
      : positiveInteger(input.setupId);

  if (!seriesId) errors.seriesId = "Choose a series.";
  if (!trackId) errors.trackId = "Choose a track.";
  if (!isValidIsoDate(input.raceDate)) errors.raceDate = "Enter a race date.";
  if (!startPosition) errors.startPosition = "Starting position must be 1 or higher.";
  if (!finishPosition) errors.finishPosition = "Finishing position must be 1 or higher.";
  if (fieldSize === "invalid") {
    errors.fieldSize = "Field size must be a whole number greater than zero.";
  } else if (
    fieldSize !== null &&
    ((startPosition !== null && startPosition > fieldSize) ||
      (finishPosition !== null && finishPosition > fieldSize))
  ) {
    errors.fieldSize = "Field size cannot be smaller than a recorded position.";
  }
  if (lapsLed === "invalid") errors.lapsLed = "Laps led cannot be negative.";
  if (incidents === "invalid") errors.incidents = "Incidents cannot be negative.";
  if (
    incidentX === "invalid" ||
    incidentY === "invalid" ||
    (incidentX === null) !== (incidentY === null)
  ) {
    errors.incidentLocation = "Incident marker must stay within the schematic.";
  }
  if (input.setupId && !setupId) errors.setupId = "Choose a saved setup note.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      seriesId: seriesId!,
      trackId: trackId!,
      raceDate: input.raceDate as string,
      startPosition: startPosition!,
      finishPosition: finishPosition!,
      fieldSize: fieldSize as number | null,
      lapsLed: lapsLed as number | null,
      incidents: incidents as number | null,
      stageResults:
        typeof input.stageResults === "string" && input.stageResults.trim()
          ? input.stageResults.trim()
          : null,
      setupId,
      incidentX: incidentX as number | null,
      incidentY: incidentY as number | null,
      notes: typeof input.notes === "string" ? input.notes.trim() : "",
    },
  };
}

export function validateSetupInput(input: Record<string, unknown>): ValidationResult<SetupInput> {
  const errors: Record<string, string> = {};
  const seriesId = positiveInteger(input.seriesId);
  const trackId = positiveInteger(input.trackId);
  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!seriesId) errors.seriesId = "Choose a series.";
  if (!trackId) errors.trackId = "Choose a track.";
  if (!title) errors.title = "Name this setup note.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      seriesId: seriesId!,
      trackId: trackId!,
      title,
      setupNotes:
        typeof input.setupNotes === "string" ? input.setupNotes.trim() : "",
    },
  };
}

export function validateSessionInput(
  input: Record<string, unknown>,
): ValidationResult<SessionInput> {
  const errors: Record<string, string> = {};
  const seriesId = positiveInteger(input.seriesId);
  const trackId = positiveInteger(input.trackId);
  const sessionType = ["practice", "qualifying", "race"].includes(String(input.sessionType))
    ? (input.sessionType as SessionType)
    : null;
  const optionalSeconds = (value: unknown): number | null | "invalid" => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : "invalid";
  };
  const averageLapSeconds = optionalSeconds(input.averageLapSeconds);
  const bestLapSeconds = optionalSeconds(input.bestLapSeconds);

  if (!sessionType) errors.sessionType = "Choose practice, qualifying, or race.";
  if (!seriesId) errors.seriesId = "Choose a series.";
  if (!trackId) errors.trackId = "Choose a track.";
  if (!isValidIsoDate(input.sessionDate)) errors.sessionDate = "Enter a session date.";
  if (averageLapSeconds === "invalid") {
    errors.averageLapSeconds = "Average lap must be greater than zero.";
  }
  if (bestLapSeconds === "invalid") {
    errors.bestLapSeconds = "Best lap must be greater than zero.";
  }
  if (
    typeof averageLapSeconds === "number" &&
    typeof bestLapSeconds === "number" &&
    bestLapSeconds > averageLapSeconds
  ) {
    errors.bestLapSeconds = "Best lap cannot be slower than the recorded average lap.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      sessionType: sessionType!,
      seriesId: seriesId!,
      trackId: trackId!,
      sessionDate: input.sessionDate as string,
      averageLapSeconds: averageLapSeconds as number | null,
      bestLapSeconds: bestLapSeconds as number | null,
      tireNotes: typeof input.tireNotes === "string" ? input.tireNotes.trim() : "",
      notes: typeof input.notes === "string" ? input.notes.trim() : "",
    },
  };
}

export function validateDriverInput(
  input: Record<string, unknown>,
): ValidationResult<DriverInput> {
  const errors: Record<string, string> = {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const seriesIds = positiveIntegerArray(input.seriesIds);
  const rating =
    input.inGameRating === null || input.inGameRating === undefined || input.inGameRating === ""
      ? null
      : Number(input.inGameRating);
  const reviewedAt = optionalReviewedDate(input.reviewedAt, errors);

  if (!name) errors.name = "Enter a driver name.";
  if (seriesIds.length === 0) errors.seriesIds = "Choose at least one series.";
  if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 100)) {
    errors.inGameRating = "Use a whole-number rating from 0 to 100.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      seriesIds,
      team: nullableText(input.team),
      carNumber: nullableText(input.carNumber),
      manufacturer: nullableText(input.manufacturer),
      inGameRating: rating,
      ratingSourceUrl: nullableText(input.ratingSourceUrl),
      notes: typeof input.notes === "string" ? input.notes.trim() : "",
      reviewedAt,
    },
  };
}

export function validateTrackInput(
  input: Record<string, unknown>,
): ValidationResult<TrackInput> {
  const errors: Record<string, string> = {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const seriesIds = positiveIntegerArray(input.seriesIds);
  const layoutTypes: LayoutType[] = [
    "short_track",
    "intermediate",
    "superspeedway",
    "road_course",
    "dirt",
    "unclassified",
  ];
  const layoutType = layoutTypes.includes(input.layoutType as LayoutType)
    ? (input.layoutType as LayoutType)
    : "unclassified";
  const lengthMiles =
    input.lengthMiles === null || input.lengthMiles === undefined || input.lengthMiles === ""
      ? null
      : Number(input.lengthMiles);
  const reviewedAt = optionalReviewedDate(input.reviewedAt, errors);

  if (!name) errors.name = "Enter a track name.";
  if (seriesIds.length === 0) errors.seriesIds = "Choose at least one series.";
  if (lengthMiles !== null && (!Number.isFinite(lengthMiles) || lengthMiles <= 0)) {
    errors.lengthMiles = "Track length must be greater than zero.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      seriesIds,
      layoutType,
      lengthMiles,
      bankingNotes:
        typeof input.bankingNotes === "string" ? input.bankingNotes.trim() : "",
      notes: typeof input.notes === "string" ? input.notes.trim() : "",
      sourceUrl: nullableText(input.sourceUrl),
      reviewedAt,
    },
  };
}

export function validateScheduleInput(
  input: Record<string, unknown>,
): ValidationResult<ScheduleInput> {
  const errors: Record<string, string> = {};
  const season = Number(input.season);
  const seriesId = positiveInteger(input.seriesId);
  const trackId =
    input.trackId === null || input.trackId === undefined || input.trackId === ""
      ? null
      : positiveInteger(input.trackId);
  const eventName =
    typeof input.eventName === "string" ? input.eventName.trim() : "";
  const reviewedAt = optionalReviewedDate(input.reviewedAt, errors);

  if (!Number.isInteger(season) || season < 1900 || season > 2100) {
    errors.season = "Enter a four-digit season.";
  }
  if (!seriesId) errors.seriesId = "Choose a series.";
  if (input.trackId && !trackId) errors.trackId = "Choose a reference track.";
  if (!eventName) errors.eventName = "Enter the real-world event name.";
  if (!isValidIsoDate(input.raceDate)) {
    errors.raceDate = "Enter the real-world race date.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      season,
      seriesId: seriesId!,
      trackId,
      eventName,
      raceDate: input.raceDate as string,
      notes: typeof input.notes === "string" ? input.notes.trim() : "",
      sourceUrl: nullableText(input.sourceUrl),
      reviewedAt,
    },
  };
}
