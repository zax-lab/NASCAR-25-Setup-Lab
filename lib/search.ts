export type SearchKind = "driver" | "track" | "race" | "setup" | "schedule";

export type SearchResult = {
  kind: SearchKind;
  id: number;
  title: string;
  subtitle: string;
  excerpt: string;
  screen: "drivers" | "tracks" | "log" | "setups" | "schedule";
};

type SearchData = {
  series: Array<{ id: number; name: string; shortCode?: string }>;
  drivers: Array<Record<string, unknown> & { id: number; name: string }>;
  tracks: Array<Record<string, unknown> & { id: number; name: string }>;
  schedule: Array<Record<string, unknown> & { id: number }>;
  races: Array<Record<string, unknown> & { id: number; seriesId: number; trackId: number }>;
  setups: Array<Record<string, unknown> & { id: number; seriesId: number; trackId: number }>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function tokens(value: string): string[] {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function matches(haystack: string, query: string[]): boolean {
  const normalized = haystack.toLocaleLowerCase();
  const indexed = tokens(haystack);
  return query.every(
    (needle) => normalized.includes(needle) || indexed.some((candidate) => candidate.startsWith(needle)),
  );
}

export function searchCompanion(data: SearchData, query: string): SearchResult[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];
  const trackName = new Map(data.tracks.map((track) => [track.id, track.name]));
  const seriesName = new Map(data.series.map((series) => [series.id, series.name]));
  const results: SearchResult[] = [];

  for (const driver of data.drivers) {
    const haystack = [driver.name, driver.team, driver.carNumber, driver.manufacturer, driver.notes]
      .map(text)
      .join(" ");
    if (matches(haystack, queryTokens)) {
      results.push({
        kind: "driver",
        id: driver.id,
        title: driver.name,
        subtitle: text(driver.team) || "Manual driver reference",
        excerpt: text(driver.notes),
        screen: "drivers",
      });
    }
  }

  for (const track of data.tracks) {
    const haystack = [track.name, track.layoutType, track.notes, track.bankingNotes].map(text).join(" ");
    if (matches(haystack, queryTokens)) {
      results.push({
        kind: "track",
        id: track.id,
        title: track.name,
        subtitle: text(track.layoutType).replaceAll("_", " ") || "Manual track reference",
        excerpt: text(track.notes),
        screen: "tracks",
      });
    }
  }

  for (const race of data.races) {
    const track = trackName.get(race.trackId) ?? `Track ${race.trackId}`;
    const haystack = [track, seriesName.get(race.seriesId), race.raceDate, race.notes, race.stageResults]
      .map(text)
      .join(" ");
    if (matches(haystack, queryTokens)) {
      results.push({
        kind: "race",
        id: race.id,
        title: `${track} · ${text(race.raceDate)}`,
        subtitle: seriesName.get(race.seriesId) ?? "Logged race",
        excerpt: text(race.notes),
        screen: "log",
      });
    }
  }

  for (const setup of data.setups) {
    const track = trackName.get(setup.trackId) ?? `Track ${setup.trackId}`;
    const haystack = [track, seriesName.get(setup.seriesId), setup.title, setup.setupNotes]
      .map(text)
      .join(" ");
    if (matches(haystack, queryTokens)) {
      results.push({
        kind: "setup",
        id: setup.id,
        title: text(setup.title) || "Untitled setup note",
        subtitle: `${track} · ${seriesName.get(setup.seriesId) ?? "Series"}`,
        excerpt: text(setup.setupNotes),
        screen: "setups",
      });
    }
  }

  for (const event of data.schedule) {
    const track = trackName.get(Number(event.trackId)) ?? "Track not linked";
    const haystack = [track, seriesName.get(Number(event.seriesId)), event.eventName, event.raceDate, event.notes]
      .map(text)
      .join(" ");
    if (matches(haystack, queryTokens)) {
      results.push({
        kind: "schedule",
        id: event.id,
        title: text(event.eventName),
        subtitle: `${text(event.raceDate)} · real-world reference`,
        excerpt: text(event.notes),
        screen: "schedule",
      });
    }
  }

  return results;
}
