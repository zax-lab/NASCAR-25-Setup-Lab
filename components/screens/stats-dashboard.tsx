"use client";

import { useMemo } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import type { LayoutType, RaceEntry, SeriesRecord, SessionRecord, SetupRecord, TrackRecord } from "@/lib/domain";
import {
  bestTrack,
  computeBoxPlot,
  computePaceIndex,
  groupFinishesByLayout,
  fastestAverageLapSetup,
  summarizeRaces,
  toRaceEntries,
} from "@/lib/stats";

const layoutLabel: Record<LayoutType, string> = {
  short_track: "Short track",
  intermediate: "Intermediate",
  superspeedway: "Superspeedway",
  road_course: "Road course",
  dirt: "Dirt",
  unclassified: "Not classified",
};

function FinishTrend({ races, tracks }: { races: RaceEntry[]; tracks: TrackRecord[] }) {
  const ordered = [...races].sort(
    (a, b) => a.raceDate.localeCompare(b.raceDate) || a.id - b.id,
  );
  const maxFinish = Math.max(10, ...ordered.map((race) => race.finishPosition));
  const x = (index: number) => 42 + (index * 716) / Math.max(ordered.length - 1, 1);
  const y = (finish: number) => 28 + ((finish - 1) / Math.max(maxFinish - 1, 1)) * 186;
  const points = ordered.map((race, index) => `${x(index)},${y(race.finishPosition)}`).join(" ");

  return (
    <div className="chart-card trend-card">
      <div className="chart-head">
        <div><span className="eyebrow">Lower is better</span><h2>Finish trend</h2></div>
        <StatusBadge>{ordered.length} races</StatusBadge>
      </div>
      <svg aria-label="Finish position trend from manually logged races" role="img" viewBox="0 0 800 250">
        {[1, Math.ceil(maxFinish / 2), maxFinish].map((finish) => (
          <g key={finish}>
            <line x1="42" x2="758" y1={y(finish)} y2={y(finish)} />
            <text x="8" y={y(finish) + 4}>P{finish}</text>
          </g>
        ))}
        {ordered.length > 1 ? <polyline points={points} /> : null}
        {ordered.map((race, index) => (
          <g key={race.id}>
            <circle cx={x(index)} cy={y(race.finishPosition)} r="5" />
            <title>{`${race.raceDate} · ${tracks.find((track) => track.id === race.trackId)?.name ?? "Track"} · P${race.finishPosition}`}</title>
          </g>
        ))}
      </svg>
      <div className="chart-axis"><span>{ordered[0]?.raceDate}</span><span>{ordered.at(-1)?.raceDate}</span></div>
    </div>
  );
}

function BoxPlots({ races, tracks }: { races: RaceEntry[]; tracks: TrackRecord[] }) {
  const groups = groupFinishesByLayout(races, tracks)
    .map((group) => ({ ...group, summary: computeBoxPlot(group.finishes) }))
    .filter((group) => group.summary !== null);
  const maximum = Math.max(10, ...races.map((race) => race.finishPosition));
  const pct = (finish: number) => ((finish - 1) / Math.max(maximum - 1, 1)) * 100;

  return (
    <div className="chart-card box-card">
      <div className="chart-head"><div><span className="eyebrow">Tukey five-number summary</span><h2>Finish spread by layout</h2></div></div>
      {groups.length ? (
        <div className="boxplot-list">
          {groups.map((group) => {
            const summary = group.summary!;
            return (
              <div className="boxplot-row" key={group.layoutType}>
                <div><strong>{layoutLabel[group.layoutType]}</strong><span>{group.finishes.length} starts</span></div>
                <div className="boxplot" title={`Min ${summary.min}, Q1 ${summary.q1}, median ${summary.median}, Q3 ${summary.q3}, max ${summary.max}`}>
                  <span className="whisker" style={{ left: `${pct(summary.min)}%`, width: `${pct(summary.max) - pct(summary.min)}%` }} />
                  <span className="box" style={{ left: `${pct(summary.q1)}%`, width: `${Math.max(pct(summary.q3) - pct(summary.q1), 1)}%` }} />
                  <span className="median" style={{ left: `${pct(summary.median)}%` }} />
                </div>
                <span>P{summary.median} median</span>
              </div>
            );
          })}
        </div>
      ) : <p className="chart-empty">Classify tracks and log races to compare finish distributions.</p>}
      <div className="box-axis"><span>P1</span><span>P{maximum}</span></div>
    </div>
  );
}

function ResultHeatmap({ races, tracks }: { races: RaceEntry[]; tracks: TrackRecord[] }) {
  const ordered = [...races].sort(
    (a, b) => a.raceDate.localeCompare(b.raceDate) || a.id - b.id,
  );
  return (
    <div className="chart-card heatmap-card">
      <div className="chart-head"><div><span className="eyebrow">Season grid · logged events only</span><h2>Result heatmap</h2></div></div>
      <div className="heatmap" aria-label="Heatmap of manually logged finish positions">
        {ordered.map((race) => (
          <div
            className={race.finishPosition === 1 ? "win" : race.finishPosition <= 5 ? "top5" : race.finishPosition <= 10 ? "top10" : "field"}
            key={race.id}
            tabIndex={0}
          >
            <span>{race.raceDate.slice(5)}</span>
            <strong>P{race.finishPosition}</strong>
            <small>{tracks.find((track) => track.id === race.trackId)?.name ?? "Track"}</small>
          </div>
        ))}
      </div>
      <div className="heat-legend"><span className="win">Win</span><span className="top5">Top 5</span><span className="top10">Top 10</span><span className="field">11+</span></div>
    </div>
  );
}

export function StatsDashboard({
  onLogRace,
  series,
  sessions,
  setups,
  tracks,
}: {
  onLogRace: () => void;
  series: SeriesRecord[];
  sessions: SessionRecord[];
  setups: SetupRecord[];
  tracks: TrackRecord[];
}) {
  const races = useMemo(() => toRaceEntries(sessions, setups), [sessions, setups]);
  const summary = useMemo(() => summarizeRaces(races), [races]);
  const pace = useMemo(() => computePaceIndex(races), [races]);
  const strongestTrack = useMemo(() => bestTrack(races, tracks), [races, tracks]);
  const quickestSetup = useMemo(
    () => fastestAverageLapSetup(setups, sessions),
    [sessions, setups],
  );

  if (races.length === 0) {
    return (
      <section className="screen" aria-labelledby="stats-title">
        <header className="screen-header"><div><p className="eyebrow">Owner-derived statistics</p><h1 id="stats-title">My stats</h1><p>No sample data is inserted. Charts begin only after you enter a race.</p></div><StatusBadge>0 races</StatusBadge></header>
        <div className="empty-state stats-empty"><span aria-hidden="true">Σ/00</span><h2>No personal sample yet</h2><p>Log one real result from your own play session to start the dashboard.</p><button className="primary-action" onClick={onLogRace} type="button">Log your first race</button></div>
      </section>
    );
  }

  return (
    <section className="screen stats-screen" aria-labelledby="stats-title">
      <header className="screen-header"><div><p className="eyebrow">Computed locally · session joins at read time</p><h1 id="stats-title">My stats</h1><p>Every number below is derived in your browser from entries you typed. Nothing calculated here is stored.</p></div><StatusBadge>{summary.racesLogged} races</StatusBadge></header>
      <div className="stats-ledger">
        <article><span>Average finish</span><strong>{summary.averageFinish ?? "—"}</strong><small>Across all logged races</small></article>
        <article><span>Best finish</span><strong>{summary.bestFinish ? `P${summary.bestFinish}` : "—"}</strong><small>{summary.wins} win{summary.wins === 1 ? "" : "s"}</small></article>
        <article><span>Top 5 rate</span><strong>{summary.top5Rate}%</strong><small>Top 10 · {summary.top10Rate}%</small></article>
        <article className="pace-index"><span>Pace Index</span><strong>{pace.value ?? "—"}</strong><small>{pace.sampleSize} field-sized result{pace.sampleSize === 1 ? "" : "s"}</small></article>
        <article className="pace-index"><span>Fastest avg-lap setup</span><strong>{quickestSetup ? `${quickestSetup.averageLapSeconds.toFixed(3)}s` : "—"}</strong><small>{quickestSetup ? quickestSetup.title : "No setup-linked laps"}</small></article>
      </div>
      <div className="insight-strip">
        <div><span>Best logged track</span><strong>{strongestTrack?.name ?? "Not enough data"}</strong><small>{strongestTrack ? `Avg P${strongestTrack.averageFinish} · ${strongestTrack.starts} start${strongestTrack.starts === 1 ? "" : "s"}` : ""}</small></div>
        <div><span>Position delta</span><strong>{summary.averagePositionsGained !== null && summary.averagePositionsGained > 0 ? "+" : ""}{summary.averagePositionsGained ?? "—"}</strong><small>Average start minus finish</small></div>
        <div><span>Win rate</span><strong>{summary.winRate}%</strong><small>Owner-entered results</small></div>
        <div><span>Fastest setup result</span><strong>{quickestSetup?.finishPosition ? `P${quickestSetup.finishPosition}` : "—"}</strong><small>{quickestSetup ? "Same linked session" : "No joined result"}</small></div>
      </div>
      <div className="chart-grid"><FinishTrend races={races} tracks={tracks} /><BoxPlots races={races} tracks={tracks} /></div>
      <ResultHeatmap races={races} tracks={tracks} />
      <div className="formula-card">
        <span className="formula-mark">ƒ</span>
        <div><p className="eyebrow">Documented formula · not an in-game rating</p><h2>Pace Index</h2><p>For each race with a manually entered field size: <strong>100 × (field size − finish) ÷ (field size − 1)</strong>. The displayed index is the arithmetic mean of those race scores. A win scores 100; last place scores 0. Races without field size are excluded.</p></div>
      </div>
      <div className="series-splits">
        {series.map((item) => {
          const split = summarizeRaces(races.filter((race) => race.seriesId === item.id));
          return <article key={item.id}><span>{item.shortCode}</span><strong>{split.racesLogged ? `P${split.averageFinish}` : "—"}</strong><small>{split.racesLogged} starts · avg finish</small></article>;
        })}
      </div>
    </section>
  );
}
