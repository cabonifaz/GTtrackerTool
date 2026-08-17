import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigurado = false;

// Configura las claves VAPID recien cuando se va a enviar una notificacion
// (no al importar el modulo): Next.js importa todas las rutas durante el
// build para "Collecting page data", y setVapidDetails() valida el formato
// de la clave de inmediato -- si se llamara a nivel de modulo, un build sin
// las variables de entorno todavia configuradas (ej. Railway en el primer
// deploy) tumbaria el build entero por una funcionalidad opcional.
function asegurarVapidConfigurado() {
  if (vapidConfigurado) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      "Push notifications no configuradas: faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY"
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:soporte@clonclokify.local",
    publicKey,
    privateKey
  );
  vapidConfigurado = true;
}

export async function enviarNotificacion(subscripcion: PushSubscriptionKeys, payload: PushPayload) {
  asegurarVapidConfigurado();
  return webpush.sendNotification(
    { endpoint: subscripcion.endpoint, keys: { p256dh: subscripcion.p256dh, auth: subscripcion.auth } },
    JSON.stringify(payload)
  );
}
