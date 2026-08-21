"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import { Field, SeriesChecks } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LayoutType, SeriesRecord, TrackRecord } from "@/lib/domain";

const layoutLabels: Record<LayoutType, string> = {
  short_track: "Short track",
  intermediate: "Intermediate",
  superspeedway: "Superspeedway",
  road_course: "Road course",
  dirt: "Dirt",
  unclassified: "Not classified",
};

function TrackEditor({
  onCancel,
  onUpdate,
  series,
  track,
}: {
  onCancel: () => void;
  onUpdate: (id: number, input: Record<string, unknown>) => Promise<SaveOutcome>;
  series: SeriesRecord[];
  track: TrackRecord;
}) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const length = String(form.get("lengthMiles") ?? "").trim();
    const result = await onUpdate(track.id, {
      name: track.name,
      seriesIds: form.getAll("seriesIds").map(Number),
      layoutType: form.get("layoutType"),
      lengthMiles: length ? Number(length) : null,
      bankingNotes: form.get("bankingNotes"),
      notes: form.get("notes"),
      sourceUrl: track.sourceUrl,
      reviewedAt: form.get("reviewedAt"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Track changes not saved.");
      return;
    }
    setMessage("Manual track details updated on this device.");
  }

  return (
    <section className="track-editor">
      <header>
        <div><p className="eyebrow">Edit manual track details</p><h2 id="track-editor-title">{track.name}</h2></div>
        <button autoFocus className="text-action" onClick={onCancel} type="button">Close editor</button>
      </header>
      <form className="entry-form" onSubmit={submit}>
        <div className="form-grid three">
          <Field label="Layout type">
            <select defaultValue={track.layoutType} name="layoutType">
              {Object.entries(layoutLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field error={errors.lengthMiles} label="Length in miles"><input defaultValue={track.lengthMiles ?? ""} min="0" name="lengthMiles" step="0.001" type="number" /></Field>
          <Field error={errors.reviewedAt} label="Reviewed date"><input defaultValue={track.reviewedAt ?? ""} name="reviewedAt" type="date" /></Field>
        </div>
        <SeriesChecks defaultIds={track.seriesIds} series={series} />
        {errors.seriesIds ? <p className="field-error">{errors.seriesIds}</p> : null}
        <Field label="Banking notes"><input defaultValue={track.bankingNotes} name="bankingNotes" /></Field>
        <Field label="Notes"><textarea defaultValue={track.notes} name="notes" rows={4} /></Field>
        <div className="form-submit-line"><button className="primary-action" disabled={pending} type="submit">{pending ? "Saving…" : "Update track"}</button>{message ? <p className="form-message" role="status">{message}</p> : null}<span>Manual reference edit</span></div>
      </form>
    </section>
  );
}

function TrackEditorDialog({
  onCancel,
  onUpdate,
  series,
  track,
}: {
  onCancel: () => void;
  onUpdate: (id: number, input: Record<string, unknown>) => Promise<SaveOutcome>;
  series: SeriesRecord[];
  track: TrackRecord;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const activeElement = document.activeElement;
    const returnFocus = activeElement instanceof HTMLElement ? activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      if (returnFocus) returnFocus.focus();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="track-editor-title"
      className="track-editor-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onCancel();
      }}
      ref={dialogRef}
    >
      <TrackEditor
        onCancel={onCancel}
        onUpdate={onUpdate}
        series={series}
        track={track}
      />
    </dialog>
  );
}

export function TrackDirectory({
  onCreate,
  onDelete,
  onUpdate,
  onView,
  series,
  tracks,
}: {
  onCreate: (input: Record<string, unknown>) => Promise<SaveOutcome>;
  onDelete: (id: number) => Promise<SaveOutcome>;
  onUpdate: (id: number, input: Record<string, unknown>) => Promise<SaveOutcome>;
  onView: (id: number) => void;
  series: SeriesRecord[];
  tracks: TrackRecord[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [layoutFilter, setLayoutFilter] = useState("all");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tracks.filter((track) => {
      const matchesText = !normalized || track.name.toLowerCase().includes(normalized);
      const matchesSeries =
        seriesFilter === "all" || track.seriesIds.includes(Number(seriesFilter));
      const matchesLayout = layoutFilter === "all" || track.layoutType === layoutFilter;
      return matchesText && matchesSeries && matchesLayout;
    });
  }, [layoutFilter, query, seriesFilter, tracks]);
  const editingTrack = tracks.find((track) => track.id === editingTrackId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const length = String(form.get("lengthMiles") ?? "").trim();
    const result = await onCreate({
      name: form.get("name"),
      seriesIds: form.getAll("seriesIds").map(Number),
      layoutType: form.get("layoutType"),
      lengthMiles: length ? Number(length) : null,
      bankingNotes: form.get("bankingNotes"),
      notes: form.get("notes"),
      sourceUrl: form.get("sourceUrl"),
      reviewedAt: form.get("reviewedAt"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Track reference not saved.");
      return;
    }
    formRef.current?.reset();
    setMessage("Track reference saved.");
  }

  return (
    <section className="screen" aria-labelledby="tracks-title">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Catalog snapshot · reviewed Aug 14, 2026</p>
          <h1 id="tracks-title">Track directory</h1>
          <p>
            This manually maintained snapshot contains 31 names reviewed against the publisher&apos;s
            current track catalog. Unknown lengths and classifications stay blank instead of being guessed.
          </p>
        </div>
        <StatusBadge>{tracks.length} records</StatusBadge>
      </header>

      <aside className="verified-controls reference-audit" aria-label="Official track source audit">
        <div className="verified-title">
          <p className="eyebrow">Publisher documentation · current snapshot</p>
          <h2>Track source law</h2>
          <p>Current catalog · CUP 27 · XFI 25 · TRK 23 · ARCA 17.</p>
        </div>
        <div>
          <span className="field-label">Documented conflict</span>
          <p>
            The September 10 launch list included Michigan for Xfinity; the current catalog does not.
            This directory follows the current catalog and keeps the conflict visible.
          </p>
        </div>
        <div>
          <span className="field-label">January addition</span>
          <p>
            The January 21 patch added Portland to Quick Race and Online for Xfinity and ARCA.
            It did not claim Career or Championship availability.
          </p>
        </div>
        <div className="verified-links">
          <a href="https://nascar25.com/tracks/" rel="noreferrer" target="_blank">Current track catalog ↗</a>
          <a href="https://nascar25.com/nascar-25-track-list-reveal/" rel="noreferrer" target="_blank">Sept 10 launch list ↗</a>
          <a href="https://nascar25.com/release-notes-jan-21-2026/" rel="noreferrer" target="_blank">Jan 21 Portland note ↗</a>
          <small>Conflicting first-party records are dated and disclosed, never silently combined.</small>
        </div>
      </aside>

      <div className="tool-row three">
        <label className="search-box">
          <span className="sr-only">Search tracks</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search track…"
            type="search"
            value={query}
          />
        </label>
        <label>
          <span className="sr-only">Filter tracks by series</span>
          <select onChange={(event) => setSeriesFilter(event.target.value)} value={seriesFilter}>
            <option value="all">All series</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>{item.shortCode}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter tracks by layout</span>
          <select onChange={(event) => setLayoutFilter(event.target.value)} value={layoutFilter}>
            <option value="all">All layouts</option>
            {Object.entries(layoutLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="track-list">
        {visible.map((track, index) => (
          <article className="track-row" key={track.id}>
            <span className="track-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="track-main">
              <h2>{track.name}</h2>
              <div className="chip-row">
                {track.seriesIds.map((id) => (
                  <span className="data-chip" key={id}>
                    {series.find((item) => item.id === id)?.shortCode ?? "Series"}
                  </span>
                ))}
              </div>
              {track.notes ? <p className="track-reference-note">{track.notes}</p> : null}
            </div>
            <div className="track-spec">
              <span>{layoutLabels[track.layoutType]}</span>
              <strong>{track.lengthMiles ? `${track.lengthMiles} mi` : "Length not recorded"}</strong>
            </div>
            <div className="track-source">
              <span>{track.reviewedAt ? `Reviewed ${track.reviewedAt}` : "Not dated"}</span>
              {track.sourceUrl ? (
                <a href={track.sourceUrl} rel="noreferrer" target="_blank">Recorded source ↗</a>
              ) : null}
              <button
                aria-label={`Open personal session history for ${track.name}`}
                className="text-action"
                onClick={() => onView(track.id)}
                type="button"
              >
                History
              </button>
              <button
                aria-label={`Edit manual track details for ${track.name}`}
                className="text-action"
                onClick={() => setEditingTrackId(track.id)}
                type="button"
              >
                Edit
              </button>
              <button
                className="text-action danger"
                onClick={async () => {
                  if (window.confirm(`Delete ${track.name} from the manual catalog?`)) {
                    await onDelete(track.id);
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

      {editingTrack ? (
        <TrackEditorDialog
          key={editingTrack.id}
          onCancel={() => setEditingTrackId(null)}
          onUpdate={onUpdate}
          series={series}
          track={editingTrack}
        />
      ) : null}

      <details className="entry-panel">
        <summary>Add a manual track record</summary>
        <form className="entry-form" onSubmit={submit} ref={formRef}>
          <div className="form-grid two">
            <Field error={errors.name} label="Track name"><input name="name" required /></Field>
            <Field label="Layout type">
              <select defaultValue="unclassified" name="layoutType">
                {Object.entries(layoutLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field error={errors.lengthMiles} label="Length in miles">
              <input min="0" name="lengthMiles" step="0.001" type="number" />
            </Field>
            <Field error={errors.reviewedAt} label="Reviewed date">
              <input name="reviewedAt" type="date" />
            </Field>
          </div>
          <SeriesChecks series={series} />
          {errors.seriesIds ? <p className="field-error">{errors.seriesIds}</p> : null}
          <div className="form-grid two">
            <Field label="Banking notes"><input name="bankingNotes" /></Field>
            <Field label="Source URL"><input name="sourceUrl" type="url" /></Field>
          </div>
          <Field label="Notes"><textarea name="notes" rows={4} /></Field>
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <button className="primary-action" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save track record"}
          </button>
        </form>
      </details>
    </section>
  );
}
