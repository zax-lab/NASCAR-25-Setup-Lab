"use client";

import { useMemo, useRef, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import { Field } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SeriesRecord, SessionRecord, SetupRecord, TrackRecord } from "@/lib/domain";

const cornerControls = ["Spring Rate", "Bump", "Rebound", "Tire Pressure", "Camber"];
const globalControls = [
  "Front Sway Bar",
  "Wheel Lock",
  "Brake Bias",
  "Rear End Ratio",
  "Wedge",
  "Left Side Weight",
  "Nose Weight",
  "Trim",
  "Rear Sway Bar",
];

const officialEffects = [
  {
    control: "Tight / Loose",
    effect: "Tight means the front tires do not turn enough; loose means the rear is too loose after the front turns. Letarte’s roughly 25%-toward-Loose example is for Martinsville, not a universal baseline.",
  },
  {
    control: "Spring Rate",
    effect: "Spring stiffness. In the guide’s right-front example, reducing spring rate when tight on entry and through the middle helps the car turn.",
  },
  {
    control: "Bump",
    effect: "Shock resistance while the shock compresses. The guide does not publish a universal adjustment direction.",
  },
  {
    control: "Rebound",
    effect: "Shock resistance while the shock extends. In the right-front example, reducing rebound for a loose-exit condition lets the front rise and transfers weight rearward.",
  },
  {
    control: "Tire Pressure",
    effect: "The guide tentatively describes lower pressure as more grip at that tire; it does not publish a universal target or range.",
  },
  {
    control: "Camber",
    effect: "How much the tire is tipped. More inward front camber can add front grip, while too much can feel good initially and worsen over a run.",
  },
  {
    control: "Front Sway Bar",
    effect: "A smaller bar helps the car turn; a larger bar makes it tighter and makes the front want to continue straight.",
  },
  {
    control: "Wheel Lock",
    effect: "How far the front tires turn. Increase it when the steering does not feel sharp enough.",
  },
  {
    control: "Brake Bias",
    effect: "The percentage represents front braking; 58% means more front than rear. The guide cites 55–58% as normal but gives no universal symptom-to-setting rule.",
  },
  {
    control: "Rear End Ratio",
    effect: "Described by the guide as how much RPM the engine turns down the straightaway. No universal acceleration or top-speed rule is published.",
  },
  {
    control: "Wedge",
    effect: "Total weight on the right-front plus left-rear. More wedge tightens the car and improves drive off, but hurts middle-corner turning.",
  },
  {
    control: "Left Side Weight",
    effect: "The guide says 53.0 for ovals and roughly 50 for road courses. That is guide advice, not proof of one class-wide lock for every combination.",
  },
  {
    control: "Nose Weight",
    effect: "More weight on the front tires feels more secure and tighter on entry, but makes direction change and middle-corner rotation harder.",
  },
  {
    control: "Trim",
    effect: "Steering alignment used to make the car run straight on the straightaway. The guide explicitly says this is not aerodynamic trim.",
  },
  {
    control: "Rear Sway Bar",
    effect: "Zero makes the car very tight. A larger bar adds turn and loosens the rear; a smaller bar makes the rear more secure.",
  },
] as const;

export function SetupNotebook({
  currentSessionId,
  onCreateSession,
  onDelete,
  onSaveDelta,
  onSelectSession,
  onUpdateSession,
  series,
  sessions,
  setups,
  tracks,
}: {
  currentSessionId: number | null;
  onCreateSession: (input: Record<string, unknown>) => Promise<SaveOutcome>;
  onDelete: (id: number) => Promise<SaveOutcome>;
  onSaveDelta: (input: Record<string, unknown>) => Promise<SaveOutcome>;
  onSelectSession: (id: number | null) => Promise<void>;
  onUpdateSession: (id: number, input: Record<string, unknown>) => Promise<SaveOutcome>;
  series: SeriesRecord[];
  sessions: SessionRecord[];
  setups: SetupRecord[];
  tracks: TrackRecord[];
}) {
  const deltaFormRef = useRef<HTMLFormElement>(null);
  const sessionFormRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const activeSession = sessions.find((session) => session.id === currentSessionId) ?? null;
  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.id - a.id),
    [sessions],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return setups.filter((setup) =>
      (!needle || `${setup.title} ${setup.setupNotes}`.toLowerCase().includes(needle)) &&
      (trackFilter === "all" || setup.trackId === Number(trackFilter)) &&
      (seriesFilter === "all" || setup.seriesId === Number(seriesFilter)),
    );
  }, [query, seriesFilter, setups, trackFilter]);

  async function startSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value ? Number(value) : null;
    };
    const result = await onCreateSession({
      sessionType: form.get("sessionType"),
      seriesId: Number(form.get("seriesId")),
      trackId: Number(form.get("trackId")),
      sessionDate: form.get("sessionDate"),
      averageLapSeconds: optionalNumber("averageLapSeconds"),
      bestLapSeconds: optionalNumber("bestLapSeconds"),
      tireNotes: form.get("tireNotes"),
      notes: form.get("notes"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Session not saved.");
      return;
    }
    sessionFormRef.current?.reset();
    setMessage("Current session started on this device.");
  }

  async function updateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSession) return;
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value ? Number(value) : null;
    };
    const result = await onUpdateSession(activeSession.id, {
      averageLapSeconds: optionalNumber("averageLapSeconds"),
      bestLapSeconds: optionalNumber("bestLapSeconds"),
      tireNotes: form.get("tireNotes"),
      notes: form.get("notes"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Session changes not saved.");
      return;
    }
    setMessage("Current session notes updated.");
  }

  async function saveDelta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const result = await onSaveDelta({
      title: form.get("title"),
      setupNotes: form.get("setupNotes"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Setup delta not saved.");
      return;
    }
    deltaFormRef.current?.reset();
    setMessage("Setup delta joined to the current session.");
  }

  return (
    <section className="screen" aria-labelledby="setups-title">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Session-linked notebook · text records, not game files</p>
          <h1 id="setups-title">Setups</h1>
          <p>Start or select one on-track session, then attach the setup changes you ran to that same record.</p>
        </div>
        <StatusBadge>{setups.length} personal notes</StatusBadge>
      </header>

      <aside className="verified-controls">
        <div className="verified-title">
          <p className="eyebrow">Official setup guide · documented fields and effects</p>
          <h2>Verified garage controls</h2>
          <p>No undocumented units, ranges, or “best” values are claimed here.</p>
        </div>
        <div>
          <span className="field-label">Basic setup mode</span>
          <div className="chip-row"><span className="data-chip">Tight ↔ Loose</span></div>
          <span className="field-label setup-control-group">At each corner</span>
          <div className="chip-row">{cornerControls.map((control) => <span className="data-chip" key={control}>{control}</span>)}</div>
        </div>
        <div>
          <span className="field-label">Whole car</span>
          <div className="chip-row">{globalControls.map((control) => <span className="data-chip" key={control}>{control}</span>)}</div>
        </div>
        <div className="verified-links">
          <a href="https://www.youtube.com/watch?v=b2gxr0Yw7JQ" rel="noreferrer" target="_blank">Steve Letarte setup video ↗</a>
          <a href="https://nascar25.com/videos/" rel="noreferrer" target="_blank">Official setup guide ↗</a>
          <a href="https://nascar25.com/release-notes-oct-21-2025/" rel="noreferrer" target="_blank">Oct 21 pit adjustment note ↗</a>
          <small>The Oct 21, 2025 official note added Tire Pressure and Wedge as pitting options. Community baselines and unconfirmed absence claims are not seeded.</small>
        </div>
        <details className="official-effects">
          <summary>What the official video says about each control</summary>
          <dl>
            {officialEffects.map(({ control, effect }) => (
              <div key={control}>
                <dt>{control}</dt>
                <dd>{effect}</dd>
              </div>
            ))}
          </dl>
          <p>These are bounded paraphrases of the official Steve Letarte video. Specific examples stay labeled as examples; undocumented mechanics remain unknown.</p>
        </details>
      </aside>

      <section className="entry-panel" aria-labelledby="current-session-title">
        <div className="screen-header">
          <div>
            <p className="eyebrow">Shared session spine</p>
            <h2 id="current-session-title">Current session</h2>
            <p>Practice, qualifying, or race. Race Log can finish a race session without creating a second record.</p>
          </div>
          <StatusBadge>{activeSession ? `${activeSession.sessionType} #${activeSession.id}` : "none selected"}</StatusBadge>
        </div>
        <div className="tool-row">
          <label>
            <span className="field-label">Active session</span>
            <select
              onChange={(event) => void onSelectSession(event.target.value ? Number(event.target.value) : null)}
              value={activeSession?.id ?? ""}
            >
              <option value="">No current session</option>
              {orderedSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.sessionDate} · {session.sessionType} · {tracks.find((track) => track.id === session.trackId)?.name ?? "Manual track"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeSession ? (
          <form className="entry-form" key={activeSession.id} onSubmit={updateSession}>
            <div className="form-grid three">
              <Field label="Series"><input disabled value={series.find((item) => item.id === activeSession.seriesId)?.name ?? "Manual series"} /></Field>
              <Field label="Track"><input disabled value={tracks.find((track) => track.id === activeSession.trackId)?.name ?? "Manual track"} /></Field>
              <Field label="Session"><input disabled value={`${activeSession.sessionType} · ${activeSession.sessionDate}`} /></Field>
              <Field error={errors.averageLapSeconds} label="Average lap (seconds)"><input defaultValue={activeSession.averageLapSeconds ?? ""} inputMode="decimal" min="0" name="averageLapSeconds" step="0.001" type="number" /></Field>
              <Field error={errors.bestLapSeconds} label="Best lap (seconds)"><input defaultValue={activeSession.bestLapSeconds ?? ""} inputMode="decimal" min="0" name="bestLapSeconds" step="0.001" type="number" /></Field>
              <Field label="Tire notes"><input defaultValue={activeSession.tireNotes} name="tireNotes" placeholder="e.g. RF fades after 20" /></Field>
            </div>
            <Field label="Session notes"><textarea defaultValue={activeSession.notes} name="notes" rows={3} /></Field>
            <div className="form-submit-line"><button className="secondary-action" disabled={pending} type="submit">{pending ? "Saving…" : "Save session notes"}</button></div>
          </form>
        ) : null}

        <details open={!activeSession}>
          <summary>Start a session</summary>
          <form className="entry-form" onSubmit={startSession} ref={sessionFormRef}>
            <div className="form-grid three">
              <Field error={errors.sessionType} label="Session type"><select defaultValue="practice" name="sessionType"><option value="practice">Practice</option><option value="qualifying">Qualifying</option><option value="race">Race</option></select></Field>
              <Field error={errors.seriesId} label="Series"><select defaultValue={series[0]?.id ?? ""} name="seriesId" required>{series.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field error={errors.trackId} label="Track"><select defaultValue={tracks[0]?.id ?? ""} name="trackId" required>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></Field>
              <Field error={errors.sessionDate} label="Date"><input defaultValue={new Date().toISOString().slice(0, 10)} name="sessionDate" required type="date" /></Field>
              <Field error={errors.averageLapSeconds} label="Average lap (seconds)"><input inputMode="decimal" min="0" name="averageLapSeconds" step="0.001" type="number" /></Field>
              <Field error={errors.bestLapSeconds} label="Best lap (seconds)"><input inputMode="decimal" min="0" name="bestLapSeconds" step="0.001" type="number" /></Field>
            </div>
            <Field label="Tire notes"><input name="tireNotes" placeholder="What changed through the run?" /></Field>
            <Field label="Session notes"><textarea name="notes" rows={3} /></Field>
            <div className="form-submit-line"><button className="primary-action" disabled={pending} type="submit">{pending ? "Starting…" : "Start current session"}</button></div>
          </form>
        </details>
      </section>

      <div className="tool-row three">
        <label className="search-box"><span className="sr-only">Search setup notes</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search setup notes…" type="search" value={query} /></label>
        <label><span className="sr-only">Filter setup notes by series</span><select onChange={(event) => setSeriesFilter(event.target.value)} value={seriesFilter}><option value="all">All series</option>{series.map((item) => <option key={item.id} value={item.id}>{item.shortCode}</option>)}</select></label>
        <label><span className="sr-only">Filter setup notes by track</span><select onChange={(event) => setTrackFilter(event.target.value)} value={trackFilter}><option value="all">All tracks</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></label>
      </div>

      {visible.length ? (
        <div className="setup-grid">
          {visible.map((setup) => (
            <article className="setup-card" key={setup.id}>
              <div className="record-kicker"><span>{series.find((item) => item.id === setup.seriesId)?.shortCode}</span><span>Personal note</span></div>
              <h2>{setup.title}</h2>
              <p className="setup-track">{tracks.find((track) => track.id === setup.trackId)?.name} · {sessions.find((session) => session.id === setup.sessionId)?.sessionType ?? "session"} #{setup.sessionId}</p>
              <pre>{setup.setupNotes || "No values recorded."}</pre>
              <footer>
                <time dateTime={setup.createdAt}>{setup.createdAt.slice(0, 10)}</time>
                <button className="text-action danger" onClick={async () => { if (window.confirm(`Delete “${setup.title}”? Any linked race results will be kept without this setup link.`)) await onDelete(setup.id); }} type="button">Delete</button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty"><span aria-hidden="true">S/00</span><h2>No matching setup notes</h2><p>Save your own values below; the app will not fetch a community setup.</p></div>
      )}

      <details className="entry-panel" open={Boolean(activeSession)}>
        <summary>Save a setup delta to the current session</summary>
        {activeSession ? (
        <form className="entry-form" onSubmit={saveDelta} ref={deltaFormRef}>
          <div className="form-grid two">
            <Field label="Current session"><input disabled value={`${activeSession.sessionDate} · ${activeSession.sessionType} · ${tracks.find((track) => track.id === activeSession.trackId)?.name ?? "Manual track"}`} /></Field>
            <Field error={errors.title} label="Delta title"><input name="title" placeholder="e.g. Wedge -0.5 / long run" required /></Field>
          </div>
          <Field hint="Freeform on purpose: copy only the fields and values you personally want to remember." label="Setup notes"><textarea name="setupNotes" placeholder={'LF pressure: …\nRF pressure: …\nWedge: …\nBalance after 20 laps: …'} rows={10} /></Field>
          <div className="form-submit-line"><button className="primary-action" disabled={pending} type="submit">{pending ? "Saving…" : "Save setup delta"}</button>{message ? <p className="form-message" role="status">{message}</p> : null}<span>Joined to session #{activeSession.id}</span></div>
        </form>
        ) : <p className="field-hint">Start or select a current session above before saving a setup delta.</p>}
      </details>
    </section>
  );
}
