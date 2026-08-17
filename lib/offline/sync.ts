"use client";

// Motor de sincronizacion offline-first del cronometro: guarda el estado
// localmente de inmediato, intenta subirlo al servidor, y si falla por
// falta de red reintenta solo -- al reconectar, cada ~15s, y ademas manda
// un "checkpoint" cada ~30s mientras el cronometro esta corriendo y
// sincronizado, para que el servidor tenga rastro de vida aunque el
// dispositivo se pierda antes de mandar el detener final.
import { useEffect, useState } from "react";
import {
  CronometroLocal,
  ResolverTareaLocal,
  borrarEstadoLocal,
  guardarEstadoLocal,
  leerEstadoLocal,
} from "./db";
import { aFechaMySQL } from "./fechas";

export type EstadoIndicador = "inactivo" | "sincronizado" | "sin-conexion" | "sincronizando" | "pendiente";

type Escucha = (estado: EstadoIndicador) => void;

let estadoActual: EstadoIndicador = "inactivo";
const escuchas = new Set<Escucha>();

function emitir(nuevo: EstadoIndicador) {
  estadoActual = nuevo;
  escuchas.forEach((fn) => fn(nuevo));
}

function estaOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function suscribirse(fn: Escucha): () => void {
  escuchas.add(fn);
  fn(estadoActual);
  return () => escuchas.delete(fn);
}

export function useSyncStatus(): EstadoIndicador {
  const [estado, setEstado] = useState<EstadoIndicador>(estadoActual);
  useEffect(() => suscribirse(setEstado), []);
  return estado;
}

export async function obtenerEstadoLocalActivo(): Promise<CronometroLocal | null> {
  return leerEstadoLocal();
}

export async function iniciarLocal(params: {
  resolverTarea: ResolverTareaLocal;
  tareaLabel: string;
  proyectoLabel: string;
  descripcion: string | null;
}): Promise<void> {
  await guardarEstadoLocal({
    resolverTarea: params.resolverTarea,
    tareaLabel: params.tareaLabel,
    proyectoLabel: params.proyectoLabel,
    descripcion: params.descripcion,
    fechaInicioLocal: aFechaMySQL(new Date()),
    fechaFinLocal: null,
    idRegistroServidor: null,
    estadoSync: "pendiente_iniciar",
  });
  await intentarFlush();
}

export async function pausarLocal(): Promise<void> {
  const local = await leerEstadoLocal();
  if (!local) return;
  await guardarEstadoLocal({
    ...local,
    fechaFinLocal: aFechaMySQL(new Date()),
    estadoSync: "pendiente_detener",
  });
  await intentarFlush();
}

export async function intentarFlush(): Promise<void> {
  const local = await leerEstadoLocal();
  if (!local) {
    emitir("inactivo");
    return;
  }

  if (!estaOnline()) {
    emitir("sin-conexion");
    return;
  }

  emitir("sincronizando");

  try {
    if (local.estadoSync === "pendiente_iniciar") {
      const res = await fetch("/api/cronometro/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...local.resolverTarea,
          descripcion: local.descripcion,
          fechaInicio: local.fechaInicioLocal,
        }),
      });
      if (!res.ok) throw new Error("No se pudo sincronizar el inicio del cronometro");
      const data = await res.json();

      const actual = await leerEstadoLocal();
      if (!actual) return;
      await guardarEstadoLocal({ ...actual, idRegistroServidor: data.id_registro });

      await intentarFlush(); // por si ya paso a pendiente_detener mientras esta llamada estaba en vuelo
      return;
    }

    if (local.estadoSync === "pendiente_detener") {
      if (local.idRegistroServidor != null) {
        const res = await fetch("/api/cronometro/detener", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaFin: local.fechaFinLocal }),
        });
        if (!res.ok) throw new Error("No se pudo sincronizar la pausa del cronometro");
      } else {
        // el iniciar original nunca llego a confirmarse: un solo alta manual con ambas horas reales
        const res = await fetch("/api/registros-tiempo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...local.resolverTarea,
            descripcion: local.descripcion,
            fechaInicio: local.fechaInicioLocal,
            fechaFin: local.fechaFinLocal,
          }),
        });
        if (!res.ok) throw new Error("No se pudo registrar el tiempo trabajado");
      }
      await borrarEstadoLocal();
      emitir("sincronizado");
      setTimeout(() => {
        if (estadoActual === "sincronizado") emitir("inactivo");
      }, 3000);
      return;
    }

    emitir("sincronizado");
  } catch {
    emitir(estaOnline() ? "pendiente" : "sin-conexion");
  }
}

export function iniciarVigilancia(): () => void {
  if (typeof window === "undefined") return () => {};

  const alReconectar = () => intentarFlush();
  const alDesconectar = () => emitir("sin-conexion");

  window.addEventListener("online", alReconectar);
  window.addEventListener("offline", alDesconectar);

  const intervaloFlush = window.setInterval(() => intentarFlush(), 15000);
  const intervaloCheckpoint = window.setInterval(async () => {
    const local = await leerEstadoLocal();
    if (local?.estadoSync === "sincronizado" && estaOnline()) {
      fetch("/api/cronometro/checkpoint", { method: "POST" }).catch(() => {});
    }
  }, 30000);

  intentarFlush();

  return () => {
    window.removeEventListener("online", alReconectar);
    window.removeEventListener("offline", alDesconectar);
    window.clearInterval(intervaloFlush);
    window.clearInterval(intervaloCheckpoint);
  };
}
