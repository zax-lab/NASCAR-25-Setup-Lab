"use client";

import { useRef, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import type { BootstrapPayload } from "@/lib/domain";
import { exportRaceCsv } from "@/lib/portable-data";

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DataTools({
  data,
  onExport,
  onImport,
}: {
  data: BootstrapPayload;
  onExport: () => Promise<string>;
  onImport: (json: string) => Promise<SaveOutcome>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  return (
    <section className="data-tools" aria-labelledby="data-tools-title">
      <div>
        <p className="eyebrow">Portable by design</p>
        <h2 id="data-tools-title">Your data, your file.</h2>
        <p>Back up every local record as JSON or export your self-entered races as CSV.</p>
      </div>
      <div className="data-tool-actions">
        <button
          className="secondary-action"
          onClick={async () => {
            try {
              download(`n25-setup-lab-store-${new Date().toISOString().slice(0, 10)}.json`, await onExport(), "application/json");
              setMessage("Complete store backup downloaded.");
            } catch {
              setMessage("Could not export the device store.");
            }
          }}
          type="button"
        >Export JSON</button>
        <button
          className="secondary-action"
          onClick={() => {
            download(`n25-race-log-${new Date().toISOString().slice(0, 10)}.csv`, exportRaceCsv(data), "text/csv");
            setMessage("Race CSV downloaded.");
          }}
          type="button"
        >Export race CSV</button>
        <button className="secondary-action" onClick={() => inputRef.current?.click()} type="button">Import JSON</button>
        <input
          accept="application/json,.json"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              if (!window.confirm("Replace all device-local NASCAR 25 Setup Lab data with this backup?")) return;
              const result = await onImport(await file.text());
              setMessage(result.ok ? "Backup imported on this device." : result.error ?? "Import failed.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Import failed.");
            } finally {
              event.target.value = "";
            }
          }}
          ref={inputRef}
          type="file"
        />
      </div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </section>
  );
}
