import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Catalogos y listas que cambian poco dentro de una sesion (roles,
      // paises, proyectos/tareas asignadas). StaleWhileRevalidate sirve la
      // respuesta cacheada al instante (navegacion casi sin espera con la
      // PWA instalada) y refresca en segundo plano, en vez de esperar
      // siempre a la red como hace el "apis" NetworkFirst por defecto.
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin &&
          /^\/api\/(maestro|proyectos|tareas|usuario-proyectos\/mios|clientes)(\?|$)/.test(
            url.pathname + url.search
          ),
        handler: "StaleWhileRevalidate",
        method: "GET",
        options: {
          cacheName: "api-catalogos",
          expiration: { maxEntries: 40, maxAgeSeconds: 300 },
        },
      },
      // Cronometro/reportes deben reflejar siempre el estado mas reciente
      // del servidor; se dejan fuera de cache (la resiliencia offline del
      // cronometro ya la maneja la cola de IndexedDB propia, no el SW).
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && /^\/api\/(cronometro|reportes)\//.test(url.pathname),
        handler: "NetworkOnly",
        method: "GET",
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite levantar un build de prueba aislado (ej. para probar push
  // notifications) sin pisar el .next que usa `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default withPWA(nextConfig);
