const CACHE_NAME = "gym-timer-v2";
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

// ─── Timer scheduling interno del SW ────────────────────────────────────────
// El SW programa su propio setTimeout basado en endTime real.
// Esto es más robusto que depender del hilo principal cuando la app
// está en background o el sistema congela el JS de la pestaña.

let timerTimeout = null;
let pendingSets = 0;

function scheduleNotification(endTime, sets) {
  // Cancelar cualquier timer previo
  if (timerTimeout !== null) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }

  const delay = endTime - Date.now();
  if (delay <= 0) return; // ya expiró, ignorar

  pendingSets = sets;

  timerTimeout = setTimeout(() => {
    timerTimeout = null;
    self.registration.showNotification("Rest Timer", {
      body: "¡Descanso terminado! Serie #" + pendingSets,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%230a0a0a'/%3E%3Ccircle cx='256' cy='256' r='136' fill='none' stroke='%23E63946' stroke-width='14'/%3E%3Ccircle cx='256' cy='256' r='8' fill='%23E63946'/%3E%3C/svg%3E",
      vibrate: [200, 100, 200, 100, 400],
      tag: "timer-done",   // mismo tag = reemplaza notif anterior, nunca duplica
      renotify: true,
    });
  }, delay);
}

// Escuchar mensajes desde el hilo principal
self.addEventListener("message", (e) => {
  if (!e.data) return;

  if (e.data.type === "START_TIMER") {
    // El hilo principal inició un timer → SW lo re-programa por su cuenta
    scheduleNotification(e.data.endTime, e.data.sets);
  }

  if (e.data.type === "STOP_TIMER") {
    // Reset o reinicio → cancelar notificación pendiente
    if (timerTimeout !== null) {
      clearTimeout(timerTimeout);
      timerTimeout = null;
    }
  }
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
