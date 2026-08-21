import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("uses the authoritative Site title and all seven companion screens", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("ui-contract", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>NASCAR 25 Setup Lab<\/title>/);
  for (const [label, href] of [
    ["Dashboard", "/"],
    ["Log a Race", "/view/log"],
    ["My Stats", "/view/stats"],
    ["Driver Directory", "/view/drivers"],
    ["Track Directory", "/view/tracks"],
    ["Setups", "/view/setups"],
    ["Schedule", "/view/schedule"],
  ]) {
    assert.match(html, new RegExp(`href=["']${href}["'][^>]*>[\\s\\S]*?${label}`, "i"));
  }
});

test("renders the exact zero-integration boundary and dated official sources", async () => {
  const boundary = await source("components/ui/data-boundary.tsx");
  assert.match(
    boundary,
    /This app has zero integration with the NASCAR 25 game process, save files, or any game API — none exists publicly\./,
  );
  assert.match(
    boundary,
    /Within that constraint, push hard on UI\/UX polish, real data visualization of my self-logged stats, offline-first PWA engineering, and fast data entry — ambition should show up in craft and interaction design, not in fake game connectivity\./,
  );
  assert.match(boundary, /Manually maintained/);
  assert.match(boundary, /March 11, 2026/);
  for (const url of [
    "https://nascar25.com/faq/",
    "https://nascar25.com/tracks/",
    "https://nascar25.com/videos/",
    "https://nascar25.com/category/release-notes/",
  ]) {
    assert.match(boundary, new RegExp(url.replaceAll("/", "\\/")));
  }
});

test("includes phone-safe interactions and visible keyboard focus", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("lets the owner classify and revise seeded track references without creating duplicates", async () => {
  const tracks = await source("components/screens/track-directory.tsx");
  const app = await source("components/companion-app.tsx");

  assert.match(tracks, /Edit manual track details/);
  assert.match(tracks, /Update track/);
  assert.match(app, /async function updateTrack/);
  assert.match(tracks, /<dialog/);
  assert.match(tracks, /showModal\(\)/);
  assert.match(tracks, /onCancel=/);
  assert.match(tracks, /returnFocus\.focus\(\)/);
});

test("protects schedule links when a manual track record is deleted", async () => {
  const app = await source("components/companion-app.tsx");
  assert.match(app, /data\.schedule\.some\(\(event\) => event\.trackId === id\)/);
});
