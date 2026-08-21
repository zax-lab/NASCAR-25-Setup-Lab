"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { SeriesRecord, SessionRecord, SetupRecord, TrackRecord } from "@/lib/domain";
import { deriveTrackView } from "@/lib/stats";

function formatSessionType(type: SessionRecord["sessionType"]): string {
  return type === "qualifying" ? "Qualifying" : type[0].toUpperCase() + type.slice(1);
}

export function TrackDetail({
  onBack,
  series,
  sessions,
  setups,
  track,
}: {
  onBack: () => void;
  series: SeriesRecord[];
  sessions: SessionRecord[];
  setups: SetupRecord[];
  track: TrackRecord;
}) {
  const view = deriveTrackView(track.id, sessions, setups);

  return (
    <section className="screen" aria-labelledby="track-detail-title">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Track history · self-logged sessions only</p>
          <h1 id="track-detail-title">{track.name}</h1>
          <p>Every practice, qualifying, and race session at this track, joined to its manual setup deltas.</p>
        </div>
        <div className="top-actions">
          <StatusBadge>{view.sessions.length} sessions</StatusBadge>
          <button className="secondary-action" onClick={onBack} type="button">Back to tracks</button>
        </div>
      </header>

      <div className="metric-strip">
        <article>
          <span>Race starts</span>
          <strong>{view.summary.racesLogged || "—"}</strong>
          <small>{view.summary.racesLogged ? `Avg P${view.summary.averageFinish}` : "No race result yet"}</small>
        </article>
        <article>
          <span>Best finish</span>
          <strong>{view.summary.bestFinish ? `P${view.summary.bestFinish}` : "—"}</strong>
          <small>Race sessions only</small>
        </article>
        <article>
          <span>Fastest avg lap</span>
          <strong>{view.bestSetup ? `${view.bestSetup.averageLapSeconds.toFixed(3)}s` : "—"}</strong>
          <small>{view.bestSetup ? view.bestSetup.title : "No setup-linked lap time"}</small>
        </article>
        <article>
          <span>Best setup result</span>
          <strong>{view.bestSetup?.finishPosition ? `P${view.bestSetup.finishPosition}` : "—"}</strong>
          <small>{view.bestSetup ? "From the same session" : "No joined session"}</small>
        </article>
      </div>

      {view.bestSetup ? (
        <aside className="verified-controls">
          <div className="verified-title">
            <p className="eyebrow">Best observed setup</p>
            <h2>{view.bestSetup.title}</h2>
            <p>
              {view.bestSetup.averageLapSeconds.toFixed(3)}s average lap in its linked session
              {view.bestSetup.finishPosition ? ` · finished P${view.bestSetup.finishPosition}` : ""}.
            </p>
          </div>
          <div>
            <span className="field-label">Interpretation boundary</span>
            <p>This is the fastest manual observation in your history, not a claim of universal causation.</p>
          </div>
        </aside>
      ) : null}

      {view.sessions.length ? (
        <div className="race-list" aria-label={`Session history for ${track.name}`}>
          {view.sessions.map((session) => {
            const setupNotes = setups.filter((setup) => setup.sessionId === session.id);
            return (
              <article className="race-row" key={session.id}>
                <time dateTime={session.sessionDate}>{session.sessionDate}</time>
                <div>
                  <span className="eyebrow">
                    {series.find((item) => item.id === session.seriesId)?.shortCode} · {formatSessionType(session.sessionType)}
                  </span>
                  <h2>{setupNotes.map((setup) => setup.title).join(" · ") || "No setup delta logged"}</h2>
                  {session.tireNotes ? <p>Tires: {session.tireNotes}</p> : session.notes ? <p>{session.notes}</p> : null}
                </div>
                <dl>
                  <div><dt>Avg lap</dt><dd>{session.averageLapSeconds ? `${session.averageLapSeconds.toFixed(3)}s` : "—"}</dd></div>
                  <div><dt>Best lap</dt><dd>{session.bestLapSeconds ? `${session.bestLapSeconds.toFixed(3)}s` : "—"}</dd></div>
                  <div><dt>Result</dt><dd>{session.finishPosition ? `P${session.finishPosition}` : "—"}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <span aria-hidden="true">T/00</span>
          <h2>No sessions at this track</h2>
          <p>Start a manual practice, qualifying, or race session in Setup Lab to build this track history.</p>
        </div>
      )}
    </section>
  );
}
