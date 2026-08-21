import type { ReactNode } from "react";

export function Field({
  children,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
      {!error && hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function SeriesChecks({
  defaultIds = [],
  name = "seriesIds",
  series,
}: {
  defaultIds?: number[];
  name?: string;
  series: { id: number; shortCode: string; name: string }[];
}) {
  return (
    <fieldset className="series-checks">
      <legend className="field-label">Series</legend>
      <div className="check-grid">
        {series.map((item) => (
          <label className="check-chip" key={item.id}>
            <input defaultChecked={defaultIds.includes(item.id)} name={name} type="checkbox" value={item.id} />
            <span>{item.shortCode}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
