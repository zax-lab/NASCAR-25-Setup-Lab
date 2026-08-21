"use client";

import { useMemo, useRef, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import { Field } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RaceEntry, SeriesRecord, SessionRecord, SetupRecord, TrackRecord } from "@/lib/domain";

function localToday(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function TrackSchematic({
  marker,
  onChange,
  track,
}: {
  marker: { x: number; y: number } | null;
  onChange: (marker: { x: number; y: number } | null) => void;
  track: TrackRecord | undefined;
}) {
  const road = track?.layoutType === "road_course";

  return (
    <div className="incident-picker">
      <div className="incident-head">
        <div>
          <span className="field-label">Optional incident location</span>
          <small>Schematic only · hand-tapped by you · never telemetry</small>
        </div>
        {marker ? (
          <button className="text-action" onClick={() => onChange(null)} type="button">
            Clear marker
          </button>
        ) : null}
      </div>
      <button
        aria-label={
          marker
            ? `Move manual incident marker. Current normalized location ${marker.x.toFixed(0)}, ${marker.y.toFixed(0)}.`
            : "Place an optional manual incident marker on the generic schematic"
        }
        className="incident-map"
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          onChange({
            x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
            y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
          });
        }}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 100 60">
          {road ? (
            <path d="M12 35C9 20 25 8 38 15C48 20 45 43 60 43C75 44 91 35 84 22C79 12 63 16 58 8" />
          ) : (
            <path d="M18 9C7 9 4 51 18 51H82C96 51 93 9 82 9Z" />
          )}
          <path className="centerline" d={road ? "M15 35L20 33M79 22L84 20" : "M50 9V15M50 45V51"} />
          {marker ? <circle cx={marker.x} cy={marker.y * 0.6} r="3.3" /> : null}
        </svg>
        <span>{track?.name ?? "Choose a track"}</span>
      </button>
      <p className="field-hint">
        The outline is a generic visual aid, not a sourced map of {track?.name ?? "the selected track"}.
      </p>
    </div>
  );
}

export function RaceLog({
  onCreate,
  onDelete,
  currentSessionId,
  races,
  series,
  sessions,
  setups,
  tracks,
}: {
  onCreate: (input: Record<string, unknown>) => Promise<SaveOutcome>;
  onDelete: (id: number) => Promise<SaveOutcome>;
  currentSessionId: number | null;
  races: RaceEntry[];
  series: SeriesRecord[];
  sessions: SessionRecord[];
  setups: SetupRecord[];
  tracks: TrackRecord[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const currentRaceSession = sessions.find(
    (session) => session.id === currentSessionId && session.sessionType === "race",
  );
  const [sessionId, setSessionId] = useState(String(currentRaceSession?.id ?? ""));
  const [seriesId, setSeriesId] = useState(String(currentRaceSession?.seriesId ?? series[0]?.id ?? ""));
  const eligibleTracks = useMemo(
    () => tracks.filter((track) => !seriesId || track.seriesIds.includes(Number(seriesId))),
    [seriesId, tracks],
  );
  const [trackId, setTrackId] = useState(String(currentRaceSession?.trackId ?? eligibleTracks[0]?.id ?? ""));
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const effectiveTrackId = eligibleTracks.some((track) => String(track.id) === trackId)
    ? trackId
    : String(eligibleTracks[0]?.id ?? "");
  const selectedTrack = tracks.find((track) => String(track.id) === effectiveTrackId);
  const raceSessions = useMemo(
    () => sessions
      .filter((session) => session.sessionType === "race")
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.id - a.id),
    [sessions],
  );
  const selectedSession = raceSessions.find((session) => String(session.id) === sessionId) ?? null;
  const sessionSetups = selectedSession
    ? setups.filter((setup) => setup.sessionId === selectedSession.id)
    : [];
  const orderedRaces = [...races].sort(
    (a, b) => b.raceDate.localeCompare(a.raceDate) || b.id - a.id,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value ? Number(value) : null;
    };
    const result = await onCreate({
      sessionId: selectedSession?.id ?? null,
      seriesId: Number(form.get("seriesId")),
      trackId: Number(form.get("trackId")),
      raceDate: form.get("raceDate"),
      startPosition: Number(form.get("startPosition")),
      finishPosition: Number(form.get("finishPosition")),
      fieldSize: optionalNumber("fieldSize"),
      lapsLed: optionalNumber("lapsLed"),
      incidents: optionalNumber("incidents"),
      stageResults: form.get("stageResults"),
      setupId: optionalNumber("setupId"),
      incidentX: marker?.x ?? null,
      incidentY: marker?.y ?? null,
      notes: form.get("notes"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Race not saved.");
      return;
    }
    formRef.current?.reset();
    setSessionId("");
    setSeriesId(String(series[0]?.id ?? ""));
    setTrackId(String(tracks.find((track) => track.seriesIds.includes(series[0]?.id ?? -1))?.id ?? ""));
    setMarker(null);
    setMessage("Race logged on this device.");
  }

  return (
    <section className="screen" aria-labelledby="log-title">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Fast entry lane · self-reported only</p>
          <h1 id="log-title">Log a race</h1>
          <p>Finish the current race session here, or log a new standalone race session. Nothing detects, imports, or watches the game.</p>
        </div>
        <StatusBadge>{races.length} owner-entered</StatusBadge>
      </header>

      <form className="entry-form race-entry" key={selectedSession?.id ?? "new-race"} onSubmit={submit} ref={formRef}>
        <div className="form-grid quick-grid">
          <Field label="Race session">
            <select
              onChange={(event) => {
                const next = raceSessions.find((session) => session.id === Number(event.target.value)) ?? null;
                setSessionId(event.target.value);
                if (next) {
                  setSeriesId(String(next.seriesId));
                  setTrackId(String(next.trackId));
                  setMarker(next.incidentX === null || next.incidentY === null ? null : { x: next.incidentX, y: next.incidentY });
                }
              }}
              value={selectedSession?.id ?? ""}
            >
              <option value="">New race session</option>
              {raceSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.id === currentRaceSession?.id ? "Current · " : ""}{session.sessionDate} · {tracks.find((track) => track.id === session.trackId)?.name ?? "Manual track"}
                </option>
              ))}
            </select>
          </Field>
          <Field error={errors.seriesId} label="Series">
            <select
              name="seriesId"
              onChange={(event) => {
                const nextSeriesId = event.target.value;
                setSeriesId(nextSeriesId);
                setTrackId(String(tracks.find((track) => track.seriesIds.includes(Number(nextSeriesId)))?.id ?? ""));
                setMarker(null);
              }}
              disabled={Boolean(selectedSession)}
              required
              value={seriesId}
            >
              {series.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field error={errors.trackId} label="Track">
            <select
              name="trackId"
              onChange={(event) => {
                setTrackId(event.target.value);
                setMarker(null);
              }}
              disabled={Boolean(selectedSession)}
              required
              value={effectiveTrackId}
            >
              {eligibleTracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
            </select>
          </Field>
          <Field error={errors.raceDate} label="Date"><input defaultValue={selectedSession?.sessionDate ?? localToday()} name="raceDate" required type="date" /></Field>
          <Field error={errors.startPosition} label="Start"><input defaultValue={selectedSession?.startPosition ?? ""} inputMode="numeric" min="1" name="startPosition" required type="number" /></Field>
          <Field error={errors.finishPosition} label="Finish"><input defaultValue={selectedSession?.finishPosition ?? ""} inputMode="numeric" min="1" name="finishPosition" required type="number" /></Field>
        </div>

        <details className="advanced-entry">
          <summary>Optional race context</summary>
          <div className="form-grid three">
            <Field error={errors.fieldSize} hint="Needed for the Pace Index; entered by you." label="Field size"><input defaultValue={selectedSession?.fieldSize ?? ""} min="1" name="fieldSize" type="number" /></Field>
            <Field error={errors.incidents} label="Incidents"><input defaultValue={selectedSession?.incidents ?? ""} min="0" name="incidents" type="number" /></Field>
            <Field error={errors.lapsLed} label="Laps led"><input defaultValue={selectedSession?.lapsLed ?? ""} min="0" name="lapsLed" type="number" /></Field>
            <Field label="Stage results"><input defaultValue={selectedSession?.stageResults ?? ""} name="stageResults" placeholder="e.g. 12 / 9" /></Field>
            <Field label="Linked setup note">
              <select defaultValue={sessionSetups[0]?.id ?? ""} name="setupId">
                <option value="">None</option>
                {sessionSetups.map((setup) => <option key={setup.id} value={setup.id}>{setup.title}</option>)}
              </select>
            </Field>
          </div>
          <TrackSchematic marker={marker} onChange={setMarker} track={selectedTrack} />
          {errors.incidentLocation ? <p className="field-error">{errors.incidentLocation}</p> : null}
          <Field label="Race notes"><textarea defaultValue={selectedSession?.notes ?? ""} name="notes" placeholder="Balance, strategy, cautions, what to change next time…" rows={4} /></Field>
        </details>

        <div className="form-submit-line">
          <button className="primary-action" disabled={pending} type="submit">
            {pending ? "Saving…" : selectedSession ? "Finish race session" : "Save race"}
          </button>
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <span>Stored only on this device</span>
        </div>
      </form>

      <div className="section-divider">
        <span>Recent manual entries</span>
        <strong>{String(races.length).padStart(2, "0")}</strong>
      </div>
      {orderedRaces.length ? (
        <div className="race-list">
          {orderedRaces.map((race) => {
            const gained = race.startPosition - race.finishPosition;
            return (
              <article className="race-row" key={race.id}>
                <time dateTime={race.raceDate}>{race.raceDate}</time>
                <div>
                  <span className="eyebrow">{series.find((item) => item.id === race.seriesId)?.shortCode}</span>
                  <h2>{tracks.find((track) => track.id === race.trackId)?.name ?? "Manual track"}</h2>
                  {race.notes ? <p>{race.notes}</p> : null}
                </div>
                <dl>
                  <div><dt>Start</dt><dd>P{race.startPosition}</dd></div>
                  <div><dt>Finish</dt><dd>P{race.finishPosition}</dd></div>
                  <div><dt>Delta</dt><dd className={gained >= 0 ? "positive" : "negative"}>{gained > 0 ? "+" : ""}{gained}</dd></div>
                </dl>
                <button
                  className="text-action danger"
                  onClick={async () => {
                    if (window.confirm("Delete this manually entered race?")) await onDelete(race.id);
                  }}
                  type="button"
                >Delete</button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <span aria-hidden="true">R/00</span>
          <h2>No races logged yet</h2>
          <p>Your first saved result will replace this empty lane.</p>
        </div>
      )}
    </section>
  );
}
