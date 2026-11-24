/*
 * Nora web app service worker: caches the versioned app shell only, so the app opens quickly and offline shows the
 * shell instead of a browser error. It never caches API, runtime or control-plane responses, nor any cross-origin
 * request. `scripts/stampServiceWorker.mjs` replaces the BUILD block after `expo export`.
 */
const BUILD = /* NORA_BUILD_START */ { id: "dev", shell: [] } /* NORA_BUILD_END */;
const CACHE_PREFIX = "nora-shell-";
const CACHE_NAME = CACHE_PREFIX + BUILD.id;
// Compare normalised pathnames: bundle names can contain characters (`[`, `+`) that URLs may encode.
const SHELL = new Set(BUILD.shell.map((path) => new URL(path, self.location.origin).pathname));

// What each shell file must be served as. Right after a deploy the host can briefly answer a not-yet-propagated bundle
// with the single-page-app fallback (index.html, status 200); caching that as JavaScript would leave the app blank until
// the next build, so install refuses any response whose type doesn't match and the browser retries on a later load.
const EXPECTED_TYPES = [[/\.js$/, "javascript"], [/\.css$/, "css"], [/\.png$/, "image/"], [/\.ico$/, "image/"],
  [/\.webmanifest$/, "json"], [/(^\/$|\.html$)/, "text/html"]];

function expectedType(path) {
  const match = EXPECTED_TYPES.find(([pattern]) => pattern.test(path));
  return match ? match[1] : null;
}

async function fetchShellFile(path) {
  const response = await fetch(path, { cache: "reload" });
  const type = response.headers.get("content-type") || "";
  const expected = expectedType(new URL(path, self.location.origin).pathname);
  if (!response.ok || (expected && !type.includes(expected))) throw new Error(`Unexpected ${response.status} ${type} for ${path}`);
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // Fetch and check every file before caching any, so a bad deploy window never leaves a half-poisoned cache.
    const responses = await Promise.all(BUILD.shell.map(fetchShellFile));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(BUILD.shell.map((path, index) => cache.put(path, responses[index])));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Network first so a new deploy is picked up on the next load; the cached shell is only an offline fallback.
    event.respondWith(fetch(request).catch(() => caches.match("/index.html").then((cached) => cached || Response.error())));
    return;
  }
  if (!SHELL.has(url.pathname)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
