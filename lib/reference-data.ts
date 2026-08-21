import type { LayoutType } from "./domain";

export const REFERENCE_REVIEWED_AT = "2026-08-14";
export const TRACK_SOURCE_URL = "https://nascar25.com/tracks/";
export const TRACK_LAUNCH_SOURCE_URL =
  "https://nascar25.com/nascar-25-track-list-reveal/";
export const JANUARY_TRACK_UPDATE_SOURCE_URL =
  "https://nascar25.com/release-notes-jan-21-2026/";
export const SCHEDULE_SOURCE_URL =
  "https://www.nascar.com/news-media/2025/08/20/nascar-releases-2026-schedule-adding-chicagoland-and-shifting-all-star-to-dover/";
export const SERIES_SOURCE_URL =
  "https://nascar25.com/nascar-25-races-onto-playstation-5-xbox-series-xs-consoles-today/";

export const SERIES_SEED = [
  { name: "NASCAR Cup Series", shortCode: "CUP" },
  { name: "NASCAR Xfinity Series", shortCode: "XFI" },
  { name: "NASCAR Craftsman Truck Series", shortCode: "TRK" },
  { name: "ARCA Menards Series", shortCode: "ARCA" },
].map((series) => ({
  ...series,
  maintenanceStatus: "manual" as const,
  sourceUrl: SERIES_SOURCE_URL,
  reviewedAt: REFERENCE_REVIEWED_AT,
}));

type TrackSeed = {
  name: string;
  seriesCodes: string[];
  layoutType: LayoutType;
  lengthMiles: null;
  notes: string;
  sourceUrl: string;
  reviewedAt: string;
};

const track = (
  name: string,
  seriesCodes: string[],
  notes = "",
  sourceUrl = TRACK_SOURCE_URL,
): TrackSeed => ({
  name,
  seriesCodes,
  layoutType: "unclassified",
  lengthMiles: null,
  notes,
  sourceUrl,
  reviewedAt: REFERENCE_REVIEWED_AT,
});

export const TRACK_SEED: TrackSeed[] = [
  track("Bristol Motor Speedway", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Charlotte Motor Speedway", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Charlotte Road Course", ["CUP", "XFI", "TRK"]),
  track("Chicago Street Course", ["CUP", "XFI"]),
  track("Circuit of the Americas", ["CUP", "XFI"]),
  track("Darlington Raceway", ["CUP", "XFI", "TRK"]),
  track("Daytona International Speedway", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Dover Motor Speedway", ["CUP", "XFI", "ARCA"]),
  track("EchoPark Speedway", ["CUP", "XFI", "TRK"]),
  track("Homestead-Miami Speedway", ["CUP", "XFI", "TRK"]),
  track("Indianapolis Motor Speedway", ["CUP", "XFI"]),
  track("Iowa Speedway", ["CUP", "XFI", "ARCA"]),
  track("Kansas Speedway", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Las Vegas Motor Speedway", ["CUP", "XFI", "TRK"]),
  track("Lime Rock Park", ["TRK", "ARCA"]),
  track("Lucas Oil Raceway – IRP", ["TRK", "ARCA"]),
  track("Martinsville Speedway", ["CUP", "XFI", "TRK", "ARCA"]),
  track(
    "Michigan Speedway",
    ["CUP", "TRK", "ARCA"],
    "The publisher catalog reviewed August 14, 2026 omits Xfinity; the September 10, 2025 launch list included Michigan for Xfinity. This snapshot follows the reviewed catalog and records the conflict instead of guessing.",
  ),
  track("Nashville Superspeedway", ["CUP", "XFI", "TRK"]),
  track("New Hampshire Motor Speedway", ["CUP", "TRK"]),
  track("North Wilkesboro Speedway", ["CUP", "TRK", "ARCA"]),
  track("Phoenix Raceway", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Pocono Raceway", ["CUP", "XFI", "TRK"]),
  track(
    "Portland International Raceway",
    ["XFI", "ARCA"],
    "Added to Quick Race and Online for Xfinity and ARCA in the January 21, 2026 patch. Career and Championship availability were not stated.",
    JANUARY_TRACK_UPDATE_SOURCE_URL,
  ),
  track("Richmond Raceway", ["CUP", "TRK", "ARCA"]),
  track("Rockingham Speedway", ["XFI", "TRK", "ARCA"]),
  track(
    "Sonoma Raceway",
    ["CUP", "XFI"],
    "Track updates were recorded in the January 21, 2026 patch; the release note did not publish further detail.",
    JANUARY_TRACK_UPDATE_SOURCE_URL,
  ),
  track("Talladega Superspeedway", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Texas Motor Speedway", ["CUP", "XFI", "TRK"]),
  track("Watkins Glen International", ["CUP", "XFI", "TRK", "ARCA"]),
  track("Worldwide Tech Raceway", ["CUP", "XFI"]),
];

type ScheduleSeed = {
  season: 2026;
  seriesCode: "CUP";
  trackName: string | null;
  eventName: string;
  raceDate: string;
  notes: string;
  sourceUrl: string;
  reviewedAt: string;
};

const pointsNote = "Real-world 2026 Cup points race; not a confirmed in-game career date.";
const playoffNote = "Real-world 2026 Cup points/playoff race; not a confirmed in-game career date.";
const schedule = (
  raceDate: string,
  eventName: string,
  trackName: string | null,
  notes = pointsNote,
): ScheduleSeed => ({
  season: 2026,
  seriesCode: "CUP",
  trackName,
  eventName,
  raceDate,
  notes,
  sourceUrl: SCHEDULE_SOURCE_URL,
  reviewedAt: REFERENCE_REVIEWED_AT,
});

export const SCHEDULE_SEED: ScheduleSeed[] = [
  schedule(
    "2026-02-04",
    "Cook Out Clash at Bowman Gray Stadium",
    null,
    "Real-world exhibition/non-points event, postponed from Feb 1 because of snow. Bowman Gray Stadium is not in the dated game track snapshot.",
  ),
  schedule("2026-02-15", "Daytona 500", "Daytona International Speedway"),
  schedule("2026-02-22", "Autotrader 400", "EchoPark Speedway"),
  schedule("2026-03-01", "NASCAR Cup Series Race at COTA", "Circuit of the Americas"),
  schedule("2026-03-08", "Straight Talk Wireless 500", "Phoenix Raceway"),
  schedule("2026-03-15", "Pennzoil 400 presented by Jiffy Lube", "Las Vegas Motor Speedway"),
  schedule("2026-03-22", "Goodyear 400", "Darlington Raceway"),
  schedule("2026-03-29", "Cook Out 400", "Martinsville Speedway"),
  schedule("2026-04-12", "Food City 500", "Bristol Motor Speedway"),
  schedule("2026-04-19", "AdventHealth 400", "Kansas Speedway"),
  schedule("2026-04-26", "Jack Link’s 500", "Talladega Superspeedway"),
  schedule("2026-05-03", "Wurth 400 presented by LIQUI MOLY", "Texas Motor Speedway"),
  schedule("2026-05-10", "Go Bowling at the Glen", "Watkins Glen International"),
  schedule(
    "2026-05-17",
    "NASCAR All-Star Race",
    "Dover Motor Speedway",
    "Real-world invitational exhibition/non-points event; not a confirmed in-game career date.",
  ),
  schedule("2026-05-24", "Coca-Cola 600", "Charlotte Motor Speedway"),
  schedule("2026-05-31", "Cracker Barrel 400", "Nashville Superspeedway"),
  schedule(
    "2026-06-07",
    "FireKeepers Casino 400",
    "Michigan Speedway",
    "Real-world venue name is Michigan International Speedway; linked to the dated game-catalog label Michigan Speedway. Not a confirmed in-game career date.",
  ),
  schedule("2026-06-14", "The Great American Getaway 400", "Pocono Raceway"),
  schedule(
    "2026-06-21",
    "Anduril 250",
    null,
    "Real-world Cup points race at Naval Base Coronado, which is not in the dated game track snapshot. Not a confirmed in-game career date.",
  ),
  schedule("2026-06-28", "Toyota/Save Mart 350", "Sonoma Raceway"),
  schedule(
    "2026-07-05",
    "NASCAR Cup Series Race at Chicagoland",
    null,
    "Real-world Cup points race at Chicagoland Speedway, which is not in the dated game track snapshot. It is not mapped to Chicago Street Course.",
  ),
  schedule("2026-07-12", "Quaker State 400 Available at Walmart", "EchoPark Speedway"),
  schedule("2026-07-19", "Window World 450", "North Wilkesboro Speedway"),
  schedule("2026-07-26", "Brickyard 400", "Indianapolis Motor Speedway"),
  schedule("2026-08-09", "Iowa Corn 350 Powered by Ethanol", "Iowa Speedway"),
  schedule("2026-08-15", "Cook Out 400", "Richmond Raceway"),
  schedule("2026-08-23", "Dollar Tree 301", "New Hampshire Motor Speedway"),
  schedule("2026-08-29", "Coke Zero Sugar 400", "Daytona International Speedway"),
  schedule("2026-09-06", "Cook Out Southern 500", "Darlington Raceway", playoffNote),
  schedule(
    "2026-09-13",
    "Enjoy Illinois 300",
    "Worldwide Tech Raceway",
    "Real-world venue name is World Wide Technology Raceway; linked to the dated game-catalog label Worldwide Tech Raceway. Cup points/playoff race; not a confirmed in-game career date.",
  ),
  schedule("2026-09-19", "Bass Pro Shops Night Race", "Bristol Motor Speedway", playoffNote),
  schedule("2026-09-27", "Hollywood Casino 400", "Kansas Speedway", playoffNote),
  schedule("2026-10-04", "South Point 400", "Las Vegas Motor Speedway", playoffNote),
  schedule(
    "2026-10-11",
    "Bank of America 400",
    "Charlotte Road Course",
    "Real-world venue label is Charlotte Motor Speedway Roval; linked to the dated game-catalog label Charlotte Road Course. Cup points/playoff race; not a confirmed in-game career date.",
  ),
  schedule("2026-10-18", "Freeway Insurance 500", "Phoenix Raceway", playoffNote),
  schedule("2026-10-25", "YellaWood 500", "Talladega Superspeedway", playoffNote),
  schedule("2026-11-01", "Xfinity 500", "Martinsville Speedway", playoffNote),
  schedule("2026-11-08", "NASCAR Cup Series Championship Race", "Homestead-Miami Speedway", playoffNote),
];
