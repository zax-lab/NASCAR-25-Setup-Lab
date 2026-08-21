"use client";

import { useEffect, useMemo, useState } from "react";

import type { ScreenKey } from "@/components/ui/app-nav";
import type { BootstrapPayload } from "@/lib/domain";
import { searchCompanion } from "@/lib/search";

const quickActions: Array<{ marker: string; label: string; detail: string; screen: ScreenKey }> = [
  { marker: "R", label: "Log a race", detail: "Open the manual fast-entry form", screen: "log" },
  { marker: "S", label: "Save setup notes", detail: "Open the personal setup notebook", screen: "setups" },
  { marker: "Σ", label: "Review my stats", detail: "Charts from self-entered races", screen: "stats" },
  { marker: "T", label: "Browse track catalog", detail: "Open the dated manual reference", screen: "tracks" },
];

export function CommandPalette({
  data,
  onClose,
  onNavigate,
  open,
}: {
  data: BootstrapPayload;
  onClose: () => void;
  onNavigate: (screen: ScreenKey) => void;
  open: boolean;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCompanion(data, query), [data, query]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setQuery("");
        onClose();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onClose, open]);

  if (!open) return null;

  function close() {
    setQuery("");
    onClose();
  }

  return (
    <div className="palette-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <section aria-label="Command palette and local search" aria-modal="true" className="command-palette" role="dialog">
        <div className="palette-search">
          <span aria-hidden="true">⌕</span>
          <label className="sr-only" htmlFor="command-search">Search local notes and commands</label>
          <input
            autoFocus
            id="command-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, tracks, drivers, races…"
            type="search"
            value={query}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-results">
          <p className="palette-label">{query.trim() ? `${results.length} local matches` : "Quick actions"}</p>
          {query.trim() ? (
            results.length ? results.slice(0, 12).map((result) => (
              <button key={`${result.kind}-${result.id}`} onClick={() => { onNavigate(result.screen); close(); }} type="button">
                <span>{result.kind.slice(0, 1).toUpperCase()}</span>
                <div><strong>{result.title}</strong><small>{result.subtitle}{result.excerpt ? ` · ${result.excerpt}` : ""}</small></div>
              </button>
            )) : <div className="palette-empty"><strong>No local match</strong><small>Search never leaves this browser.</small></div>
          ) : quickActions.map((action) => (
            <button key={action.screen} onClick={() => { onNavigate(action.screen); close(); }} type="button">
              <span>{action.marker}</span><div><strong>{action.label}</strong><small>{action.detail}</small></div>
            </button>
          ))}
        </div>
        <footer><span>LOCAL INDEX</span><span>NO NETWORK SEARCH</span></footer>
      </section>
    </div>
  );
}
