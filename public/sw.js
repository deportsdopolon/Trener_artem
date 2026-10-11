const CACHE = "tonus-v2";
const BASE = self.registration.scope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(BASE);
      if (!response.ok) throw new Error("App shell unavailable");
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)="([^"\s]+)"/g)]
        .map((m) => m[1])
        .filter(
          (url) =>
            (url.startsWith(BASE) || url.startsWith("/trener_artem/")) &&
            !url.includes("manifest"),
        );
      await cache.addAll([
        ...new Set([
          BASE,
          `${BASE}manifest.webmanifest`,
          `${BASE}icon-192.png`,
          `${BASE}icon-512.png`,
          ...assets,
        ]),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("tonus-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (event.request.mode === "navigate") {
        try {
          const response = await fetch(event.request);
          if (response.ok) return response;
        } catch {}
        return (await cache.match(BASE)) || Response.error();
      }
      const saved = await cache.match(event.request);
      if (saved) return saved;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })(),
  );
});
