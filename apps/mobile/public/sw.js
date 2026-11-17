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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(BUILD.shell)).then(() => self.skipWaiting()));
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
