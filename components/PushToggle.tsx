"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

function IconoCampana({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Estado = "no-soportado" | "inactivo" | "activo" | "procesando";

export default function PushToggle() {
  const [estado, setEstado] = useState<Estado>("inactivo");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado("no-soportado");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEstado(sub ? "activo" : "inactivo"))
      .catch(() => setEstado("inactivo"));
  }, []);

  async function activar() {
    setEstado("procesando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado("inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setEstado("inactivo");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setEstado("activo");
    } catch {
      setEstado("inactivo");
    }
  }

  async function desactivar() {
    setEstado("procesando");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/desuscribir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } catch {
      setEstado("activo");
    }
  }

  if (estado === "no-soportado") return null;

  return (
    <button
      onClick={estado === "activo" ? desactivar : activar}
      disabled={estado === "procesando"}
      title={
        estado === "activo"
          ? "Notificaciones activadas -- click para desactivar"
          : "Activar notificaciones para recibir recordatorios"
      }
      className={`inline-flex items-center gap-1 rounded-full p-1.5 disabled:opacity-50 ${
        estado === "activo" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <IconoCampana className="h-4 w-4" />
    </button>
  );
}
