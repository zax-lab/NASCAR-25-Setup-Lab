const sources = [
  { label: "Official FAQ", href: "https://nascar25.com/faq/" },
  { label: "Official driver rosters", href: "https://nascar25.com/category/driver-rosters/" },
  { label: "Track catalog", href: "https://nascar25.com/tracks/" },
  { label: "Career documentation", href: "https://nascar25.com/career-mode/" },
  { label: "Official videos and setup guide", href: "https://nascar25.com/videos/" },
  {
    label: "Release-note archive",
    href: "https://nascar25.com/category/release-notes/",
  },
];

const DATA_BOUNDARY_STATEMENT = 'This app has zero integration with the NASCAR 25 game process, save files, or any game API — none exists publicly. Every "game" data point (driver ratings, track list) is static reference data I will maintain manually. All race results are typed in by the user after playing. Do not add auto-sync, live telemetry, save file import, or any feature implying a live connection to the game. Within that constraint, push hard on UI/UX polish, real data visualization of my self-logged stats, offline-first PWA engineering, and fast data entry — ambition should show up in craft and interaction design, not in fake game connectivity.';

export function DataBoundary() {
  return (
    <aside className="boundary" aria-label="Data boundary and source status">
      <div className="boundary-bus" aria-hidden="true">
        <span>MANUAL</span>
        <span>PRIVATE</span>
        <span>DATED</span>
      </div>
      <div className="boundary-copy">
        <p className="eyebrow">Connection state · intentionally disconnected</p>
        <h2>No game link. No invented feed.</h2>
        <p>{DATA_BOUNDARY_STATEMENT}</p>
        <div className="boundary-meta">
          <span>Manually maintained · reviewed Aug 14, 2026</span>
          <span>23 official release notes reviewed · Oct 10, 2025–March 11, 2026</span>
        </div>
        <div className="source-links" aria-label="Reviewed official sources">
          {sources.map((source) => (
            <a href={source.href} key={source.href} rel="noreferrer" target="_blank">
              {source.label}
            </a>
          ))}
        </div>
        <details className="source-ledger">
          <summary>How official documentation controls this snapshot</summary>
          <ul>
            <li>The current publisher driver gallery controls seeded names, numbers, and teams.</li>
            <li>The current track catalog controls current names and series tags.</li>
            <li>Dated release notes override previews when they describe a shipped change.</li>
            <li>Unpublished values—including numeric ratings and setup ranges—stay blank.</li>
            <li>First-party conflicts remain visible with dates; the app never resolves them by guessing.</li>
          </ul>
        </details>
      </div>
    </aside>
  );
}
