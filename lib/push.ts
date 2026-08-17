import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:soporte@clonclokify.local",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

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

export async function enviarNotificacion(subscripcion: PushSubscriptionKeys, payload: PushPayload) {
  return webpush.sendNotification(
    { endpoint: subscripcion.endpoint, keys: { p256dh: subscripcion.p256dh, auth: subscripcion.auth } },
    JSON.stringify(payload)
  );
}
