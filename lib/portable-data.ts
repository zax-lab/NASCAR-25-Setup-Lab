import type { BootstrapPayload } from "./domain.ts";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportRaceCsv(data: BootstrapPayload): string {
  const seriesName = new Map(data.series.map((item) => [item.id, item.name]));
  const trackName = new Map(data.tracks.map((item) => [item.id, item.name]));
  const rows = [
    ["date", "series", "track", "start", "finish", "field_size", "laps_led", "incidents", "notes"],
    ...data.races.map((race) => [
      race.raceDate,
      seriesName.get(race.seriesId) ?? `Series ${race.seriesId}`,
      trackName.get(race.trackId) ?? `Track ${race.trackId}`,
      race.startPosition,
      race.finishPosition,
      "fieldSize" in race ? (race.fieldSize ?? "") : "",
      race.lapsLed ?? "",
      race.incidents ?? "",
      race.notes,
    ]),
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
