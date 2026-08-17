"use client";

// Almacenamiento local (IndexedDB) del cronometro activo, para que el
// tiempo trabajado nunca se pierda si el navegador se cierra estando
// offline. Solo guarda UN registro fijo ("activo"), ya que la regla de
// negocio ya impone un solo cronometro en curso por usuario.

const DB_NAME = "chronos-offline";
const DB_VERSION = 1;
const STORE = "cronometro";
const CLAVE_ACTIVA = "activo";

export type ResolverTareaLocal =
  | { idTarea: number; idProyecto?: undefined; nombreTarea?: undefined }
  | { idTarea?: undefined; idProyecto: number; nombreTarea: string };

export type EstadoSync = "pendiente_iniciar" | "sincronizado" | "pendiente_detener";

export interface CronometroLocal {
  clave: typeof CLAVE_ACTIVA;
  resolverTarea: ResolverTareaLocal;
  tareaLabel: string;
  proyectoLabel: string;
  descripcion: string | null;
  fechaInicioLocal: string;
  fechaFinLocal: string | null;
  idRegistroServidor: number | null;
  estadoSync: EstadoSync;
}

function abrirDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clave" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function leerEstadoLocal(): Promise<CronometroLocal | null> {
  const db = await abrirDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(CLAVE_ACTIVA);
    req.onsuccess = () => resolve((req.result as CronometroLocal) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function guardarEstadoLocal(
  estado: Omit<CronometroLocal, "clave">
): Promise<void> {
  const db = await abrirDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...estado, clave: CLAVE_ACTIVA });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function borrarEstadoLocal(): Promise<void> {
  const db = await abrirDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(CLAVE_ACTIVA);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
