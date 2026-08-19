"use client";

import { useEffect, useState, FormEvent } from "react";
import { GrupoClase, HorarioGrupo, Proyecto, RegistroClaseActivo, SesionClase, Usuario } from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import Badge from "@/components/Badge";
import { fetchJson } from "@/lib/fetchJson";

const DIAS = ["", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function badgeTono(codigo: string): "success" | "warning" | "danger" | "neutral" {
  if (codigo === "DICTADA") return "success";
  if (codigo === "REPROGRAMADA") return "warning";
  if (codigo === "CANCELADA") return "danger";
  return "neutral";
}

type Vista = "sesiones" | "grupos";

export default function ClasesClient({
  esAdmin,
  idUsuario,
  proyectosClasesIniciales,
  gruposIniciales,
  talentosIniciales,
  sesionesIniciales,
  sesionActivaInicial,
  fechaDesdeInicial,
  fechaHastaInicial,
}: {
  esAdmin: boolean;
  idUsuario: number;
  proyectosClasesIniciales: Proyecto[];
  gruposIniciales: GrupoClase[];
  talentosIniciales: Usuario[];
  sesionesIniciales: SesionClase[];
  sesionActivaInicial: RegistroClaseActivo | null;
  fechaDesdeInicial: string;
  fechaHastaInicial: string;
}) {
  const [vista, setVista] = useState<Vista>("sesiones");
  const [grupos, setGrupos] = useState(gruposIniciales);
  const [sesiones, setSesiones] = useState(sesionesIniciales);
  const [sesionActiva, setSesionActiva] = useState(sesionActivaInicial);
  const [fechaDesde, setFechaDesde] = useState(fechaDesdeInicial);
  const [fechaHasta, setFechaHasta] = useState(fechaHastaInicial);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);
  const [reprogramandoId, setReprogramandoId] = useState<number | null>(null);

  const profesores = talentosIniciales.filter((u) => u.codigo_rol === "TALENTO" && u.activo);

  async function buscarSesiones() {
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ fechaDesde, fechaHasta });
      setSesiones(await fetchJson<SesionClase[]>(`/api/clases/sesiones?${qs.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar");
    }
    setCargando(false);
  }

  async function recargarGrupos() {
    setGrupos(await fetchJson<GrupoClase[]>("/api/clases/grupos"));
  }

  async function crearGrupo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/clases/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idProyecto: Number(form.get("idProyecto")),
          nombre: form.get("nombre"),
          idProfesor: Number(form.get("idProfesor")),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      e.currentTarget.reset();
      await recargarGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo");
    }
  }

  async function iniciarSesion(idSesion: number) {
    setAccionando(idSesion);
    setError(null);
    try {
      await fetchJson("/api/clases/sesiones/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSesion }),
      });
      const activa = await fetchJson<RegistroClaseActivo | null>("/api/clases/sesiones/activa");
      setSesionActiva(activa);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la sesion");
    }
    setAccionando(null);
  }

  async function detenerSesion() {
    setAccionando(sesionActiva?.id_sesion ?? -1);
    setError(null);
    try {
      await fetchJson("/api/clases/sesiones/detener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setSesionActiva(null);
      await buscarSesiones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo detener la sesion");
    }
    setAccionando(null);
  }

  async function guardarReprogramacion(idSesion: number, form: FormData) {
    setError(null);
    try {
      await fetchJson(`/api/clases/sesiones/${idSesion}/reprogramar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuevaFecha: form.get("nuevaFecha"),
          nuevaHoraInicio: form.get("nuevaHoraInicio"),
          nuevaHoraFin: form.get("nuevaHoraFin"),
          tema: form.get("tema"),
        }),
      });
      setReprogramandoId(null);
      await buscarSesiones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reprogramar");
    }
  }

  async function cancelarSesion(idSesion: number) {
    setAccionando(idSesion);
    setError(null);
    try {
      await fetchJson(`/api/clases/sesiones/${idSesion}/cancelar`, { method: "PUT" });
      await buscarSesiones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    }
    setAccionando(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Clases</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      {sesionActiva && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
          <p className="text-sm text-gray-500">Sesion en curso</p>
          <p className="font-medium">
            {sesionActiva.grupo}
            {sesionActiva.tema && <span className="text-gray-500"> · {sesionActiva.tema}</span>}
          </p>
          <button
            onClick={detenerSesion}
            disabled={accionando === sesionActiva.id_sesion}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--warning-600)] text-white text-sm font-medium px-5 py-3 disabled:opacity-50"
          >
            {accionando === sesionActiva.id_sesion && <Spinner />}
            Detener sesion
          </button>
        </div>
      )}

      {esAdmin && (
        <div className="flex gap-1 border-b border-gray-200">
          {(
            [
              { id: "sesiones", label: "Sesiones" },
              { id: "grupos", label: "Grupos" },
            ] as { id: Vista; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setVista(t.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                vista === t.id
                  ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                  : "border-transparent text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {vista === "sesiones" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={buscarSesiones}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2"
            >
              Buscar
            </button>
          </div>

          {cargando ? (
            <CargandoInline />
          ) : (
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {sesiones.map((s) => (
                <li key={s.id_sesion} className="px-4 py-3 text-sm space-y-2">
                  {reprogramandoId === s.id_sesion ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        guardarReprogramacion(s.id_sesion, new FormData(e.currentTarget));
                      }}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="date" name="nuevaFecha" required defaultValue={s.fecha_final.slice(0, 10)} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
                      <input type="time" name="nuevaHoraInicio" required defaultValue={s.hora_inicio_final} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
                      <input type="time" name="nuevaHoraFin" required defaultValue={s.hora_fin_final} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
                      <input type="text" name="tema" placeholder="Tema (opcional)" defaultValue={s.tema ?? ""} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
                      <button className="text-[var(--color-primario)] underline text-xs">Guardar</button>
                      <button type="button" onClick={() => setReprogramandoId(null)} className="text-gray-500 underline text-xs">
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span>
                        <span className="font-medium">{s.grupo}</span>
                        <span className="text-gray-400"> · {s.proyecto}</span>
                        {esAdmin && <span className="text-gray-400"> · {s.profesor}</span>}
                        {s.tema && <span className="text-gray-500"> · {s.tema}</span>}
                        <span className="ml-2">
                          <Badge tono={badgeTono(s.codigo_estado)}>{s.estado}</Badge>
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-mono tabular-nums">
                          {s.fecha_final.slice(0, 10)} {s.hora_inicio_final}-{s.hora_fin_final}
                        </span>
                        {s.codigo_estado !== "DICTADA" && s.codigo_estado !== "CANCELADA" && !sesionActiva && (esAdmin || s.id_profesor === idUsuario) && (
                          <button
                            onClick={() => iniciarSesion(s.id_sesion)}
                            disabled={accionando === s.id_sesion}
                            className="inline-flex items-center gap-1 text-[var(--color-primario)] underline disabled:opacity-50"
                          >
                            {accionando === s.id_sesion && <Spinner className="h-3 w-3" />}
                            Iniciar
                          </button>
                        )}
                        {esAdmin && s.codigo_estado !== "DICTADA" && s.codigo_estado !== "CANCELADA" && (
                          <>
                            <button onClick={() => setReprogramandoId(s.id_sesion)} className="text-gray-500 hover:text-[var(--color-primario)] underline">
                              Reprogramar
                            </button>
                            <button
                              onClick={() => cancelarSesion(s.id_sesion)}
                              disabled={accionando === s.id_sesion}
                              className="text-gray-500 hover:text-red-600 underline disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </li>
              ))}
              {sesiones.length === 0 && (
                <li className="px-4 py-6 text-sm text-center text-gray-400">Sin sesiones en este rango</li>
              )}
            </ul>
          )}
        </div>
      )}

      {esAdmin && vista === "grupos" && (
        <GruposAdmin
          proyectos={proyectosClasesIniciales}
          profesores={profesores}
          grupos={grupos}
          onCrearGrupo={crearGrupo}
          onRecargarGrupos={recargarGrupos}
          setError={setError}
        />
      )}
    </div>
  );
}

function GruposAdmin({
  proyectos,
  profesores,
  grupos,
  onCrearGrupo,
  onRecargarGrupos,
  setError,
}: {
  proyectos: Proyecto[];
  profesores: Usuario[];
  grupos: GrupoClase[];
  onCrearGrupo: (e: FormEvent<HTMLFormElement>) => void;
  onRecargarGrupos: () => Promise<void>;
  setError: (msg: string | null) => void;
}) {
  const [grupoExpandido, setGrupoExpandido] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {proyectos.length === 0 && (
        <p className="text-sm text-gray-400">
          No hay proyectos de tipo Clases todavia. Crea uno en la seccion Tareas &gt; Proyectos.
        </p>
      )}

      <form onSubmit={onCrearGrupo} className="grid gap-2 sm:grid-cols-4 rounded-lg border border-gray-200 bg-white p-4">
        <select name="idProyecto" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id_proyecto} value={p.id_proyecto}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input name="nombre" required placeholder="Nombre del grupo" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="idProfesor" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Profesor</option>
          {profesores.map((p) => (
            <option key={p.id_usuario} value={p.id_usuario}>
              {p.nombres} {p.apellidos}
            </option>
          ))}
        </select>
        <button className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2">
          Crear grupo
        </button>
      </form>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {grupos.map((g) => (
          <li key={g.id_grupo} className="text-sm">
            <div className="px-4 py-3 flex flex-wrap justify-between items-center gap-2">
              <span>
                <span className="font-medium">{g.nombre}</span>
                <span className="text-gray-400"> · {g.proyecto} · {g.profesor}</span>
              </span>
              <button
                onClick={() => setGrupoExpandido(grupoExpandido === g.id_grupo ? null : g.id_grupo)}
                className="text-[var(--color-primario)] underline"
              >
                {grupoExpandido === g.id_grupo ? "Ocultar" : "Horario y sesiones"}
              </button>
            </div>
            {grupoExpandido === g.id_grupo && (
              <GrupoDetalle idGrupo={g.id_grupo} setError={setError} onCambio={onRecargarGrupos} />
            )}
          </li>
        ))}
        {grupos.length === 0 && <li className="px-4 py-6 text-sm text-center text-gray-400">Sin grupos todavia</li>}
      </ul>
    </div>
  );
}

function GrupoDetalle({
  idGrupo,
  setError,
  onCambio,
}: {
  idGrupo: number;
  setError: (msg: string | null) => void;
  onCambio: () => Promise<void>;
}) {
  const [horarios, setHorarios] = useState<HorarioGrupo[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<HorarioGrupo[]>(`/api/clases/grupos/${idGrupo}/horarios`)
      .then(setHorarios)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el horario"))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function agregarDia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    try {
      await fetchJson(`/api/clases/grupos/${idGrupo}/horarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaSemana: Number(form.get("diaSemana")),
          horaInicio: form.get("horaInicio"),
          horaFin: form.get("horaFin"),
        }),
      });
      setHorarios(await fetchJson<HorarioGrupo[]>(`/api/clases/grupos/${idGrupo}/horarios`));
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el horario");
    }
  }

  async function quitarDia(diaSemana: number) {
    setError(null);
    try {
      await fetch(`/api/clases/grupos/${idGrupo}/horarios/${diaSemana}`, { method: "DELETE" });
      setHorarios(await fetchJson<HorarioGrupo[]>(`/api/clases/grupos/${idGrupo}/horarios`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el dia");
    }
  }

  async function generarSesiones(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerando(true);
    setMensaje(null);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetchJson<{ sesiones_creadas: number }>("/api/clases/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idGrupo,
          fechaDesde: form.get("fechaDesde"),
          fechaHasta: form.get("fechaHasta"),
        }),
      });
      setMensaje(`${res.sesiones_creadas} sesiones nuevas generadas.`);
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar sesiones");
    }
    setGenerando(false);
  }

  return (
    <div className="px-4 pb-4 space-y-4 bg-gray-50 border-t border-gray-200">
      {cargando ? (
        <CargandoInline />
      ) : (
        <div className="pt-4 space-y-2">
          <p className="text-xs font-medium text-gray-500">Horario recurrente</p>
          <ul className="space-y-1">
            {horarios?.map((h) => (
              <li key={h.id_horario} className="flex items-center gap-2 text-sm">
                <span>
                  {DIAS[h.dia_semana]} {h.hora_inicio}-{h.hora_fin}
                </span>
                <button onClick={() => quitarDia(h.dia_semana)} className="text-gray-400 hover:text-red-600 underline text-xs">
                  Quitar
                </button>
              </li>
            ))}
            {horarios?.length === 0 && <li className="text-sm text-gray-400">Sin horario recurrente (clase suelta)</li>}
          </ul>
          <form onSubmit={agregarDia} className="flex flex-wrap items-end gap-2">
            <select name="diaSemana" required className="rounded-md border border-gray-300 px-2 py-1 text-xs">
              {DIAS.slice(1).map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
            <input type="time" name="horaInicio" required className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
            <input type="time" name="horaFin" required className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
            <button className="text-[var(--color-primario)] underline text-xs">Agregar dia</button>
          </form>
        </div>
      )}

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="text-xs font-medium text-gray-500">Generar sesiones a partir del horario</p>
        <form onSubmit={generarSesiones} className="flex flex-wrap items-end gap-2">
          <input type="date" name="fechaDesde" required className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          <input type="date" name="fechaHasta" required className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          <button
            disabled={generando}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primario)] text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {generando && <Spinner className="h-3 w-3" />}
            Generar
          </button>
        </form>
        {mensaje && <p className="text-xs text-gray-500">{mensaje}</p>}
      </div>
    </div>
  );
}
