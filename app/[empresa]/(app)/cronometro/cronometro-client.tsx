"use client";

import { useEffect, useMemo, useState } from "react";
import { Feriado, Proyecto, RegistroActivo, Tarea, UltimaTarea } from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import AdSlot from "@/components/AdSlot";
import { CronometroLocal, guardarEstadoLocal } from "@/lib/offline/db";
import { iniciarLocal, obtenerEstadoLocalActivo, pausarLocal, useSyncStatus } from "@/lib/offline/sync";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatearFecha(fechaISO: string) {
  const [y, m, d] = fechaISO.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

function etiquetaDias(dias: number) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "en 1 dia";
  return `en ${dias} dias`;
}

function formatearDuracion(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

type ModoTarea = "existente" | "nueva";

export default function CronometroClient({
  proyectosIniciales,
  tareasIniciales,
  activoServidorInicial,
  ultimaTareaInicial,
  idProyectoInicial,
  feriadoProximoInicial,
  publicidadActiva,
}: {
  proyectosIniciales: Proyecto[];
  tareasIniciales: Tarea[];
  activoServidorInicial: RegistroActivo | null;
  ultimaTareaInicial: UltimaTarea | null;
  idProyectoInicial: string;
  feriadoProximoInicial: Feriado | null;
  publicidadActiva: boolean;
}) {
  const [proyectos] = useState<Proyecto[]>(proyectosIniciales);
  const [tareas] = useState<Tarea[]>(tareasIniciales);
  const [ultimaTarea] = useState<UltimaTarea | null>(ultimaTareaInicial);
  const [feriadoProximo] = useState<Feriado | null>(feriadoProximoInicial);
  const [activoLocal, setActivoLocal] = useState<CronometroLocal | null>(null);
  const [segundos, setSegundos] = useState(0);
  // Solo cubre el chequeo local (IndexedDB), no la carga de datos del
  // servidor -- esos ya llegan resueltos desde el server component.
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modoTarea, setModoTarea] = useState<ModoTarea>("existente");
  const [idProyecto, setIdProyecto] = useState(idProyectoInicial);
  const [idTarea, setIdTarea] = useState("");
  const [nombreTareaNueva, setNombreTareaNueva] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const sincronizacion = useSyncStatus();

  async function refrescarDesdeLocal() {
    setActivoLocal(await obtenerEstadoLocalActivo());
  }

  useEffect(() => {
    async function cargarInicioLocal() {
      const local = await obtenerEstadoLocalActivo();
      if (local) {
        // Ya hay un cronometro en curso local (offline-first): confiamos en el.
        setActivoLocal(local);
      } else if (activoServidorInicial) {
        // No hay nada local pero el servidor si tiene uno activo (otro dispositivo, u
        // otra sesion): lo adoptamos localmente para poder pausarlo desde aca tambien.
        const tarea = tareasIniciales.find((t) => t.id_tarea === activoServidorInicial.id_tarea);
        const adoptado: Omit<CronometroLocal, "clave"> = {
          resolverTarea: { idTarea: activoServidorInicial.id_tarea },
          tareaLabel: activoServidorInicial.tarea,
          proyectoLabel: tarea?.proyecto ?? "",
          descripcion: activoServidorInicial.descripcion,
          fechaInicioLocal: activoServidorInicial.fecha_inicio,
          fechaFinLocal: null,
          idRegistroServidor: activoServidorInicial.id_registro,
          estadoSync: "sincronizado",
        };
        await guardarEstadoLocal(adoptado);
        setActivoLocal({ ...adoptado, clave: "activo" });
      }
    }
    cargarInicioLocal().finally(() => setCargandoInicial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el motor de sincronizacion termina de subir una pausa pendiente (o el
  // inicio original), refrescamos el estado local mostrado en pantalla.
  useEffect(() => {
    if (sincronizacion === "sincronizado" || sincronizacion === "inactivo") {
      refrescarDesdeLocal();
    }
  }, [sincronizacion]);

  useEffect(() => {
    if (!activoLocal || activoLocal.estadoSync === "pendiente_detener") {
      setSegundos(0);
      return;
    }
    const inicio = new Date(activoLocal.fechaInicioLocal.replace(" ", "T")).getTime();
    const tick = () => setSegundos(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activoLocal]);

  const tareasDelProyecto = useMemo(
    () => tareas.filter((t) => String(t.id_proyecto) === idProyecto && t.codigo_estado !== "FINALIZADA"),
    [tareas, idProyecto]
  );

  async function iniciar(
    resolverTarea: CronometroLocal["resolverTarea"],
    tareaLabel: string,
    proyectoLabel: string
  ) {
    setError(null);
    setCargando(true);
    await iniciarLocal({
      resolverTarea,
      tareaLabel,
      proyectoLabel,
      descripcion: descripcion || null,
    });
    await refrescarDesdeLocal();
    setIdTarea("");
    setNombreTareaNueva("");
    setDescripcion("");
    setCargando(false);
  }

  function iniciarDesdeForm() {
    if (modoTarea === "existente") {
      if (!idTarea) return;
      const tarea = tareas.find((t) => t.id_tarea === Number(idTarea));
      iniciar({ idTarea: Number(idTarea) }, tarea?.nombre ?? "", tarea?.proyecto ?? "");
    } else {
      if (!idProyecto || !nombreTareaNueva.trim()) return;
      const proyecto = proyectos.find((p) => p.id_proyecto === Number(idProyecto));
      iniciar(
        { idProyecto: Number(idProyecto), nombreTarea: nombreTareaNueva.trim() },
        nombreTareaNueva.trim(),
        proyecto?.nombre ?? ""
      );
    }
  }

  function reanudarUltima() {
    if (!ultimaTarea) return;
    iniciar({ idTarea: ultimaTarea.id_tarea }, ultimaTarea.tarea, ultimaTarea.proyecto);
  }

  async function pausar() {
    setError(null);
    setCargando(true);
    await pausarLocal();
    await refrescarDesdeLocal();
    setCargando(false);
  }

  if (cargandoInicial) {
    return (
      <div className="max-w-xl">
        <h1 className="text-lg font-semibold mb-6">Cronometro</h1>
        <div className="rounded-lg border border-gray-200 bg-white">
          <CargandoInline />
        </div>
      </div>
    );
  }

  const corriendo = activoLocal && activoLocal.estadoSync !== "pendiente_detener";

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Cronometro</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {feriadoProximo && feriadoProximo.dias_faltantes !== undefined && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          🎉 Proximo feriado: <strong>{feriadoProximo.nombre}</strong> el {formatearFecha(feriadoProximo.fecha)} (
          {etiquetaDias(feriadoProximo.dias_faltantes)})
        </div>
      )}

      {corriendo ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Tarea en curso</p>
            <p className="font-medium">{activoLocal.tareaLabel}</p>
            <p className="text-sm text-gray-500">{activoLocal.proyectoLabel}</p>
            {activoLocal.descripcion && <p className="text-sm text-gray-500">{activoLocal.descripcion}</p>}
          </div>
          <p className="text-4xl font-mono tabular-nums">{formatearDuracion(segundos)}</p>
          <button
            onClick={pausar}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {cargando && <Spinner />}
            Pausar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ultimaTarea && (
            <button
              onClick={reanudarUltima}
              disabled={cargando}
              className="w-full flex items-center justify-between rounded-lg border border-gray-900 bg-gray-900 text-white px-5 py-4 disabled:opacity-50"
            >
              <span className="text-left">
                <span className="block text-xs uppercase tracking-wide text-gray-300">
                  Reanudar ultima tarea
                </span>
                <span className="font-medium">{ultimaTarea.tarea}</span>
                <span className="text-gray-300"> · {ultimaTarea.proyecto}</span>
                {Number(ultimaTarea.total_segundos) > 0 && (
                  <span className="block text-xs text-gray-400 font-mono tabular-nums">
                    Tiempo acumulado: {formatearDuracion(Number(ultimaTarea.total_segundos))}
                  </span>
                )}
              </span>
              {cargando ? <Spinner /> : <span className="text-sm">Reanudar</span>}
            </button>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex gap-1 border-b border-gray-200 -mt-2 mb-2">
              <button
                onClick={() => setModoTarea("existente")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                  modoTarea === "existente" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"
                }`}
              >
                Tarea existente
              </button>
              <button
                onClick={() => setModoTarea("nueva")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                  modoTarea === "nueva" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"
                }`}
              >
                Tarea nueva
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Proyecto</label>
              <select
                value={idProyecto}
                onChange={(e) => {
                  setIdProyecto(e.target.value);
                  setIdTarea("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona un proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id_proyecto} value={p.id_proyecto}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {proyectos.length === 0 && (
                <p className="text-xs text-gray-400">
                  No tienes proyectos asignados todavia. Pidele al admin que te asigne uno.
                </p>
              )}
            </div>

            {modoTarea === "existente" ? (
              <div className="space-y-1">
                <label className="text-sm font-medium">Tarea</label>
                <select
                  value={idTarea}
                  onChange={(e) => setIdTarea(e.target.value)}
                  disabled={!idProyecto}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">Selecciona una tarea</option>
                  {tareasDelProyecto.map((t) => (
                    <option key={t.id_tarea} value={t.id_tarea}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre de la tarea nueva</label>
                <input
                  value={nombreTareaNueva}
                  onChange={(e) => setNombreTareaNueva(e.target.value)}
                  disabled={!idProyecto}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                  placeholder="Ej. Maquetar landing"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Descripcion (opcional)</label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="En que estas trabajando"
              />
            </div>

            <button
              onClick={iniciarDesdeForm}
              disabled={
                cargando ||
                !idProyecto ||
                (modoTarea === "existente" ? !idTarea : !nombreTareaNueva.trim())
              }
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {cargando && <Spinner />}
              Iniciar
            </button>
          </div>
        </div>
      )}

      {publicidadActiva && <AdSlot />}
    </div>
  );
}
