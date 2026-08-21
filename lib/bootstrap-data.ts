import type {
  BootstrapPayload,
  DriverRecord,
  SeriesRecord,
  TrackRecord,
} from "@/lib/domain";
import { DRIVER_SEED } from "@/lib/driver-reference";
import { SCHEDULE_SEED, SERIES_SEED, TRACK_SEED } from "@/lib/reference-data";

const seededAt = "2026-08-14T00:00:00.000Z";

const series: SeriesRecord[] = SERIES_SEED.map((record, index) => ({
  id: index + 1,
  ...record,
  createdAt: seededAt,
  updatedAt: seededAt,
}));

const seriesIdByCode = new Map(series.map((record) => [record.shortCode, record.id]));

const drivers: DriverRecord[] = DRIVER_SEED.map((record, index) => ({
  id: index + 1,
  name: record.name,
  seriesIds: [seriesIdByCode.get(record.seriesCode)!],
  team: record.team,
  carNumber: record.carNumber,
  manufacturer: null,
  inGameRating: null,
  ratingSourceUrl: null,
  notes: "",
  reviewedAt: record.reviewedAt,
  createdAt: `${record.reviewedAt}T00:00:00.000Z`,
  updatedAt: `${record.reviewedAt}T00:00:00.000Z`,
}));

const tracks: TrackRecord[] = TRACK_SEED.map((record, index) => ({
  id: index + 1,
  name: record.name,
  seriesIds: record.seriesCodes
    .map((code) => seriesIdByCode.get(code))
    .filter((id): id is number => id !== undefined),
  layoutType: record.layoutType,
  lengthMiles: record.lengthMiles,
  bankingNotes: "",
  notes: record.notes,
  sourceUrl: record.sourceUrl,
  reviewedAt: record.reviewedAt,
  createdAt: `${record.reviewedAt}T00:00:00.000Z`,
  updatedAt: `${record.reviewedAt}T00:00:00.000Z`,
}));

const trackIdByName = new Map(tracks.map((record) => [record.name, record.id]));

const schedule = SCHEDULE_SEED.map((record, index) => ({
  id: index + 1,
  season: record.season,
  seriesId: seriesIdByCode.get(record.seriesCode)!,
  trackId: record.trackName ? (trackIdByName.get(record.trackName) ?? null) : null,
  eventName: record.eventName,
  raceDate: record.raceDate,
  notes: record.notes,
  sourceUrl: record.sourceUrl,
  reviewedAt: record.reviewedAt,
  createdAt: `${record.reviewedAt}T00:00:00.000Z`,
  updatedAt: `${record.reviewedAt}T00:00:00.000Z`,
}));

export const initialData: BootstrapPayload = {
  series,
  tracks,
  drivers,
  schedule,
  sessions: [],
  currentSessionId: null,
  races: [],
  setups: [],
};

