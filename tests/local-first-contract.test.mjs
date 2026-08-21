import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { createStoreFromSeed } from "../lib/store.js";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("uses one canonical device-local root instead of hosted or per-mode storage", async () => {
  const hosting = JSON.parse(await source(".openai/hosting.json"));
  const store = await source("lib/store.js");
  const database = await source("db/index.ts");
  const rootStore = createStoreFromSeed({
    series: [],
    drivers: [],
    tracks: [],
    schedule: [],
    races: [],
    setups: [],
  }, "2026-08-15T00:00:00.000Z");

  assert.equal(hosting.d1, null);
  assert.equal(hosting.r2, null);
  assert.deepEqual(Object.keys(rootStore), [
    "schemaVersion",
    "sessions",
    "setups",
    "tracks",
    "drivers",
    "meta",
  ]);
  assert.match(store, /n25-setup-lab-store/);
  assert.doesNotMatch(store, /fetch\s*\(/);
  assert.doesNotMatch(database, /cloudflare:workers|drizzle-orm|D1Database/);

  await assert.rejects(access(new URL("app/api/bootstrap/route.ts", root)));
  await assert.rejects(access(new URL("lib/local-store.ts", root)));
});

test("declares an installable same-origin offline shell", async () => {
  const manifest = JSON.parse(await source("public/manifest.webmanifest"));
  const worker = await source("public/sw.js");
  const layout = await source("app/layout.tsx");

  assert.equal(manifest.name, "NASCAR 25 Setup Lab");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
  assert.match(layout, /manifest:\s*["']\/manifest\.webmanifest["']/);
  assert.match(worker, /addEventListener\(["']install["']/);
  assert.match(worker, /addEventListener\(["']activate["']/);
  assert.match(worker, /addEventListener\(["']fetch["']/);
  assert.match(worker, /response\.text\(\)/);
  assert.match(worker, /matchAll/);
  assert.match(worker, /cache\.add/);
  assert.match(worker, /Promise\.all\(/);
  assert.doesNotMatch(worker, /Promise\.allSettled/);
  assert.match(worker, /url\.origin\s*!==\s*self\.location\.origin/);
  assert.doesNotMatch(worker, /nascar25\.com|reddit\.com|telemetry|save.file/i);
});
