"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertaActividadTalento } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";

// Banner llamativo (no un toast que se pueda ignorar/perder) para que un
// talento con actividades por vencer o vencidas lo vea apenas entra a
// cualquier pantalla de la app, no solo en Actividades. Se recalcula en
// vivo en cada carga -- no depende del job de push, es el complemento
// visible dentro de la app.
export default function AlertaActividadesBanner({ empresaSlug }: { empresaSlug: string }) {
  const [alertas, setAlertas] = useState<AlertaActividadTalento[]>([]);

  useEffect(() => {
    fetchJson<AlertaActividadTalento[]>("/api/actividades/mis-alertas")
      .then(setAlertas)
      .catch(() => setAlertas([]));
  }, []);

  if (alertas.length === 0) return null;

  const vencidaHoyOAntes = alertas.some((a) => a.dias_restantes <= 0);
  const masUrgente = alertas.reduce((min, a) => (a.dias_restantes < min.dias_restantes ? a : min), alertas[0]);
  const faltan = 5 - masUrgente.actividades_cargadas;

  const mensaje =
    masUrgente.dias_restantes < 0
      ? `Venciste el reporte de "${masUrgente.nombre_iniciativa ?? masUrgente.proyecto}" y te faltan ${faltan} actividad${faltan === 1 ? "" : "es"}. Complétalas ahora.`
      : masUrgente.dias_restantes === 0
        ? `HOY vence "${masUrgente.nombre_iniciativa ?? masUrgente.proyecto}" y te faltan ${faltan} actividad${faltan === 1 ? "" : "es"}.`
        : `Te faltan ${faltan} actividad${faltan === 1 ? "" : "es"} de "${masUrgente.nombre_iniciativa ?? masUrgente.proyecto}" -- vence en ${masUrgente.dias_restantes} dia${masUrgente.dias_restantes === 1 ? "" : "s"} (${masUrgente.periodo_hasta}).`;

  return (
    <Link
      href={`/${empresaSlug}/actividades`}
      className={`block px-4 py-2.5 text-sm font-medium text-white text-center animate-pulse hover:animate-none ${
        vencidaHoyOAntes ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
      }`}
    >
      {vencidaHoyOAntes ? "🚨 " : "⚠️ "}
      {mensaje}
      {alertas.length > 1 && ` (+${alertas.length - 1} mas)`}
      {" -- Completar ahora →"}
    </Link>
  );
}
