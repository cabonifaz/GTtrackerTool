// Custom service worker source: next-pwa lo empaqueta como worker-*.js e
// importScripts() lo agrega automaticamente al sw.js generado por Workbox.
// Maneja los eventos push/notificationclick que Workbox no cubre.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Clonclokify", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Clonclokify", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/cronometro" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/cronometro";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existente = clientsArr.find((c) => c.url.includes(url));
      if (existente) return existente.focus();
      return self.clients.openWindow(url);
    })
  );
});
