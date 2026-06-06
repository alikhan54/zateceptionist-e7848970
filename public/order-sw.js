/**
 * /order/ storefront service worker.
 * Scoped to /order/* only — does NOT cache the staff app (/dashboard, /inbox, etc.).
 *
 * Strategy:
 *  - cache the HTML shell + the order-manifest endpoint for offline install
 *  - network-first for everything else (so prices stay fresh, RPC stays live)
 *  - never cache POSTs (the order RPC must always go live)
 */
const VERSION = "bbq-order-sw-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const SHELL_URLS = [
  "/",                       // root falls through to the SPA; safe to precache
  "/icons/icon-192.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("bbq-order-sw-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GETs within our scope. Anything else passes through.
  if (req.method !== "GET") return;
  if (!url.pathname.startsWith("/order/") && url.pathname !== "/order-manifest.webmanifest") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // network-first; opportunistically refresh the shell cache
        if (res.ok && (url.pathname.startsWith("/order/") || url.pathname === "/order-manifest.webmanifest")) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || new Response("Offline", { status: 503 }))),
  );
});
