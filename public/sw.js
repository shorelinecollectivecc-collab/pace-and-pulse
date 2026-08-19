const cacheName = "pace-pulse-shell-v1";
const shellFiles = ["/", "/manifest.webmanifest", "/pace-pulse-mark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(shellFiles))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== cacheName)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match("/"))
      )
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "pace & pulse",
    body: "a gentle nudge is ready",
    url: "/",
  };

  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const openClient = clients.find(
        (client) => "focus" in client
      );

      if (openClient) {
        openClient.navigate(url);
        return openClient.focus();
      }

      return self.clients.openWindow(url);
    })
  );
});
