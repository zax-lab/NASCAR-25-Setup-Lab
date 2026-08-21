import type {
  LayoutType,
  RaceEntry,
  SessionRecord,
  SetupRecord,
  TrackRecord,
} from "./domain";

export type RaceSummary = {
  racesLogged: number;
  averageFinish: number | null;
  bestFinish: number | null;
  wins: number;
  winRate: number;
  top5Rate: number;
  top10Rate: number;
  averagePositionsGained: number | null;
};

export type FiveNumberSummary = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

function rounded(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function toRaceEntries(
  sessions: SessionRecord[],
  setups: SetupRecord[],
): RaceEntry[] {
  const setupBySession = new Map<number, SetupRecord>();
  for (const setup of setups) {
    const existing = setupBySession.get(setup.sessionId);
    if (!existing || setup.updatedAt > existing.updatedAt) setupBySession.set(setup.sessionId, setup);
  }

  return sessions
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
      startPosition: session.startPosition!,
      finishPosition: session.finishPosition!,
      fieldSize: session.fieldSize,
      lapsLed: session.lapsLed,
      incidents: session.incidents,
      stageResults: session.stageResults,
      setupId: setupBySession.get(session.id)?.id ?? null,
      incidentX: session.incidentX,
      incidentY: session.incidentY,
      notes: session.notes,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
}

export type SetupPerformance = {
  setupId: number;
  sessionId: number;
  averageLapSeconds: number;
  finishPosition: number | null;
  trackId: number;
  title: string;
};

export function fastestAverageLapSetup(
  setups: SetupRecord[],
  sessions: SessionRecord[],
  trackId?: number,
): SetupPerformance | null {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const candidates = setups
    .filter((setup) => trackId === undefined || setup.trackId === trackId)
    .map((setup) => ({ setup, session: sessionById.get(setup.sessionId) }))
    .filter(
      (entry): entry is { setup: SetupRecord; session: SessionRecord } =>
        Boolean(entry.session) &&
        typeof entry.session!.averageLapSeconds === "number" &&
        Number.isFinite(entry.session!.averageLapSeconds),
    )
    .sort(
      (a, b) =>
        a.session.averageLapSeconds! - b.session.averageLapSeconds! ||
        b.setup.updatedAt.localeCompare(a.setup.updatedAt),
    );
  const winner = candidates[0];
  if (!winner) return null;
  return {
    setupId: winner.setup.id,
    sessionId: winner.session.id,
    averageLapSeconds: winner.session.averageLapSeconds!,
    finishPosition: winner.session.finishPosition,
    trackId: winner.setup.trackId,
    title: winner.setup.title,
  };
}

export function deriveTrackView(
  trackId: number,
  sessions: SessionRecord[],
  setups: SetupRecord[],
): {
  sessions: SessionRecord[];
  races: RaceEntry[];
  summary: RaceSummary;
  bestSetup: SetupPerformance | null;
} {
  const trackSessions = sessions
    .filter((session) => session.trackId === trackId)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.id - a.id);
  const trackSetups = setups.filter((setup) => setup.trackId === trackId);
  const races = toRaceEntries(trackSessions, trackSetups);
  return {
    sessions: trackSessions,
    races,
    summary: summarizeRaces(races),
    bestSetup: fastestAverageLapSetup(trackSetups, trackSessions, trackId),
  };
}

export function summarizeRaces(races: RaceEntry[]): RaceSummary {
  if (races.length === 0) {
    return {
      racesLogged: 0,
      averageFinish: null,
      bestFinish: null,
      wins: 0,
      winRate: 0,
      top5Rate: 0,
      top10Rate: 0,
      averagePositionsGained: null,
    };
  }

  const finishes = races.map((race) => race.finishPosition);
  const wins = finishes.filter((finish) => finish === 1).length;
  const rate = (count: number) => rounded((count / races.length) * 100);
  return {
    racesLogged: races.length,
    averageFinish: rounded(finishes.reduce((sum, finish) => sum + finish, 0) / races.length),
    bestFinish: Math.min(...finishes),
    wins,
    winRate: rate(wins),
    top5Rate: rate(finishes.filter((finish) => finish <= 5).length),
    top10Rate: rate(finishes.filter((finish) => finish <= 10).length),
    averagePositionsGained: rounded(
      races.reduce((sum, race) => sum + race.startPosition - race.finishPosition, 0) /
        races.length,
    ),
  };
}

export function computePaceIndex(
  races: RaceEntry[],
): { value: number | null; sampleSize: number } {
  const scores = races
    .filter(
      (race) =>
        race.fieldSize !== null &&
        race.fieldSize > 1 &&
        race.finishPosition <= race.fieldSize,
    )
    .map(
      (race) =>
        (100 * (race.fieldSize! - race.finishPosition)) / (race.fieldSize! - 1),
    );
  if (scores.length === 0) return { value: null, sampleSize: 0 };
  return {
    value: rounded(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    sampleSize: scores.length,
  };
}

function median(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : rounded((sorted[middle - 1] + sorted[middle]) / 2, 2);
}

export function computeBoxPlot(values: number[]): FiveNumberSummary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted.length === 1 ? sorted : sorted.slice(0, middle);
  const upper = sorted.length === 1 ? sorted : sorted.slice(Math.ceil(sorted.length / 2));
  return {
    min: sorted[0],
    q1: median(lower),
    median: median(sorted),
    q3: median(upper),
    max: sorted.at(-1)!,
  };
}

export function groupFinishesByLayout(
  races: RaceEntry[],
  tracks: Array<Pick<TrackRecord, "id" | "layoutType">>,
): Array<{ layoutType: LayoutType; finishes: number[] }> {
  const layoutByTrack = new Map(tracks.map((track) => [track.id, track.layoutType]));
  const groups = new Map<LayoutType, number[]>();
  for (const race of races) {
    const layout = layoutByTrack.get(race.trackId);
    if (!layout) continue;
    const finishes = groups.get(layout) ?? [];
    finishes.push(race.finishPosition);
    groups.set(layout, finishes);
  }
  return Array.from(groups, ([layoutType, finishes]) => ({ layoutType, finishes }));
}

export function bestTrack(
  races: RaceEntry[],
  tracks: Array<Pick<TrackRecord, "id" | "name">>,
): { name: string; averageFinish: number; starts: number } | null {
  const byTrack = new Map<number, number[]>();
  for (const race of races) {
    const finishes = byTrack.get(race.trackId) ?? [];
    finishes.push(race.finishPosition);
    byTrack.set(race.trackId, finishes);
  }
  const candidates = Array.from(byTrack, ([id, finishes]) => ({
    id,
    starts: finishes.length,
    averageFinish: rounded(finishes.reduce((sum, finish) => sum + finish, 0) / finishes.length),
  })).sort((a, b) => a.averageFinish - b.averageFinish || b.starts - a.starts);
  const winner = candidates[0];
  if (!winner) return null;
  return {
    name: tracks.find((track) => track.id === winner.id)?.name ?? `Track ${winner.id}`,
    averageFinish: winner.averageFinish,
    starts: winner.starts,
  };
}
