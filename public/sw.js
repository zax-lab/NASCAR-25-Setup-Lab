const CACHE_NAME = "n25-setup-lab-shell-v3";
const SHELL = ["/manifest.webmanifest", "/favicon.svg"];

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(SHELL);

  const response = await fetch("/", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Application shell was not available during install.");
  await cache.put("/", response.clone());

  const html = await response.text();
  const assetUrls = Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g), (match) => match[1])
    .map((path) => new URL(path, self.location.origin))
    .filter(
      (url) =>
        url.origin === self.location.origin &&
        !url.pathname.startsWith("/signin-") &&
        (url.pathname.startsWith("/_next/") ||
          url.pathname.startsWith("/assets/") ||
          /\.(?:css|js|woff2?|svg)$/.test(url.pathname)),
    )
    .map((url) => `${url.pathname}${url.search}`);

  await Promise.all(Array.from(new Set(assetUrls)).map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheApplicationShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => (await caches.match(event.request)) ?? (await caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
