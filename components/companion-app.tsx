"use client";

import { useEffect, useState } from "react";

import type { SaveOutcome } from "@/components/contracts";
import { DriverDirectory } from "@/components/screens/driver-directory";
import { RaceLog } from "@/components/screens/race-log";
import { ScheduleScreen } from "@/components/screens/schedule-screen";
import { SetupNotebook } from "@/components/screens/setup-notebook";
import { StatsDashboard } from "@/components/screens/stats-dashboard";
import { TrackDetail } from "@/components/screens/track-detail";
import { TrackDirectory } from "@/components/screens/track-directory";
import { AppNav, type ScreenKey } from "@/components/ui/app-nav";
import { CommandPalette } from "@/components/ui/command-palette";
import { DataBoundary } from "@/components/ui/data-boundary";
import { DataTools } from "@/components/ui/data-tools";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  BootstrapPayload,
  DriverRecord,
  RaceEntry,
  ScheduleRecord,
  SetupRecord,
  TrackRecord,
} from "@/lib/domain";
import {
  validateDriverInput,
  validateRaceInput,
  validateScheduleInput,
  validateSessionInput,
  validateSetupInput,
  validateTrackInput,
} from "@/lib/domain";
import { appStore } from "@/lib/store.js";
import { summarizeRaces } from "@/lib/stats";
import type { PrimaryScreenKey } from "@/lib/app-navigation";

type SaveResult<T> = SaveOutcome & { data?: T };

function DashboardStarter({
  data,
  goTo,
  onImport,
  onExport,
}: {
  data: BootstrapPayload;
  goTo: (screen: ScreenKey) => void;
  onImport: (json: string) => Promise<SaveOutcome>;
  onExport: () => Promise<string>;
}) {
  const summary = summarizeRaces(data.races);
  return (
    <section className="screen dashboard" aria-labelledby="dashboard-title">
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Post-race command · manual input only</p>
          <h1 id="dashboard-title">
            Your pit wall,
            <span> after the checkered flag.</span>
          </h1>
          <p>
            Log what happened, keep the setup notes worth remembering, and let your own race
            history produce the numbers.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => goTo("log")} type="button">
              Log a race
            </button>
            <button className="secondary-action" onClick={() => goTo("tracks")} type="button">
              Open track catalog
            </button>
          </div>
        </div>
        <div className="pit-board" aria-label={`${data.races.length} races logged`}>
          <span>RACES LOGGED</span>
          <strong>{String(data.races.length).padStart(2, "0")}</strong>
          <small>OWNER ENTERED</small>
        </div>
      </header>

      <div className="metric-strip">
        <article>
          <span>Average finish</span>
          <strong>{summary.averageFinish ?? "—"}</strong>
          <small>Self-logged races only</small>
        </article>
        <article>
          <span>Best result</span>
          <strong>{summary.bestFinish ? `P${summary.bestFinish}` : "—"}</strong>
          <small>{summary.top5Rate}% top-five rate</small>
        </article>
        <article>
          <span>Personal setups</span>
          <strong>{data.setups.length}</strong>
          <small>Freeform notebook records</small>
        </article>
        <article>
          <span>Reference tracks</span>
          <strong>{data.tracks.length}</strong>
          <small>Publisher catalog snapshot · dated</small>
        </article>
      </div>

      <DataBoundary />
      <DataTools data={data} onExport={onExport} onImport={onImport} />
    </section>
  );
}

export function CompanionApp({
  initialData,
  initialScreen,
}: {
  initialData: BootstrapPayload;
  initialScreen: PrimaryScreenKey;
}) {
  const [active, setActive] = useState<ScreenKey>(initialScreen);
  const [data, setData] = useState(initialData);
  const [storageState, setStorageState] = useState<"connecting" | "ready" | "unavailable">(
    "connecting",
  );
  const [notice, setNotice] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [detailTrackId, setDetailTrackId] = useState<number | null>(null);

  async function refreshData() {
    const next = await appStore.snapshot();
    setData(next);
    return next;
  }

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const localData = await appStore.load(initialData);
        if (cancelled) return;
        setData(localData);
        setStorageState("ready");
      } catch {
        if (cancelled) return;
        setStorageState("unavailable");
        setNotice(
          "Device storage is unavailable in this session. The dated reference snapshot is still visible.",
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  async function addDriver(input: Record<string, unknown>) {
    const checked = validateDriverInput(input);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      const record = await appStore.put("drivers", {
        ...checked.data,
        createdAt: new Date().toISOString(),
      }) as DriverRecord;
      setData((current) => ({
        ...current,
        drivers: [...current.drivers, record].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      return { ok: true, data: record } satisfies SaveResult<DriverRecord>;
    } catch {
      return { ok: false, error: "Could not save to this device." };
    }
  }

  async function removeDriver(id: number) {
    try {
      await appStore.delete("drivers", id);
      setData((current) => ({ ...current, drivers: current.drivers.filter((item) => item.id !== id) }));
      return { ok: true };
    } catch {
      setNotice("Driver record was not deleted from this device.");
      return { ok: false, error: "Driver record not deleted." };
    }
  }

  async function addTrack(input: Record<string, unknown>) {
    const checked = validateTrackInput(input);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      const record = await appStore.put("tracks", {
        ...checked.data,
        createdAt: new Date().toISOString(),
      }) as TrackRecord;
      setData((current) => ({
        ...current,
        tracks: [...current.tracks, record].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      return { ok: true, data: record } satisfies SaveResult<TrackRecord>;
    } catch {
      return { ok: false, error: "Could not save to this device." };
    }
  }

  async function removeTrack(id: number) {
    if (
      data.races.some((race) => race.trackId === id) ||
      data.setups.some((setup) => setup.trackId === id) ||
      data.schedule.some((event) => event.trackId === id)
    ) {
      setNotice("This track is linked to a race, setup, or schedule reference and was not deleted.");
      return { ok: false, error: "This track is still linked to another record." };
    }
    try {
      const deleted = await appStore.deleteTrackIfUnlinked(id);
      if (!deleted) {
        setNotice("This track gained a linked race, setup, or schedule reference and was not deleted.");
        return { ok: false, error: "This track is still linked to another record." };
      }
      setData((current) => ({ ...current, tracks: current.tracks.filter((item) => item.id !== id) }));
      return { ok: true };
    } catch {
      setNotice("Track record was not deleted from this device.");
      return { ok: false, error: "Track record not deleted." };
    }
  }

  async function updateTrack(id: number, input: Record<string, unknown>) {
    const checked = validateTrackInput(input);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    const existing = data.tracks.find((track) => track.id === id);
    if (!existing) return { ok: false, error: "Track record not found." };
    try {
      const record = await appStore.put("tracks", {
        ...checked.data,
        id,
        createdAt: existing.createdAt,
      }) as TrackRecord;
      setData((current) => ({
        ...current,
        tracks: current.tracks.map((track) => track.id === id ? record : track),
      }));
      return { ok: true, data: record } satisfies SaveResult<TrackRecord>;
    } catch {
      return { ok: false, error: "Could not update this track on the device." };
    }
  }

  async function addSchedule(input: Record<string, unknown>) {
    const checked = validateScheduleInput(input);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      const record = await appStore.put("schedule", {
        ...checked.data,
        createdAt: new Date().toISOString(),
      }) as ScheduleRecord;
      setData((current) => ({
        ...current,
        schedule: [...current.schedule, record].sort((a, b) => a.raceDate.localeCompare(b.raceDate)),
      }));
      return { ok: true, data: record } satisfies SaveResult<ScheduleRecord>;
    } catch {
      return { ok: false, error: "Could not save to this device." };
    }
  }

  async function removeSchedule(id: number) {
    try {
      await appStore.delete("schedule", id);
      setData((current) => ({ ...current, schedule: current.schedule.filter((item) => item.id !== id) }));
      return { ok: true };
    } catch {
      setNotice("Schedule record was not deleted from this device.");
      return { ok: false, error: "Schedule record not deleted." };
    }
  }

  async function addRace(input: Record<string, unknown>) {
    const checked = validateRaceInput(input);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      const record = await appStore.recordRaceResult({
        ...checked.data,
        sessionId: input.sessionId === null || input.sessionId === undefined || input.sessionId === ""
          ? null
          : Number(input.sessionId),
      }) as RaceEntry;
      await refreshData();
      return { ok: true, data: record } satisfies SaveResult<RaceEntry>;
    } catch {
      return { ok: false, error: "Could not save this race on the device." };
    }
  }

  async function removeRace(id: number) {
    try {
      await appStore.delete("races", id);
      await refreshData();
      return { ok: true };
    } catch {
      setNotice("Race was not deleted from this device.");
      return { ok: false, error: "Race not deleted." };
    }
  }

  async function createSession(input: Record<string, unknown>) {
    const checked = validateSessionInput(input);
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      const record = await appStore.createSession(checked.data);
      await refreshData();
      return { ok: true, data: record };
    } catch {
      return { ok: false, error: "Could not start this session on the device." };
    }
  }

  async function selectCurrentSession(id: number | null) {
    try {
      await appStore.setCurrentSession(id);
      await refreshData();
    } catch {
      setNotice("Current session could not be changed on this device.");
    }
  }

  async function updateSession(id: number, input: Record<string, unknown>) {
    const existing = data.sessions.find((session) => session.id === id);
    if (!existing) return { ok: false, error: "Session record not found." };
    const checked = validateSessionInput({ ...existing, ...input });
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      await appStore.updateSession(id, checked.data);
      await refreshData();
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not update this session on the device." };
    }
  }

  async function addSetupDelta(input: Record<string, unknown>) {
    const current = data.sessions.find((session) => session.id === data.currentSessionId);
    if (!current) return { ok: false, error: "Start or select a current session first." };
    const checked = validateSetupInput({
      ...input,
      seriesId: current.seriesId,
      trackId: current.trackId,
    });
    if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
    try {
      const record = await appStore.saveSetupDelta({
        ...checked.data,
        sessionId: current.id,
      }) as SetupRecord;
      await refreshData();
      return { ok: true, data: record } satisfies SaveResult<SetupRecord>;
    } catch {
      return { ok: false, error: "Could not save this setup delta on the device." };
    }
  }

  async function removeSetup(id: number) {
    const linkedRaces = data.races.filter((race) => race.setupId === id);
    try {
      await appStore.unlinkSetupAndDelete(id);
      await refreshData();
      if (linkedRaces.length > 0) {
        setNotice("Setup note deleted. Its linked race results were kept without the setup link.");
      }
      return { ok: true };
    } catch {
      setNotice("Setup note was not deleted from this device.");
      return { ok: false, error: "Setup note not deleted." };
    }
  }

  async function importData(json: string) {
    try {
      const imported = await appStore.importJson(json);
      setData(imported);
      setStorageState("ready");
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not replace data on this device." };
    }
  }

  let screen: React.ReactNode;
  if (active === "dashboard") {
    screen = <DashboardStarter data={data} goTo={setActive} onExport={() => appStore.exportJson()} onImport={importData} />;
  } else if (active === "drivers") {
    screen = (
      <DriverDirectory
        drivers={data.drivers}
        onCreate={addDriver}
        onDelete={removeDriver}
        series={data.series}
      />
    );
  } else if (active === "tracks") {
    screen = (
      <TrackDirectory
        onCreate={addTrack}
        onDelete={removeTrack}
        onUpdate={updateTrack}
        onView={(id) => {
          setDetailTrackId(id);
          setActive("track-detail");
        }}
        series={data.series}
        tracks={data.tracks}
      />
    );
  } else if (active === "schedule") {
    screen = (
      <ScheduleScreen
        events={data.schedule}
        onCreate={addSchedule}
        onDelete={removeSchedule}
        series={data.series}
        tracks={data.tracks}
      />
    );
  } else if (active === "log") {
    screen = <RaceLog currentSessionId={data.currentSessionId} onCreate={addRace} onDelete={removeRace} races={data.races} series={data.series} sessions={data.sessions} setups={data.setups} tracks={data.tracks} />;
  } else if (active === "stats") {
    screen = <StatsDashboard onLogRace={() => setActive("log")} series={data.series} sessions={data.sessions} setups={data.setups} tracks={data.tracks} />;
  } else if (active === "track-detail") {
    const track = data.tracks.find((item) => item.id === detailTrackId);
    screen = track ? (
      <TrackDetail
        onBack={() => setActive("tracks")}
        series={data.series}
        sessions={data.sessions}
        setups={data.setups}
        track={track}
      />
    ) : <TrackDirectory onCreate={addTrack} onDelete={removeTrack} onUpdate={updateTrack} onView={() => setActive("tracks")} series={data.series} tracks={data.tracks} />;
  } else {
    screen = <SetupNotebook currentSessionId={data.currentSessionId} onCreateSession={createSession} onDelete={removeSetup} onSaveDelta={addSetupDelta} onSelectSession={selectCurrentSession} onUpdateSession={updateSession} series={data.series} sessions={data.sessions} setups={data.setups} tracks={data.tracks} />;
  }

  return (
    <>
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span>N25</span>
          <div>
            <strong>Companion</strong>
            <small>setup lab / race log</small>
          </div>
        </div>
        <AppNav active={active} />
        <div className="db-state" data-state={storageState}>
          <span aria-hidden="true" />
          {storageState === "connecting"
            ? "Opening device data"
            : storageState === "ready"
              ? "Device data ready"
              : "Reference-only mode"}
        </div>
      </aside>

      <div className="content-stage">
        <header className="topline">
          <div className="truth-rail" aria-label="Manual, private, dated data">
            <span>MANUAL</span><span>PRIVATE</span><span>DATED</span>
          </div>
          <div className="top-actions">
            <button className="command-trigger" onClick={() => setPaletteOpen(true)} type="button"><span>Search + commands</span><kbd>⌘ K</kbd></button>
            <StatusBadge>NASCAR 25 · no live connection</StatusBadge>
          </div>
        </header>
        {notice ? (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} type="button" aria-label="Dismiss message">×</button>
          </div>
        ) : null}
        {screen}
      </div>
    </main>
    <CommandPalette data={data} onClose={() => setPaletteOpen(false)} onNavigate={setActive} open={paletteOpen} />
    </>
  );
}
