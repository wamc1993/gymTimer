const CACHE_NAME = "gym-timer-v3";
const ASSETS = ["./", "./index.html", "./manifest.json"];

// Install: cache all assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// Escuchar mensajes desde el hilo principal
// El hilo principal detecta el fin del timer (mantenido vivo por el audio silencioso)
// y le pide al SW que muestre la notificación.
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "TIMER_DONE") return;

  self.registration.showNotification("Rest Timer", {
    body: "¡Descanso terminado! Serie #" + e.data.sets,
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%230a0a0a'/%3E%3Ccircle cx='256' cy='256' r='110' fill='none' stroke='%23E63946' stroke-width='14'/%3E%3Ccircle cx='256' cy='256' r='8' fill='%23E63946'/%3E%3C/svg%3E",
    vibrate: [200, 100, 200, 100, 400],
    tag: "timer-done",
    renotify: true,
  });
});

// Click en la notificación: enfocar la app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("./");
      }
    })
  );
});
