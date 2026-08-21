export const APP_SCREENS = [
  {
    key: "dashboard",
    label: "Dashboard",
    marker: "PIT",
    href: "/",
    description: "Overview, quick actions, local-data status, and backup tools.",
  },
  {
    key: "log",
    label: "Log a Race",
    marker: "+1",
    href: "/view/log",
    description: "Manual race-result entry and recent race history.",
  },
  {
    key: "stats",
    label: "My Stats",
    marker: "Δ",
    href: "/view/stats",
    description: "Statistics derived from device-local race and session records.",
  },
  {
    key: "drivers",
    label: "Driver Directory",
    marker: "D",
    href: "/view/drivers",
    description: "Dated driver reference records and manual record controls.",
  },
  {
    key: "tracks",
    label: "Track Directory",
    marker: "T",
    href: "/view/tracks",
    description: "Dated track references and access to personal track history.",
  },
  {
    key: "setups",
    label: "Setups",
    marker: "S",
    href: "/view/setups",
    description: "Session-linked setup notes and documented garage controls.",
  },
  {
    key: "schedule",
    label: "Schedule",
    marker: "CAL",
    href: "/view/schedule",
    description: "Manually maintained real-world schedule references.",
  },
] as const;

export type PrimaryScreenKey = (typeof APP_SCREENS)[number]["key"];
export type ScreenKey = PrimaryScreenKey | "track-detail";

