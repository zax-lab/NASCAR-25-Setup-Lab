import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("crawl-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

function runtime() {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
}

function context() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

test("robots.txt explicitly permits crawling and advertises the sitemap", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://nascar-25-setup-lab.zaxcracked.chatgpt.site/robots.txt"),
    runtime(),
    context(),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain\b/i);
  const body = await response.text();
  assert.match(body, /^User-Agent:\s*\*$/im);
  assert.match(body, /^Allow:\s*\/$/im);
  assert.match(
    body,
    /^Sitemap:\s*https:\/\/nascar-25-setup-lab\.zaxcracked\.chatgpt\.site\/sitemap\.xml$/im,
  );
});

test("sitemap exposes the review index and every primary app view", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://nascar-25-setup-lab.zaxcracked.chatgpt.site/sitemap.xml"),
    runtime(),
    context(),
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /xml/i);
  const body = await response.text();
  for (const path of [
    "",
    "/review",
    "/view/log",
    "/view/stats",
    "/view/drivers",
    "/view/tracks",
    "/view/setups",
    "/view/schedule",
  ]) {
    assert.match(
      body,
      new RegExp(`<loc>https://nascar-25-setup-lab\\.zaxcracked\\.chatgpt\\.site${path}<\\/loc>`),
    );
  }
});

test("review index gives text-only crawlers direct links to every app view", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://nascar-25-setup-lab.zaxcracked.chatgpt.site/review", {
      headers: { accept: "text/html" },
    }),
    runtime(),
    context(),
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AI review map/i);
  assert.match(html, /device-local records are not embedded/i);
  for (const path of [
    "/",
    "/view/log",
    "/view/stats",
    "/view/drivers",
    "/view/tracks",
    "/view/setups",
    "/view/schedule",
  ]) {
    assert.match(html, new RegExp(`href=["']${path}["']`, "i"));
  }
});

test("primary view routes return crawler-readable HTML with real navigation links", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://nascar-25-setup-lab.zaxcracked.chatgpt.site/view/log", {
      headers: { accept: "text/html" },
    }),
    runtime(),
    context(),
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Log a Race \| NASCAR 25 Setup Lab<\/title>/i);
  assert.match(html, /Log a race/i);
  assert.match(html, /href=["']\/view\/setups["']/i);
  assert.doesNotMatch(html, /name=["']robots["'][^>]*noindex/i);
});
