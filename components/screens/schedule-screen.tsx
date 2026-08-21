"use client";

import { useMemo, useRef, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import { Field } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ScheduleRecord, SeriesRecord, TrackRecord } from "@/lib/domain";

export function ScheduleScreen({
  events,
  onCreate,
  onDelete,
  series,
  tracks,
}: {
  events: ScheduleRecord[];
  onCreate: (input: Record<string, unknown>) => Promise<SaveOutcome>;
  onDelete: (id: number) => Promise<SaveOutcome>;
  series: SeriesRecord[];
  tracks: TrackRecord[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const visible = useMemo(
    () => events.filter((event) => seriesFilter === "all" || event.seriesId === Number(seriesFilter)),
    [events, seriesFilter],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const result = await onCreate({
      season: Number(form.get("season")),
      seriesId: Number(form.get("seriesId")),
      trackId: form.get("trackId") ? Number(form.get("trackId")) : null,
      eventName: form.get("eventName"),
      raceDate: form.get("raceDate"),
      notes: form.get("notes"),
      sourceUrl: form.get("sourceUrl"),
      reviewedAt: form.get("reviewedAt"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Schedule reference not saved.");
      return;
    }
    formRef.current?.reset();
    setMessage("Real-world schedule reference saved.");
  }

  return (
    <section className="screen" aria-labelledby="schedule-title">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Calendar lane · real-world reference only</p>
          <h1 id="schedule-title">Schedule</h1>
          <p>Dates entered here are real-world race weekends, not a confirmed in-game career calendar.</p>
        </div>
        <StatusBadge>{events.length} dates</StatusBadge>
      </header>

      <div className="tool-row compact">
        <label>
          <span className="sr-only">Filter schedule by series</span>
          <select onChange={(event) => setSeriesFilter(event.target.value)} value={seriesFilter}>
            <option value="all">All series</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>{item.shortCode}</option>
            ))}
          </select>
        </label>
      </div>

      {visible.length ? (
        <div className="schedule-list">
          {visible.map((event) => (
            <article className="schedule-row" key={event.id}>
              <time dateTime={event.raceDate}>
                <span>{event.raceDate.slice(0, 4)}</span>
                <strong>{event.raceDate.slice(5)}</strong>
              </time>
              <div>
                <p className="eyebrow">{series.find((item) => item.id === event.seriesId)?.name}</p>
                <h2>{event.eventName}</h2>
                <p>{tracks.find((track) => track.id === event.trackId)?.name ?? "Track not linked"}</p>
                {event.notes ? <p className="schedule-detail">{event.notes}</p> : null}
              </div>
              <div className="schedule-note">
                <StatusBadge>Real-world reference</StatusBadge>
                <span>{event.reviewedAt ? `Reviewed ${event.reviewedAt}` : "Review date not recorded"}</span>
                {event.sourceUrl ? <a href={event.sourceUrl} rel="noreferrer" target="_blank">Source ↗</a> : null}
                <button
                  className="text-action danger"
                  onClick={async () => {
                    if (window.confirm(`Delete ${event.eventName} from the manual schedule?`)) {
                      await onDelete(event.id);
                    }
                  }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">CAL/—</span>
          <h2>No manually reviewed dates</h2>
          <p>The app will not pull a live NASCAR schedule. Add a dated source below.</p>
        </div>
      )}

      <details className="entry-panel">
        <summary>Add a real-world schedule reference</summary>
        <form className="entry-form" onSubmit={submit} ref={formRef}>
          <div className="form-grid two">
            <Field error={errors.season} label="Season"><input defaultValue="2026" name="season" required type="number" /></Field>
            <Field error={errors.seriesId} label="Series">
              <select defaultValue="" name="seriesId" required>
                <option disabled value="">Choose series</option>
                {series.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field error={errors.eventName} label="Real-world event name"><input name="eventName" required /></Field>
            <Field error={errors.raceDate} label="Race date"><input name="raceDate" required type="date" /></Field>
            <Field label="Reference track">
              <select defaultValue="" name="trackId">
                <option value="">Not linked</option>
                {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
              </select>
            </Field>
            <Field error={errors.reviewedAt} label="Reviewed date"><input name="reviewedAt" type="date" /></Field>
            <Field label="Source URL"><input name="sourceUrl" type="url" /></Field>
          </div>
          <Field label="Notes"><textarea name="notes" rows={4} /></Field>
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <button className="primary-action" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save schedule reference"}
          </button>
        </form>
      </details>
    </section>
  );
}
