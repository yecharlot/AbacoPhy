/* ÁbacoPhy service worker — network-first shell, offline fallback */
const CACHE = "abacophy-v6";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // API: always network, never cache
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ ok: false, offline: true, error: "sin conexión" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // HTML / navegación / SW: network-first (evita UI vieja tras cambios)
  const isNav = e.request.mode === "navigate";
  const isHTML = url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname.endsWith(".ans");
  const isSW = url.pathname.endsWith("/sw.js") || url.pathname === "/sw.js";

  if (isNav || isHTML || isSW) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok && !isSW) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((h) => h || caches.match("/")))
    );
    return;
  }

  // Estáticos (iconos, manifest): stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
