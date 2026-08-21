"use client";

import { useMemo, useRef, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import { Field, SeriesChecks } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DriverRecord, SeriesRecord } from "@/lib/domain";
import {
  CURRENT_DRIVER_GALLERY_SOURCE,
  DRIVER_ROSTER_REVIEWED_AT,
  DRIVER_ROSTER_SOURCES,
} from "@/lib/driver-reference";

export function DriverDirectory({
  drivers,
  onCreate,
  onDelete,
  series,
}: {
  drivers: DriverRecord[];
  onCreate: (input: Record<string, unknown>) => Promise<SaveOutcome>;
  onDelete: (id: number) => Promise<SaveOutcome>;
  series: SeriesRecord[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return drivers.filter((driver) => {
      const matchesText =
        !normalized ||
        [driver.name, driver.team, driver.carNumber, driver.manufacturer]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalized));
      const matchesSeries =
        seriesFilter === "all" || driver.seriesIds.includes(Number(seriesFilter));
      return matchesText && matchesSeries;
    });
  }, [drivers, query, seriesFilter]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage("");
    const form = new FormData(event.currentTarget);
    const ratingValue = String(form.get("inGameRating") ?? "").trim();
    const result = await onCreate({
      name: form.get("name"),
      seriesIds: form.getAll("seriesIds").map(Number),
      team: form.get("team"),
      carNumber: form.get("carNumber"),
      manufacturer: form.get("manufacturer"),
      inGameRating: ratingValue ? Number(ratingValue) : null,
      ratingSourceUrl: form.get("ratingSourceUrl"),
      notes: form.get("notes"),
      reviewedAt: form.get("reviewedAt"),
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? "Driver reference not saved.");
      return;
    }
    formRef.current?.reset();
    setMessage("Driver reference saved.");
  }

  return (
    <section className="screen" aria-labelledby="drivers-title">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Official gallery snapshot · reviewed Aug 14, 2026</p>
          <h1 id="drivers-title">Driver directory</h1>
          <p>
            The built-in seed transcribes 204 current publisher cards across four series.
            It is stored locally, remains editable, and is never presented as live.
          </p>
        </div>
        <StatusBadge>{drivers.length} records</StatusBadge>
      </header>

      <aside className="verified-controls reference-audit" aria-label="Official driver source audit">
        <div className="verified-title">
          <p className="eyebrow">Publisher documentation · current cards</p>
          <h2>Roster source law</h2>
          <p>
            Current card counts: CUP 47 · XFI 50 · TRK 49 · ARCA 58. Shared numbers
            remain separate entries because the publisher lists them separately.
          </p>
        </div>
        <div>
          <span className="field-label">Source precedence</span>
          <p>
            The October publisher gallery supersedes the four July/August roster articles,
            which total 196 entries. Those older tables remain linked as dated lineage.
          </p>
        </div>
        <div>
          <span className="field-label">Ratings status</span>
          <p>
            Ratings updated through the 2025 season using Racing Insights, according to the
            December 8 patch. It published no values, so seeded ratings stay blank.
          </p>
        </div>
        <div className="verified-links">
          <a href={CURRENT_DRIVER_GALLERY_SOURCE.url} rel="noreferrer" target="_blank">
            Current 204-driver gallery ↗
          </a>
          {Object.entries(DRIVER_ROSTER_SOURCES).map(([code, source]) => (
            <a href={source.url} key={code} rel="noreferrer" target="_blank">
              {code} roster · {source.publishedAt} ↗
            </a>
          ))}
          <a
            href="https://nascar25.com/release-notes-dec-8-2025/"
            rel="noreferrer"
            target="_blank"
          >
            Dec 8 ratings note ↗
          </a>
          <small>Snapshot reviewed {DRIVER_ROSTER_REVIEWED_AT}; outbound links open only when selected.</small>
        </div>
      </aside>

      <div className="tool-row">
        <label className="search-box">
          <span className="sr-only">Search drivers</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, team, number…"
            type="search"
            value={query}
          />
        </label>
        <label>
          <span className="sr-only">Filter drivers by series</span>
          <select onChange={(event) => setSeriesFilter(event.target.value)} value={seriesFilter}>
            <option value="all">All series</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.shortCode}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length ? (
        <div className="record-grid">
          {visible.map((driver) => (
            <article className="record-card" key={driver.id}>
              <div className="record-kicker">
                <span>{driver.carNumber ? `#${driver.carNumber}` : "No. —"}</span>
                <span>{driver.manufacturer ?? "Manufacturer not recorded"}</span>
              </div>
              <h2>{driver.name}</h2>
              <p>{driver.team ?? "Team not recorded"}</p>
              <div className="chip-row">
                {driver.seriesIds.map((id) => (
                  <span className="data-chip" key={id}>
                    {series.find((item) => item.id === id)?.shortCode ?? "Series"}
                  </span>
                ))}
              </div>
              <dl className="record-data">
                <div>
                  <dt>In-game rating</dt>
                  <dd>{driver.inGameRating ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Reviewed</dt>
                  <dd>{driver.reviewedAt ?? "Not dated"}</dd>
                </div>
              </dl>
              {driver.inGameRating !== null ? (
                <p className="provenance-note">
                  Manually entered rating · not live
                  {driver.ratingSourceUrl ? (
                    <> · <a href={driver.ratingSourceUrl} rel="noreferrer" target="_blank">recorded source ↗</a></>
                  ) : null}
                </p>
              ) : null}
              {driver.notes ? <p className="record-notes">{driver.notes}</p> : null}
              <button
                className="text-action danger"
                onClick={async () => {
                  if (window.confirm(`Delete the manual record for ${driver.name}?`)) {
                    await onDelete(driver.id);
                  }
                }}
                type="button"
              >
                Delete record
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">D/00</span>
          <h2>No matching driver records</h2>
          <p>Add a manually reviewed record below. The app will not scrape a roster for you.</p>
        </div>
      )}

      <details className="entry-panel">
        <summary>Add a manual driver record</summary>
        <form className="entry-form" onSubmit={submit} ref={formRef}>
          <div className="form-grid two">
            <Field error={errors.name} label="Driver name">
              <input name="name" required />
            </Field>
            <Field label="Car number">
              <input inputMode="numeric" name="carNumber" />
            </Field>
            <Field label="Team">
              <input name="team" />
            </Field>
            <Field label="Manufacturer">
              <input name="manufacturer" />
            </Field>
          </div>
          <SeriesChecks series={series} />
          {errors.seriesIds ? <p className="field-error">{errors.seriesIds}</p> : null}
          <div className="form-grid two">
            <Field
              error={errors.inGameRating}
              hint="Optional. Enter a dated value and record its source."
              label="In-game rating"
            >
              <input max="100" min="0" name="inGameRating" type="number" />
            </Field>
            <Field label="Rating source URL">
              <input name="ratingSourceUrl" type="url" />
            </Field>
            <Field error={errors.reviewedAt} label="Reviewed date">
              <input name="reviewedAt" type="date" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea name="notes" rows={4} />
          </Field>
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <button className="primary-action" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save driver record"}
          </button>
        </form>
      </details>
    </section>
  );
}
