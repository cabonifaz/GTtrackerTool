"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { ActividadProyecto, ImportarAsignacionResultado, Proyecto, ProyectoAsignacion } from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import Badge from "@/components/Badge";
import { fetchJson } from "@/lib/fetchJson";

function badgeEstado(a: ProyectoAsignacion) {
  if (a.activo === 0) return { tono: "danger" as const, label: "Acceso revocado" };
  if (a.codigo_estado === "ENVIADO") return { tono: "success" as const, label: "Enviado" };
  if (a.codigo_estado === "CERRADO") return { tono: "neutral" as const, label: "Cerrado" };
  return { tono: "warning" as const, label: "Pendiente" };
}

export default function ActividadesClient({
  esAdmin,
  idUsuario,
  proyectosActividadesIniciales,
  asignacionesIniciales,
}: {
  esAdmin: boolean;
  idUsuario: number;
  proyectosActividadesIniciales: Proyecto[];
  asignacionesIniciales: ProyectoAsignacion[];
}) {
  const [asignaciones, setAsignaciones] = useState(asignacionesIniciales);
  const [error, setError] = useState<string | null>(null);
  const [expandidaId, setExpandidaId] = useState<number | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [procesandoPeriodo, setProcesandoPeriodo] = useState<string | null>(null);

  async function recargarAsignaciones() {
    setAsignaciones(await fetchJson<ProyectoAsignacion[]>("/api/actividades/asignaciones"));
  }

  async function quitarAcceso(idAsignacion: number) {
    setError(null);
    try {
      await fetch(`/api/actividades/asignaciones/${idAsignacion}`, { method: "DELETE" });
      await recargarAsignaciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el acceso");
    }
  }

  async function darAcceso(idAsignacion: number) {
    setProcesandoId(idAsignacion);
    setError(null);
    try {
      await fetchJson(`/api/actividades/asignaciones/${idAsignacion}/activar`, { method: "POST" });
      await recargarAsignaciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dar acceso");
    }
    setProcesandoId(null);
  }

  async function cerrarUna(idAsignacion: number) {
    setProcesandoId(idAsignacion);
    setError(null);
    try {
      await fetchJson(`/api/actividades/asignaciones/${idAsignacion}/cerrar`, { method: "POST" });
      await recargarAsignaciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar");
    }
    setProcesandoId(null);
  }

  async function reabrirUna(idAsignacion: number) {
    setProcesandoId(idAsignacion);
    setError(null);
    try {
      await fetchJson(`/api/actividades/asignaciones/${idAsignacion}/reabrir`, { method: "POST" });
      await recargarAsignaciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reabrir");
    }
    setProcesandoId(null);
  }

  async function cerrarPeriodoCompleto(idProyecto: number, periodoDesde: string, periodoHasta: string, clave: string) {
    setProcesandoPeriodo(clave);
    setError(null);
    try {
      await fetchJson("/api/actividades/periodos/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idProyecto, periodoDesde, periodoHasta }),
      });
      await recargarAsignaciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar el periodo");
    }
    setProcesandoPeriodo(null);
  }

  async function reabrirPeriodoCompleto(idProyecto: number, periodoDesde: string, periodoHasta: string, clave: string) {
    setProcesandoPeriodo(clave);
    setError(null);
    try {
      await fetchJson("/api/actividades/periodos/reabrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idProyecto, periodoDesde, periodoHasta }),
      });
      await recargarAsignaciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reabrir el periodo");
    }
    setProcesandoPeriodo(null);
  }

  const pendientes = useMemo(
    () => asignaciones.filter((a) => a.activo === 1 && a.codigo_estado === "PENDIENTE"),
    [asignaciones]
  );

  const gruposPeriodo = useMemo(() => {
    const mapa = new Map<
      string,
      { idProyecto: number; proyecto: string; periodoDesde: string; periodoHasta: string; items: ProyectoAsignacion[] }
    >();
    for (const a of asignaciones) {
      const clave = `${a.id_proyecto}|${a.periodo_desde}|${a.periodo_hasta}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          idProyecto: a.id_proyecto,
          proyecto: a.proyecto,
          periodoDesde: a.periodo_desde,
          periodoHasta: a.periodo_hasta,
          items: [],
        });
      }
      mapa.get(clave)!.items.push(a);
    }
    return Array.from(mapa.entries()).map(([clave, grupo]) => ({ clave, ...grupo }));
  }, [asignaciones]);

  function renderFila(a: ProyectoAsignacion) {
    const badge = badgeEstado(a);
    return (
      <li key={a.id_asignacion} className="text-sm">
        <div className="px-4 py-3 flex flex-wrap justify-between items-center gap-2">
          <span>
            {esAdmin && <span className="font-medium">{a.recurso}</span>}
            {esAdmin && <span className="text-gray-400"> · </span>}
            <span>{a.proveedor ?? "-"}</span>
            {a.oc_os && <span className="text-gray-400"> · {a.oc_os}</span>}
            {a.nombre_iniciativa && <span className="text-gray-500"> · {a.nombre_iniciativa}</span>}
            <span className="ml-2">
              <Badge tono={badge.tono}>{badge.label}</Badge>
            </span>
            <span className="ml-1 text-xs text-gray-400 font-mono tabular-nums">{a.actividades_cargadas}/5</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              {a.periodo_desde.slice(0, 10)} → {a.periodo_hasta.slice(0, 10)}
            </span>
            {(esAdmin || a.id_usuario === idUsuario) && (
              <button
                onClick={() => setExpandidaId(expandidaId === a.id_asignacion ? null : a.id_asignacion)}
                className="text-[var(--color-primario)] underline"
              >
                {expandidaId === a.id_asignacion ? "Ocultar" : "Ver actividades"}
              </button>
            )}
            {esAdmin && a.activo === 1 && a.codigo_estado !== "CERRADO" && (
              <button
                onClick={() => cerrarUna(a.id_asignacion)}
                disabled={procesandoId === a.id_asignacion}
                className="text-gray-500 hover:text-[var(--color-primario)] underline disabled:opacity-50"
              >
                Cerrar
              </button>
            )}
            {esAdmin && a.activo === 1 && a.codigo_estado === "CERRADO" && (
              <button
                onClick={() => reabrirUna(a.id_asignacion)}
                disabled={procesandoId === a.id_asignacion}
                className="text-gray-500 hover:text-[var(--color-primario)] underline disabled:opacity-50"
              >
                Reabrir
              </button>
            )}
            {esAdmin && a.activo === 1 && (
              <button onClick={() => quitarAcceso(a.id_asignacion)} className="text-gray-500 hover:text-red-600 underline">
                Quitar acceso
              </button>
            )}
            {esAdmin && a.activo === 0 && (
              <button
                onClick={() => darAcceso(a.id_asignacion)}
                disabled={procesandoId === a.id_asignacion}
                className="text-[var(--color-primario)] underline disabled:opacity-50"
              >
                {procesandoId === a.id_asignacion && <Spinner className="h-3 w-3 inline mr-1" />}
                Dar acceso
              </button>
            )}
          </span>
        </div>
        {a.lider_tecnico_asociado && (
          <p className="px-4 pb-2 text-xs text-gray-400">Lider tecnico: {a.lider_tecnico_asociado}</p>
        )}
        {expandidaId === a.id_asignacion && (
          <ActividadesDeAsignacion
            asignacion={a}
            esAdmin={esAdmin}
            idUsuario={idUsuario}
            setError={setError}
            onCambio={recargarAsignaciones}
          />
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Actividades</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      {esAdmin && (
        <CargaMasiva proyectos={proyectosActividadesIniciales} onCargaCompleta={recargarAsignaciones} setError={setError} />
      )}

      {esAdmin && pendientes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
          <p className="text-sm font-medium text-amber-800">
            {pendientes.length} {pendientes.length === 1 ? "talento tiene" : "talentos tienen"} su reporte pendiente
            de enviar
          </p>
          <ul className="text-sm text-amber-700 space-y-0.5">
            {pendientes.map((p) => (
              <li key={p.id_asignacion}>
                {p.recurso} — {p.proyecto} ({p.periodo_desde.slice(0, 10)} → {p.periodo_hasta.slice(0, 10)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {esAdmin ? (
        <div className="space-y-4">
          {gruposPeriodo.map((g) => {
            const todosCerrados = g.items.every((a) => a.codigo_estado === "CERRADO" || a.activo === 0);
            const hayCerrables = g.items.some((a) => a.activo === 1 && a.codigo_estado !== "CERRADO");
            return (
              <div key={g.clave} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">
                    {g.proyecto} · {g.periodoDesde.slice(0, 10)} → {g.periodoHasta.slice(0, 10)}
                    <span className="text-gray-400 font-normal"> ({g.items.length} talento{g.items.length === 1 ? "" : "s"})</span>
                  </p>
                  {hayCerrables ? (
                    <button
                      onClick={() => cerrarPeriodoCompleto(g.idProyecto, g.periodoDesde, g.periodoHasta, g.clave)}
                      disabled={procesandoPeriodo === g.clave}
                      className="text-xs text-[var(--color-primario)] underline disabled:opacity-50"
                    >
                      {procesandoPeriodo === g.clave && <Spinner className="h-3 w-3 inline mr-1" />}
                      Cerrar periodo completo
                    </button>
                  ) : (
                    todosCerrados && (
                      <button
                        onClick={() => reabrirPeriodoCompleto(g.idProyecto, g.periodoDesde, g.periodoHasta, g.clave)}
                        disabled={procesandoPeriodo === g.clave}
                        className="text-xs text-gray-500 hover:text-[var(--color-primario)] underline disabled:opacity-50"
                      >
                        Reabrir periodo completo
                      </button>
                    )
                  )}
                </div>
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                  {g.items.map(renderFila)}
                </ul>
              </div>
            );
          })}
          {gruposPeriodo.length === 0 && (
            <p className="px-4 py-6 text-sm text-center text-gray-400 rounded-lg border border-gray-200 bg-white">
              Todavia no se cargo ninguna asignacion
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Mis asignaciones</p>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {asignaciones.map(renderFila)}
            {asignaciones.length === 0 && (
              <li className="px-4 py-6 text-sm text-center text-gray-400">No tienes asignaciones cargadas</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function CargaMasiva({
  proyectos,
  onCargaCompleta,
  setError,
}: {
  proyectos: Proyecto[];
  onCargaCompleta: () => Promise<void>;
  setError: (msg: string | null) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [resultados, setResultados] = useState<ImportarAsignacionResultado[] | null>(null);

  async function subirArchivo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResultados(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setSubiendo(true);
    try {
      const res = await fetch("/api/actividades/importar", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      setResultados(await res.json());
      await onCargaCompleta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el archivo");
    }
    setSubiendo(false);
  }

  if (proyectos.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No hay proyectos de tipo Actividades por Excel todavia. Crea uno en la seccion Tareas &gt; Proyectos.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Carga masiva de asignaciones</p>
        <a href="/api/actividades/plantilla" className="text-xs text-[var(--color-primario)] underline">
          Descargar plantilla
        </a>
      </div>
      <p className="text-xs text-gray-500">
        El periodo de cada fila sale de la columna &quot;Periodo actividades realizadas&quot; del archivo. Si un
        recurso no coincide con ningun usuario ya creado, se crea automaticamente (rol Talento, clave generica).
      </p>
      <form onSubmit={subirArchivo} className="grid gap-2 sm:grid-cols-3 items-end">
        <select name="idProyecto" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id_proyecto} value={p.id_proyecto}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input type="file" name="archivo" required accept=".xlsx" className="text-sm" />
        <button
          disabled={subiendo}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {subiendo && <Spinner />}
          Subir archivo
        </button>
      </form>

      {resultados && (
        <div className="rounded-md border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Fila</th>
                <th className="px-3 py-1.5 font-medium">Recurso</th>
                <th className="px-3 py-1.5 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resultados.map((r) => (
                <tr key={r.fila}>
                  <td className="px-3 py-1.5">{r.fila}</td>
                  <td className="px-3 py-1.5">{r.recurso}</td>
                  <td className={`px-3 py-1.5 ${r.ok ? "text-green-700" : "text-red-600"}`}>{r.mensaje}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActividadesDeAsignacion({
  asignacion,
  esAdmin,
  idUsuario,
  setError,
  onCambio,
}: {
  asignacion: ProyectoAsignacion;
  esAdmin: boolean;
  idUsuario: number;
  setError: (msg: string | null) => void;
  onCambio: () => Promise<void>;
}) {
  const [actividades, setActividades] = useState<ActividadProyecto[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");

  const esDueno = esAdmin || asignacion.id_usuario === idUsuario;
  const puedeEditar = asignacion.activo === 1 && (esAdmin || asignacion.codigo_estado === "PENDIENTE") && esDueno;
  const puedeFinalizar = asignacion.activo === 1 && asignacion.codigo_estado === "PENDIENTE" && esDueno;

  async function recargar() {
    setActividades(
      await fetchJson<ActividadProyecto[]>(`/api/actividades/asignaciones/${asignacion.id_asignacion}/actividades`)
    );
  }

  useEffect(() => {
    recargar()
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las actividades"))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nueva.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      await fetchJson(`/api/actividades/asignaciones/${asignacion.id_asignacion}/actividades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: nueva }),
      });
      setNueva("");
      await recargar();
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la actividad");
    }
    setGuardando(false);
  }

  async function guardarEdicion(idActividad: number) {
    setError(null);
    try {
      await fetchJson(`/api/actividades/items/${idActividad}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: textoEdicion }),
      });
      setEditandoId(null);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar la actividad");
    }
  }

  async function eliminar(idActividad: number) {
    setError(null);
    try {
      await fetch(`/api/actividades/items/${idActividad}`, { method: "DELETE" });
      await recargar();
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la actividad");
    }
  }

  async function finalizar() {
    setFinalizando(true);
    setError(null);
    try {
      await fetchJson(`/api/actividades/asignaciones/${asignacion.id_asignacion}/finalizar`, { method: "POST" });
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo finalizar el reporte");
    }
    setFinalizando(false);
  }

  return (
    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200 space-y-2 pt-3">
      {cargando ? (
        <CargandoInline />
      ) : (
        <>
          <ul className="space-y-1">
            {actividades?.map((act) => (
              <li key={act.id_actividad} className="flex items-center gap-2 text-sm">
                {editandoId === act.id_actividad ? (
                  <>
                    <input
                      value={textoEdicion}
                      onChange={(e) => setTextoEdicion(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                    />
                    <button onClick={() => guardarEdicion(act.id_actividad)} className="text-[var(--color-primario)] underline text-xs">
                      Guardar
                    </button>
                    <button onClick={() => setEditandoId(null)} className="text-gray-500 underline text-xs">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">
                      {act.orden}. {act.descripcion}
                    </span>
                    {puedeEditar && (
                      <>
                        <button
                          onClick={() => {
                            setEditandoId(act.id_actividad);
                            setTextoEdicion(act.descripcion);
                          }}
                          className="text-gray-400 hover:text-[var(--color-primario)] underline text-xs"
                        >
                          Editar
                        </button>
                        <button onClick={() => eliminar(act.id_actividad)} className="text-gray-400 hover:text-red-600 underline text-xs">
                          Eliminar
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
            {actividades?.length === 0 && <li className="text-sm text-gray-400">Sin actividades cargadas todavia</li>}
          </ul>

          {puedeEditar && (actividades?.length ?? 0) < 5 && (
            <form onSubmit={agregar} className="flex items-end gap-2">
              <input
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                placeholder="Nueva actividad"
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                disabled={guardando}
                className="inline-flex items-center gap-1 text-[var(--color-primario)] underline text-sm disabled:opacity-50"
              >
                {guardando && <Spinner className="h-3 w-3" />}
                Agregar
              </button>
            </form>
          )}

          {puedeFinalizar && (
            <button
              onClick={finalizar}
              disabled={finalizando}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              {finalizando && <Spinner className="h-3 w-3" />}
              Finalizar reporte
            </button>
          )}
          {asignacion.codigo_estado === "ENVIADO" && (
            <p className="text-xs text-gray-400">Reporte enviado -- ya no se puede editar.</p>
          )}
          {asignacion.codigo_estado === "CERRADO" && (
            <p className="text-xs text-gray-400">El Admin cerro este periodo -- ya no se puede editar.</p>
          )}
        </>
      )}
    </div>
  );
}
