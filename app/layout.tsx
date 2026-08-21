import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { PwaRegistration } from "@/components/pwa-registration";

import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const data = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nascar-25-setup-lab.zaxcracked.chatgpt.site"),
  title: "NASCAR 25 Setup Lab",
  description:
    "A private, manual-entry race log and reference companion for NASCAR 25.",
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "NASCAR 25 Setup Lab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "N25 Lab",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${data.variable}`}>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
