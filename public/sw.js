const CACHE_NAME = "arbibase-v1";
const urlsToCache = [
  "/",
  "/dashboard",
  "/properties",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// On install, try to fetch & cache resources one-by-one and ignore failures
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of urlsToCache) {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (res && res.ok) {
          await cache.put(url, res.clone());
        } else {
          // resource missing or returned non-OK -> skip it
          console.warn("SW: resource not cached (not OK):", url, res && res.status);
        }
      } catch (err) {
        // network error or 404 -> skip this resource
        console.warn("SW: failed to fetch resource, skipping:", url, err);
      }
    }
    // Skip waiting so new SW activates when possible
    await self.skipWaiting();
  })());
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((name) => {
        if (name !== CACHE_NAME) return caches.delete(name);
      })
    );
    await self.clients.claim();
  })());
});

// Fetch: respond with cached resource or fallback to network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // only handle GET
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // optionally cache navigation requests (opt-in)
      return res;
    } catch (err) {
      // Last-resort: return offline page or empty response
      console.warn("SW: fetch failed for ", req.url, err);
      return new Response(null, { status: 503, statusText: "Service Unavailable" });
    }
  })());
});
