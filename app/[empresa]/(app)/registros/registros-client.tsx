"use client";

import { useMemo, useRef, useState } from "react";
import { ImportarFilaResultado, Proyecto, ReporteDetalleRow, Tarea } from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";

function aInputDatetimeLocal(fechaMySQL: string) {
  return fechaMySQL.replace(" ", "T").slice(0, 16);
}

function aFechaMySQL(valorInput: string) {
  const base = valorInput.replace("T", " ");
  // Con step="1" el datetime-local ya manda los segundos (HH:MM:SS) --
  // agregar ":00" encima de eso deja un formato invalido de 4 partes
  // (HH:MM:SS:00) que MySQL rechaza. Solo se completa con :00 si el
  // valor todavia viene sin segundos (HH:MM).
  return /\d{2}:\d{2}:\d{2}$/.test(base) ? base : `${base}:00`;
}

type ModoTarea = "existente" | "nueva";
type Vista = "lista" | "manual" | "importar";

export default function RegistrosClient({
  idUsuario,
  proyectosIniciales,
  tareasIniciales,
  filasIniciales,
  fechaInicioInicial,
  fechaFinInicial,
}: {
  idUsuario: number;
  proyectosIniciales: Proyecto[];
  tareasIniciales: Tarea[];
  filasIniciales: ReporteDetalleRow[];
  fechaInicioInicial: string;
  fechaFinInicial: string;
}) {
  const [vista, setVista] = useState<Vista>("lista");
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosIniciales.filter((p) => p.activo));
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales.filter((t) => t.activo));
  const [filas, setFilas] = useState<ReporteDetalleRow[]>(filasIniciales);
  const [fechaInicio, setFechaInicio] = useState(fechaInicioInicial);
  const [fechaFin, setFechaFin] = useState(fechaFinInicial);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario de alta manual
  const [modoTarea, setModoTarea] = useState<ModoTarea>("existente");
  const [idProyecto, setIdProyecto] = useState(
    proyectosIniciales.filter((p) => p.activo).length === 1
      ? String(proyectosIniciales.filter((p) => p.activo)[0].id_proyecto)
      : ""
  );
  const [idTarea, setIdTarea] = useState("");
  const [nombreTareaNueva, setNombreTareaNueva] = useState("");
  const [fechaInicioNuevo, setFechaInicioNuevo] = useState("");
  const [fechaFinNuevo, setFechaFinNuevo] = useState("");
  const [descripcionNuevo, setDescripcionNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Edicion inline
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editInicio, setEditInicio] = useState("");
  const [editFin, setEditFin] = useState("");
  const [editInicioOriginal, setEditInicioOriginal] = useState("");
  const [editFinOriginal, setEditFinOriginal] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  // Importar Excel
  const [importando, setImportando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [resultadosImport, setResultadosImport] = useState<ImportarFilaResultado[] | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function cargarListas() {
    try {
      const [proyectosData, tareasData] = await Promise.all([
        fetchJson<Proyecto[]>("/api/proyectos"),
        fetchJson<Tarea[]>("/api/tareas"),
      ]);
      setProyectos(proyectosData.filter((p) => p.activo));
      setTareas(tareasData.filter((t) => t.activo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar proyectos/tareas");
    }
  }

  async function buscar() {
    setCargandoLista(true);
    setError(null);
    try {
      const params = new URLSearchParams({ fechaInicio, fechaFin, idsUsuario: String(idUsuario) });
      setFilas(await fetchJson<ReporteDetalleRow[]>(`/api/reportes/detalle?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar el reporte");
    }
    setCargandoLista(false);
  }

  const tareasDelProyecto = useMemo(
    () => tareas.filter((t) => String(t.id_proyecto) === idProyecto),
    [tareas, idProyecto]
  );

  async function agregarRegistro() {
    setError(null);
    setMensajeExito(null);
    if (!fechaInicioNuevo || !fechaFinNuevo) {
      setError("Indica fecha/hora de inicio y fin");
      return;
    }
    setEnviando(true);

    const body: Record<string, unknown> = {
      fechaInicio: aFechaMySQL(fechaInicioNuevo),
      fechaFin: aFechaMySQL(fechaFinNuevo),
      descripcion: descripcionNuevo || null,
    };
    if (modoTarea === "existente") {
      body.idTarea = Number(idTarea);
    } else {
      body.idProyecto = Number(idProyecto);
      body.nombreTarea = nombreTareaNueva.trim();
    }

    const res = await fetch("/api/registros-tiempo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      setEnviando(false);
      return;
    }

    const resultado = await res.json();
    setMensajeExito(
      resultado.actualizado
        ? "Ya existia un registro con esa fecha/hora de inicio: se actualizo en vez de duplicarse."
        : "Registro agregado."
    );

    await cargarListas();
    await buscar();
    setIdTarea("");
    setNombreTareaNueva("");
    setFechaInicioNuevo("");
    setFechaFinNuevo("");
    setDescripcionNuevo("");
    setEnviando(false);
  }

  function empezarEdicion(fila: ReporteDetalleRow) {
    setEditandoId(fila.id_registro);
    setEditInicio(aInputDatetimeLocal(fila.fecha_inicio));
    setEditFin(aInputDatetimeLocal(fila.fecha_fin));
    setEditInicioOriginal(fila.fecha_inicio);
    setEditFinOriginal(fila.fecha_fin);
    setEditDescripcion(fila.descripcion ?? "");
  }

  async function guardarEdicion(idRegistro: number) {
    setGuardandoEdicion(true);
    setError(null);
    // El input datetime-local trunca los segundos. Si el usuario no toco
    // un campo, se manda el valor original completo (con segundos) en vez
    // de reconstruirlo con ":00" -- si no, un campo sin cambios podia
    // "adelantarse" hasta 59s y chocar con el fin real de un registro
    // anterior, disparando una superposicion falsa.
    const fechaInicioFinal =
      editInicio === aInputDatetimeLocal(editInicioOriginal) ? editInicioOriginal : aFechaMySQL(editInicio);
    const fechaFinFinal = editFin === aInputDatetimeLocal(editFinOriginal) ? editFinOriginal : aFechaMySQL(editFin);
    const res = await fetch(`/api/registros-tiempo/${idRegistro}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaInicio: fechaInicioFinal,
        fechaFin: fechaFinFinal,
        descripcion: editDescripcion || null,
      }),
    });
    setGuardandoEdicion(false);
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setEditandoId(null);
    await buscar();
  }

  async function eliminarRegistro(idRegistro: number) {
    setEliminandoId(idRegistro);
    await fetch(`/api/registros-tiempo/${idRegistro}`, { method: "DELETE" });
    await buscar();
    setEliminandoId(null);
  }

  async function descargarPlantilla() {
    setDescargandoPlantilla(true);
    setError(null);
    const res = await fetch("/api/registros-tiempo/plantilla");
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo descargar la plantilla");
      setDescargandoPlantilla(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_registros_tiempo.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    setDescargandoPlantilla(false);
  }

  async function importarExcel() {
    const archivo = inputArchivoRef.current?.files?.[0];
    if (!archivo) return;

    setImportando(true);
    setResultadosImport(null);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const res = await fetch("/api/registros-tiempo/importar", { method: "POST", body: formData });
    setImportando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo importar el archivo");
      return;
    }
    const resultados: ImportarFilaResultado[] = await res.json();
    setResultadosImport(resultados);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
    await cargarListas();
    await buscar();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Mis Registros</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { id: "lista", label: "Lista" },
            { id: "manual", label: "Ingreso manual" },
            { id: "importar", label: "Carga por Excel" },
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

      {vista === "manual" && (
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <p className="text-sm font-medium">Agregar registro manual</p>
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setModoTarea("existente")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              modoTarea === "existente"
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            Tarea existente
          </button>
          <button
            onClick={() => setModoTarea("nueva")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              modoTarea === "nueva"
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            Tarea nueva
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={idProyecto}
            onChange={(e) => {
              setIdProyecto(e.target.value);
              setIdTarea("");
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Selecciona un proyecto</option>
            {proyectos.map((p) => (
              <option key={p.id_proyecto} value={p.id_proyecto}>
                {p.nombre}
              </option>
            ))}
          </select>

          {modoTarea === "existente" ? (
            <select
              value={idTarea}
              onChange={(e) => setIdTarea(e.target.value)}
              disabled={!idProyecto}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">Selecciona una tarea</option>
              {tareasDelProyecto.map((t) => (
                <option key={t.id_tarea} value={t.id_tarea}>
                  {t.nombre}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={nombreTareaNueva}
              onChange={(e) => setNombreTareaNueva(e.target.value)}
              disabled={!idProyecto}
              placeholder="Nombre de la tarea nueva"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            />
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Inicio</label>
            <input
              type="datetime-local"
              step="1"
              value={fechaInicioNuevo}
              onChange={(e) => setFechaInicioNuevo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Fin</label>
            <input
              type="datetime-local"
              step="1"
              value={fechaFinNuevo}
              onChange={(e) => setFechaFinNuevo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <input
            value={descripcionNuevo}
            onChange={(e) => setDescripcionNuevo(e.target.value)}
            placeholder="Descripcion (opcional)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>

        <button
          onClick={agregarRegistro}
          disabled={
            enviando ||
            !idProyecto ||
            (modoTarea === "existente" ? !idTarea : !nombreTareaNueva.trim()) ||
            !fechaInicioNuevo ||
            !fechaFinNuevo
          }
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {enviando && <Spinner />}
          Agregar registro
        </button>
        {mensajeExito && <p className="text-sm text-green-700">{mensajeExito}</p>}
      </div>
      )}

      {vista === "importar" && (
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium">Importar desde Excel</p>
        <p className="text-xs text-gray-500">
          Descarga la plantilla, llenala con tus registros y volve a subirla. Tambien sirve un
          &quot;Exportar Excel&quot; de Reportes reeditado (columnas Proyecto, Tarea, Inicio, Fin, Descripcion).
        </p>
        <button
          onClick={descargarPlantilla}
          disabled={descargandoPlantilla}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {descargandoPlantilla && <Spinner />}
          Descargar plantilla
        </button>
        <div className="flex items-center gap-2">
          <input ref={inputArchivoRef} type="file" accept=".xlsx" className="text-sm" />
          <button
            onClick={importarExcel}
            disabled={importando}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {importando && <Spinner />}
            Importar
          </button>
        </div>
        {resultadosImport && (
          <div className="overflow-x-auto border border-gray-100 rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Fila</th>
                  <th className="px-3 py-1.5 font-medium">Proyecto</th>
                  <th className="px-3 py-1.5 font-medium">Tarea</th>
                  <th className="px-3 py-1.5 font-medium">Inicio</th>
                  <th className="px-3 py-1.5 font-medium">Fin</th>
                  <th className="px-3 py-1.5 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultadosImport.map((r) => (
                  <tr key={r.fila} className={r.ok ? "" : "bg-red-50"}>
                    <td className="px-3 py-1.5">{r.fila}</td>
                    <td className="px-3 py-1.5">{r.proyecto || "-"}</td>
                    <td className="px-3 py-1.5">{r.tarea || "-"}</td>
                    <td className="px-3 py-1.5">{r.fechaInicio ?? "-"}</td>
                    <td className="px-3 py-1.5">{r.fechaFin ?? "-"}</td>
                    <td className={`px-3 py-1.5 ${r.ok ? "text-green-700" : "text-red-600 font-medium"}`}>
                      {r.mensaje}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resultadosImport && resultadosImport.some((r) => !r.ok) && (
          <p className="text-xs text-gray-500">
            Corrige las filas en rojo en tu archivo y volve a subirlo -- las filas ya importadas no se
            duplican, se actualizan si la fecha/hora de inicio coincide.
          </p>
        )}
      </div>
      )}

      {vista === "lista" && (
      <>
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={buscar}
            disabled={cargandoLista}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {cargandoLista && <Spinner />}
            Buscar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        {cargandoLista ? (
          <CargandoInline texto="Buscando registros..." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="px-4 py-2 font-medium">Tarea</th>
                <th className="px-4 py-2 font-medium">Inicio</th>
                <th className="px-4 py-2 font-medium">Fin</th>
                <th className="px-4 py-2 font-medium text-right">Horas</th>
                <th className="px-4 py-2 font-medium">Descripcion</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((f) =>
                editandoId === f.id_registro ? (
                  <tr key={f.id_registro} className="bg-gray-50">
                    <td className="px-4 py-2">{f.proyecto}</td>
                    <td className="px-4 py-2">{f.tarea}</td>
                    <td className="px-4 py-2">
                      <input
                        type="datetime-local"
                        step="1"
                        value={editInicio}
                        onChange={(e) => setEditInicio(e.target.value)}
                        className="rounded-md border border-[var(--color-primario)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="datetime-local"
                        step="1"
                        value={editFin}
                        onChange={(e) => setEditFin(e.target.value)}
                        className="rounded-md border border-[var(--color-primario)] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">-</td>
                    <td className="px-4 py-2">
                      <input
                        value={editDescripcion}
                        onChange={(e) => setEditDescripcion(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => guardarEdicion(f.id_registro)}
                        disabled={guardandoEdicion}
                        className="inline-flex items-center gap-1 text-[var(--color-primario)] underline mr-2 disabled:opacity-50"
                      >
                        {guardandoEdicion && <Spinner className="h-3 w-3" />}
                        Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-gray-500 underline">
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id_registro}>
                    <td className="px-4 py-2 text-gray-500">{f.proyecto}</td>
                    <td className="px-4 py-2">{f.tarea}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono tabular-nums text-xs">{f.fecha_inicio}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono tabular-nums text-xs">{f.fecha_fin}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{f.horas}</td>
                    <td className="px-4 py-2 text-gray-500">{f.descripcion ?? "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => empezarEdicion(f)}
                        className="text-gray-500 hover:text-gray-900 underline mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarRegistro(f.id_registro)}
                        disabled={eliminandoId === f.id_registro}
                        className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 underline disabled:opacity-50"
                      >
                        {eliminandoId === f.id_registro && <Spinner className="h-3 w-3" />}
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              )}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Sin registros para el rango seleccionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}
    </div>
  );
}
