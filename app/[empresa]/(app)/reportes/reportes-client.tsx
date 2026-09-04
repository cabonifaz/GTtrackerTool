"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Proyecto,
  ProyeccionRow,
  ReporteClasesPorGrupo,
  ReporteClasesPorProfesor,
  ReporteCostoRow,
  ReporteDetalleRow,
  ReporteTareaRow,
  ResumenAvanceRow,
  Usuario,
} from "@/lib/types";
import { CargandoInline, Spinner } from "@/components/Spinner";
import SelectorTalentosMultiple from "@/components/SelectorTalentosMultiple";
import { fetchJson } from "@/lib/fetchJson";
import { formatearMoneda } from "@/lib/format";

function formatearHorasMin(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Vista = "detalle" | "por-tarea" | "costos" | "resumen" | "proyeccion" | "clases";

const SEMAFORO: Record<ResumenAvanceRow["semaforo"], { color: string; label: string }> = {
  VERDE: { color: "bg-green-500", label: "Al dia" },
  AMARILLO: { color: "bg-amber-500", label: "Atrasado" },
  ROJO: { color: "bg-red-500", label: "Muy atrasado" },
};

export default function ReportesClient({
  esAdmin,
  usuariosIniciales,
  filasIniciales,
  fechaInicioInicial,
  fechaFinInicial,
  proyectosIniciales,
  tieneClases,
}: {
  esAdmin: boolean;
  usuariosIniciales: Usuario[];
  filasIniciales: ReporteDetalleRow[];
  fechaInicioInicial: string;
  fechaFinInicial: string;
  proyectosIniciales: Proyecto[];
  tieneClases: boolean;
}) {
  const [vista, setVista] = useState<Vista>("detalle");
  const [usuarios] = useState<Usuario[]>(usuariosIniciales);
  const [idsSeleccionados, setIdsSeleccionados] = useState<number[]>([]);
  const [filtroProyectoTalentos, setFiltroProyectoTalentos] = useState("");
  const [idsProyecto, setIdsProyecto] = useState<Set<number> | null>(null);
  const [cargandoIdsProyecto, setCargandoIdsProyecto] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(fechaInicioInicial);
  const [fechaFin, setFechaFin] = useState(fechaFinInicial);
  const [filas, setFilas] = useState<ReporteDetalleRow[]>(filasIniciales);
  const [filasPorTarea, setFilasPorTarea] = useState<ReporteTareaRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reporte de costos (solo Admin)
  const hoy = new Date();
  const [proyectos] = useState<Proyecto[]>(proyectosIniciales);
  const idProyectoUnico = proyectos.length === 1 ? String(proyectos[0].id_proyecto) : "";
  const [costoIdProyecto, setCostoIdProyecto] = useState(idProyectoUnico);
  const [costoAnio, setCostoAnio] = useState(hoy.getFullYear());
  const [costoMes, setCostoMes] = useState(hoy.getMonth() + 1);
  const [filasCostos, setFilasCostos] = useState<ReporteCostoRow[]>([]);
  const [cargandoCostos, setCargandoCostos] = useState(false);
  const [buscoCostos, setBuscoCostos] = useState(false);

  // Resumen de avance + recordatorios (solo Admin)
  const [resumenIdProyecto, setResumenIdProyecto] = useState(idProyectoUnico);
  const [resumenAnio, setResumenAnio] = useState(hoy.getFullYear());
  const [resumenMes, setResumenMes] = useState(hoy.getMonth() + 1);
  const [filasResumen, setFilasResumen] = useState<ResumenAvanceRow[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [buscoResumen, setBuscoResumen] = useState(false);
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState<Set<number>>(new Set());
  const [mensajeRecordatorio, setMensajeRecordatorio] = useState<string | null>(null);

  // Proyeccion por cliente (solo Admin)
  const clientesUnicos = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const p of proyectos) {
      if (p.id_cliente && p.cliente) mapa.set(p.id_cliente, p.cliente);
    }
    return Array.from(mapa, ([id_cliente, cliente]) => ({ id_cliente, cliente }));
  }, [proyectos]);
  const [proyeccionIdCliente, setProyeccionIdCliente] = useState("");
  const [proyeccionMesesAtras, setProyeccionMesesAtras] = useState(3);
  const [proyeccionMesesAdelante, setProyeccionMesesAdelante] = useState(6);
  const [filasProyeccion, setFilasProyeccion] = useState<ProyeccionRow[]>([]);
  const [cargandoProyeccion, setCargandoProyeccion] = useState(false);
  const [buscoProyeccion, setBuscoProyeccion] = useState(false);

  // Clases: por profesor / por grupo (solo Admin, solo si hay proyectos tipo Clases)
  const [clasesFechaInicio, setClasesFechaInicio] = useState(fechaInicioInicial);
  const [clasesFechaFin, setClasesFechaFin] = useState(fechaFinInicial);
  const [filasClasesPorProfesor, setFilasClasesPorProfesor] = useState<ReporteClasesPorProfesor[]>([]);
  const [filasClasesPorGrupo, setFilasClasesPorGrupo] = useState<ReporteClasesPorGrupo[]>([]);
  const [cargandoClases, setCargandoClases] = useState(false);
  const [buscoClases, setBuscoClases] = useState(false);

  async function buscarClases() {
    setCargandoClases(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ fechaInicio: clasesFechaInicio, fechaFin: clasesFechaFin });
      const [porProfesor, porGrupo] = await Promise.all([
        fetchJson<ReporteClasesPorProfesor[]>(`/api/reportes/clases-por-profesor?${qs.toString()}`),
        fetchJson<ReporteClasesPorGrupo[]>(`/api/reportes/clases-por-grupo?${qs.toString()}`),
      ]);
      setFilasClasesPorProfesor(porProfesor);
      setFilasClasesPorGrupo(porGrupo);
      setBuscoClases(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte de clases");
    }
    setCargandoClases(false);
  }

  function queryString() {
    const params = new URLSearchParams({ fechaInicio, fechaFin });
    if (esAdmin && idsSeleccionados.length > 0) {
      params.set("idsUsuario", idsSeleccionados.join(","));
    }
    return params.toString();
  }

  async function buscar(vistaActual: Vista = vista) {
    setCargando(true);
    setError(null);
    const endpoint = vistaActual === "detalle" ? "/api/reportes/detalle" : "/api/reportes/por-tarea";
    const res = await fetch(`${endpoint}?${queryString()}`);
    setCargando(false);
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    const datos = await res.json();
    if (vistaActual === "detalle") {
      setFilas(datos);
    } else {
      setFilasPorTarea(datos);
    }
  }

  function cambiarVista(nueva: Vista) {
    setVista(nueva);
    buscar(nueva);
  }

  // Nombre de archivo consistente para todas las exportaciones de
  // Reportes: Qronos_Report_<Tipo>_DD_MM_YYYY-DD_MM_YYYY.xlsx
  function aDDMMYYYY(fechaISO: string) {
    const [y, m, d] = fechaISO.slice(0, 10).split("-");
    return `${d}_${m}_${y}`;
  }

  function nombreReporte(tipo: string, fechaInicio: string, fechaFin: string) {
    return `Qronos_Report_${tipo}_${aDDMMYYYY(fechaInicio)}-${aDDMMYYYY(fechaFin)}.xlsx`;
  }

  function primerYUltimoDiaMes(anio: number, mes: number) {
    const primero = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const finMes = new Date(anio, mes, 0);
    const ultimo = `${finMes.getFullYear()}-${String(finMes.getMonth() + 1).padStart(2, "0")}-${String(finMes.getDate()).padStart(2, "0")}`;
    return { primero, ultimo };
  }

  // Dispara la descarga de un .xlsx ya generado por el server -- comun a
  // todas las exportaciones de Reportes, cada una solo arma su URL.
  async function descargarExcel(url: string, nombreArchivo: string) {
    setExportando(true);
    setError(null);
    const res = await fetch(url);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo exportar el reporte");
      setExportando(false);
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(objectUrl);
    setExportando(false);
  }

  function exportar() {
    const endpoint = vista === "detalle" ? "/api/reportes/exportar" : "/api/reportes/por-tarea/exportar";
    const tipo = vista === "detalle" ? "Detailed" : "ByTask";
    descargarExcel(`${endpoint}?${queryString()}`, nombreReporte(tipo, fechaInicio, fechaFin));
  }

  function exportarCostos() {
    if (!costoIdProyecto) return;
    const params = new URLSearchParams({ idProyecto: costoIdProyecto, anio: String(costoAnio), mes: String(costoMes) });
    const { primero, ultimo } = primerYUltimoDiaMes(costoAnio, costoMes);
    descargarExcel(`/api/reportes/costos/exportar?${params.toString()}`, nombreReporte("Costs", primero, ultimo));
  }

  function exportarResumen() {
    if (!resumenIdProyecto) return;
    const params = new URLSearchParams({
      idProyecto: resumenIdProyecto,
      anio: String(resumenAnio),
      mes: String(resumenMes),
    });
    const { primero, ultimo } = primerYUltimoDiaMes(resumenAnio, resumenMes);
    descargarExcel(`/api/reportes/resumen/exportar?${params.toString()}`, nombreReporte("Billing", primero, ultimo));
  }

  function exportarProyeccion() {
    if (!proyeccionIdCliente) return;
    const params = new URLSearchParams({
      idCliente: proyeccionIdCliente,
      mesesAtras: String(proyeccionMesesAtras),
      mesesAdelante: String(proyeccionMesesAdelante),
    });
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - proyeccionMesesAtras, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + proyeccionMesesAdelante + 1, 0);
    const aISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    descargarExcel(
      `/api/reportes/proyeccion/exportar?${params.toString()}`,
      nombreReporte("Projection", aISO(inicio), aISO(fin))
    );
  }

  function exportarClases() {
    const params = new URLSearchParams({ fechaInicio: clasesFechaInicio, fechaFin: clasesFechaFin });
    descargarExcel(
      `/api/reportes/clases/exportar?${params.toString()}`,
      nombreReporte("Classes", clasesFechaInicio, clasesFechaFin)
    );
  }

  async function buscarCostos() {
    if (!costoIdProyecto) return;
    setCargandoCostos(true);
    setBuscoCostos(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        idProyecto: costoIdProyecto,
        anio: String(costoAnio),
        mes: String(costoMes),
      });
      setFilasCostos(await fetchJson<ReporteCostoRow[]>(`/api/reportes/costos?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte de costos");
    }
    setCargandoCostos(false);
  }

  async function buscarResumen() {
    if (!resumenIdProyecto) return;
    setCargandoResumen(true);
    setBuscoResumen(true);
    setError(null);
    setMensajeRecordatorio(null);
    try {
      const params = new URLSearchParams({
        idProyecto: resumenIdProyecto,
        anio: String(resumenAnio),
        mes: String(resumenMes),
      });
      setFilasResumen(await fetchJson<ResumenAvanceRow[]>(`/api/reportes/resumen?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el resumen de avance");
    }
    setCargandoResumen(false);
  }

  async function enviarRecordatorio(idUsuario: number) {
    setEnviandoRecordatorio((prev) => new Set(prev).add(idUsuario));
    setMensajeRecordatorio(null);
    setError(null);
    const res = await fetch("/api/notificaciones/recordatorio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idUsuario }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo enviar el recordatorio");
    } else {
      const data = await res.json();
      setMensajeRecordatorio(
        data.enviados > 0
          ? `Recordatorio enviado a ${data.enviados} dispositivo(s).`
          : "El talento no tiene notificaciones activadas."
      );
    }
    setEnviandoRecordatorio((prev) => {
      const next = new Set(prev);
      next.delete(idUsuario);
      return next;
    });
  }

  async function buscarProyeccion() {
    if (!proyeccionIdCliente) return;
    setCargandoProyeccion(true);
    setBuscoProyeccion(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        idCliente: proyeccionIdCliente,
        mesesAtras: String(proyeccionMesesAtras),
        mesesAdelante: String(proyeccionMesesAdelante),
      });
      setFilasProyeccion(await fetchJson<ProyeccionRow[]>(`/api/reportes/proyeccion?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la proyeccion");
    }
    setCargandoProyeccion(false);
  }

  function alternarUsuario(id: number) {
    setIdsSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Prefiltro opcional por proyecto: con 200+ talentos en la empresa,
  // acotar primero a los asignados a un proyecto hace que el buscador de
  // abajo tenga muchas menos opciones entre las que elegir.
  useEffect(() => {
    if (!filtroProyectoTalentos) {
      setIdsProyecto(null);
      return;
    }
    setCargandoIdsProyecto(true);
    fetchJson<{ id_usuario: number }[]>(`/api/proyectos/${filtroProyectoTalentos}/asignaciones`)
      .then((asignados) => setIdsProyecto(new Set(asignados.map((a) => a.id_usuario))))
      .catch(() => setIdsProyecto(null))
      .finally(() => setCargandoIdsProyecto(false));
  }, [filtroProyectoTalentos]);

  const talentosCandidatos = useMemo(
    () => (idsProyecto ? usuarios.filter((u) => idsProyecto.has(u.id_usuario)) : usuarios),
    [usuarios, idsProyecto]
  );

  const totalHoras = filas.reduce((acc, f) => acc + Number(f.horas), 0);
  const totalHorasPorTarea = filasPorTarea.reduce((acc, f) => acc + Number(f.horas), 0);
  const totalSegundos = filas.reduce((acc, f) => acc + Number(f.duracion_segundos), 0);
  const totalSegundosPorTarea = filasPorTarea.reduce((acc, f) => acc + Number(f.duracion_segundos), 0);
  const totalSegundosVista = vista === "detalle" ? totalSegundos : totalSegundosPorTarea;
  const totalHorasVista = vista === "detalle" ? totalHoras : totalHorasPorTarea;
  const vistaTabla = vista === "detalle" || vista === "por-tarea";

  const resumenProyeccionPorMes = useMemo(() => {
    type Acc = {
      anio: number;
      mes: number;
      es_ejecutado: number;
      codigo_moneda: string | null;
      dias_laborales: number;
      horas_planificadas: number;
      ingreso_planificado: number;
      horas_reales: number | null;
      ingreso_real: number | null;
    };
    const mapa = new Map<string, Acc>();
    for (const f of filasProyeccion) {
      const clave = `${f.anio}-${f.mes}-${f.codigo_moneda ?? "sin-moneda"}`;
      const actual = mapa.get(clave);
      const horasReales = f.horas_reales === null ? null : Number(f.horas_reales);
      const ingresoReal = f.ingreso_real === null ? null : Number(f.ingreso_real);
      if (actual) {
        actual.dias_laborales = Math.max(actual.dias_laborales, f.dias_laborales);
        actual.horas_planificadas += Number(f.horas_planificadas);
        actual.ingreso_planificado += Number(f.ingreso_planificado);
        actual.horas_reales = horasReales === null ? actual.horas_reales : (actual.horas_reales ?? 0) + horasReales;
        actual.ingreso_real = ingresoReal === null ? actual.ingreso_real : (actual.ingreso_real ?? 0) + ingresoReal;
      } else {
        mapa.set(clave, {
          anio: f.anio,
          mes: f.mes,
          es_ejecutado: f.es_ejecutado,
          codigo_moneda: f.codigo_moneda,
          dias_laborales: f.dias_laborales,
          horas_planificadas: Number(f.horas_planificadas),
          ingreso_planificado: Number(f.ingreso_planificado),
          horas_reales: horasReales,
          ingreso_real: ingresoReal,
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.anio - b.anio || a.mes - b.mes);
  }, [filasProyeccion]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Reportes de horas</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => cambiarVista("detalle")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            vista === "detalle"
              ? "border-[var(--color-primario)] text-[var(--color-primario)]"
              : "border-transparent text-gray-500"
          }`}
        >
          Detalle
        </button>
        <button
          onClick={() => cambiarVista("por-tarea")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            vista === "por-tarea"
              ? "border-[var(--color-primario)] text-[var(--color-primario)]"
              : "border-transparent text-gray-500"
          }`}
        >
          Por tarea
        </button>
        {esAdmin && (
          <button
            onClick={() => setVista("costos")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              vista === "costos"
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            Costos
          </button>
        )}
        {esAdmin && (
          <button
            onClick={() => setVista("resumen")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              vista === "resumen"
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            Resumen
          </button>
        )}
        {esAdmin && (
          <button
            onClick={() => setVista("proyeccion")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              vista === "proyeccion"
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            Proyeccion
          </button>
        )}
        {esAdmin && tieneClases && (
          <button
            onClick={() => setVista("clases")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              vista === "clases"
                ? "border-[var(--color-primario)] text-[var(--color-primario)]"
                : "border-transparent text-gray-500"
            }`}
          >
            Clases
          </button>
        )}
      </div>

      {vistaTabla && (
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
            onClick={() => buscar()}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {cargando && <Spinner />}
            Buscar
          </button>
          <button
            onClick={exportar}
            disabled={exportando}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {exportando && <Spinner />}
            Exportar Excel
          </button>
        </div>

        {esAdmin && usuarios.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Talentos (vacio = todos)</p>
            {proyectos.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Acotar por proyecto</label>
                <select
                  value={filtroProyectoTalentos}
                  onChange={(e) => setFiltroProyectoTalentos(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((p) => (
                    <option key={p.id_proyecto} value={p.id_proyecto}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {cargandoIdsProyecto && <Spinner className="h-3 w-3" />}
              </div>
            )}
            <SelectorTalentosMultiple
              talentos={talentosCandidatos}
              idsSeleccionados={idsSeleccionados}
              onAlternar={alternarUsuario}
              todosLosUsuarios={usuarios}
            />
          </div>
        )}
      </div>
      )}

      {vistaTabla && !cargando && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total en horas</p>
            <p className="text-2xl font-semibold tabular-nums">{formatearHorasMin(totalSegundosVista)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total decimal</p>
            <p className="text-2xl font-semibold tabular-nums">{totalHorasVista.toFixed(2)} h</p>
          </div>
        </div>
      )}

      {vistaTabla && (
      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        {cargando ? (
          <CargandoInline texto="Buscando registros..." />
        ) : vista === "detalle" ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Colaborador</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="px-4 py-2 font-medium">Tarea</th>
                <th className="px-4 py-2 font-medium">Inicio</th>
                <th className="px-4 py-2 font-medium">Fin</th>
                <th className="px-4 py-2 font-medium text-right">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((f, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{f.colaborador}</td>
                  <td className="px-4 py-2 text-gray-500">{f.cliente ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-500">{f.proyecto}</td>
                  <td className="px-4 py-2 text-gray-500">{f.tarea}</td>
                  <td className="px-4 py-2 text-gray-500">{f.fecha_inicio}</td>
                  <td className="px-4 py-2 text-gray-500">{f.fecha_fin}</td>
                  <td className="px-4 py-2 text-right">{f.horas}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Sin registros para el rango seleccionado
                  </td>
                </tr>
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td colSpan={6} className="px-4 py-2 text-right">
                    Total
                  </td>
                  <td className="px-4 py-2 text-right">{totalHoras.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Colaborador</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="px-4 py-2 font-medium">Tarea</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium text-right">Sesiones</th>
                <th className="px-4 py-2 font-medium text-right">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filasPorTarea.map((f) => (
                <tr key={f.id_tarea}>
                  <td className="px-4 py-2">{f.colaborador}</td>
                  <td className="px-4 py-2 text-gray-500">{f.cliente ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-500">{f.proyecto}</td>
                  <td className="px-4 py-2 text-gray-500">{f.tarea}</td>
                  <td className="px-4 py-2 text-gray-500">{f.estado_tarea}</td>
                  <td className="px-4 py-2 text-right">{f.sesiones}</td>
                  <td className="px-4 py-2 text-right">{f.horas}</td>
                </tr>
              ))}
              {filasPorTarea.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Sin registros para el rango seleccionado
                  </td>
                </tr>
              )}
            </tbody>
            {filasPorTarea.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td colSpan={6} className="px-4 py-2 text-right">
                    Total
                  </td>
                  <td className="px-4 py-2 text-right">{totalHorasPorTarea.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
      )}

      {vista === "costos" && esAdmin && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cliente / Proyecto</label>
              <select
                value={costoIdProyecto}
                onChange={(e) => setCostoIdProyecto(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona un proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id_proyecto} value={p.id_proyecto}>
                    {p.nombre}
                    {p.cliente ? ` (${p.cliente})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mes</label>
              <select
                value={costoMes}
                onChange={(e) => setCostoMes(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Anio</label>
              <input
                type="number"
                value={costoAnio}
                onChange={(e) => setCostoAnio(Number(e.target.value))}
                className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={buscarCostos}
              disabled={cargandoCostos || !costoIdProyecto}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {cargandoCostos && <Spinner />}
              Generar reporte
            </button>
            <button
              onClick={exportarCostos}
              disabled={exportando || !buscoCostos || filasCostos.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {exportando && <Spinner />}
              Exportar Excel
            </button>
          </div>

          {buscoCostos && !cargandoCostos && filasCostos.length > 0 && (
            <p className="text-xs text-gray-500">
              Datos calculados hasta el <strong>{filasCostos[0].fecha_corte.slice(0, 10)}</strong> (no incluye el
              dia de hoy, aun sin cerrar).
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
            {cargandoCostos ? (
              <CargandoInline texto="Calculando costos..." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Colaborador</th>
                    <th className="px-4 py-2 font-medium">Calendario</th>
                    <th className="px-4 py-2 font-medium text-right">Dias laborales del mes</th>
                    <th className="px-4 py-2 font-medium text-right">Dias laborales a la fecha</th>
                    <th className="px-4 py-2 font-medium text-right">Horas trabajadas</th>
                    <th className="px-4 py-2 font-medium text-right">Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filasCostos.map((f) => (
                    <tr key={f.id_usuario}>
                      <td className="px-4 py-2">{f.colaborador}</td>
                      <td className="px-4 py-2 text-gray-500">{f.pais_calendario ?? "Sin calendario"}</td>
                      <td className="px-4 py-2 text-right">{f.dias_laborales_totales_mes}</td>
                      <td className="px-4 py-2 text-right">{f.dias_laborales_a_fecha}</td>
                      <td className="px-4 py-2 text-right">
                        {Number(f.horas_trabajadas).toFixed(2)}
                        {Number(f.horas_sin_tarifa) > 0 && (
                          <span className="block text-xs text-amber-600">
                            {Number(f.horas_sin_tarifa).toFixed(2)}h sin perfil asignado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {f.moneda ? `${formatearMoneda(f.costo_total)} ${f.codigo_moneda}` : "-"}
                      </td>
                    </tr>
                  ))}
                  {buscoCostos && filasCostos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        Sin talentos asignados a este proyecto
                      </td>
                    </tr>
                  )}
                  {!buscoCostos && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        Selecciona un proyecto y un mes, y genera el reporte
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {vista === "resumen" && esAdmin && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cliente / Proyecto</label>
              <select
                value={resumenIdProyecto}
                onChange={(e) => setResumenIdProyecto(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona un proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id_proyecto} value={p.id_proyecto}>
                    {p.nombre}
                    {p.cliente ? ` (${p.cliente})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mes</label>
              <select
                value={resumenMes}
                onChange={(e) => setResumenMes(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Anio</label>
              <input
                type="number"
                value={resumenAnio}
                onChange={(e) => setResumenAnio(Number(e.target.value))}
                className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={buscarResumen}
              disabled={cargandoResumen || !resumenIdProyecto}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {cargandoResumen && <Spinner />}
              Generar resumen
            </button>
            <button
              onClick={exportarResumen}
              disabled={exportando || !buscoResumen || filasResumen.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
              title="Detalle por talento + facturacion agrupada por rate + detalle de horas registradas"
            >
              {exportando && <Spinner />}
              Exportar facturacion (Excel)
            </button>
          </div>

          {mensajeRecordatorio && <p className="text-sm text-green-700">{mensajeRecordatorio}</p>}

          {buscoResumen && !cargandoResumen && filasResumen.length > 0 && (
            <p className="text-xs text-gray-500">
              Avance calculado hasta el <strong>{filasResumen[0].fecha_corte.slice(0, 10)}</strong>. Jornada
              planificada: 8h por dia laboral.
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
            {cargandoResumen ? (
              <CargandoInline texto="Calculando avance..." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Avance</th>
                    <th className="px-4 py-2 font-medium">Colaborador</th>
                    <th className="px-4 py-2 font-medium text-right">Horas trabajadas</th>
                    <th className="px-4 py-2 font-medium text-right">Horas planificadas</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filasResumen.map((f) => {
                    const sem = SEMAFORO[f.semaforo];
                    const puedeNotificar = f.usuario_activo === 1 && f.semaforo !== "VERDE";
                    return (
                      <tr key={f.id_usuario}>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${sem.color}`} />
                            <span className="text-xs text-gray-500">{sem.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {f.colaborador}
                          {f.usuario_activo === 0 && (
                            <span className="text-gray-400"> (inactivo)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">{Number(f.horas_trabajadas).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          {Number(f.horas_planificadas_a_fecha).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            onClick={() => enviarRecordatorio(f.id_usuario)}
                            disabled={!puedeNotificar || enviandoRecordatorio.has(f.id_usuario)}
                            title={
                              f.usuario_activo === 0
                                ? "El talento esta inactivo"
                                : f.semaforo === "VERDE"
                                  ? "Va al dia, no hace falta recordatorio"
                                  : "Enviar recordatorio push"
                            }
                            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 underline disabled:opacity-40 disabled:hover:text-gray-500"
                          >
                            {enviandoRecordatorio.has(f.id_usuario) && <Spinner className="h-3 w-3" />}
                            Enviar recordatorio
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {buscoResumen && filasResumen.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        Sin talentos asignados a este proyecto
                      </td>
                    </tr>
                  )}
                  {!buscoResumen && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        Selecciona un proyecto y un mes, y genera el resumen
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {vista === "proyeccion" && esAdmin && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cliente</label>
              <select
                value={proyeccionIdCliente}
                onChange={(e) => setProyeccionIdCliente(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona un cliente</option>
                {clientesUnicos.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.cliente}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Meses atras</label>
              <input
                type="number"
                min="0"
                max="24"
                value={proyeccionMesesAtras}
                onChange={(e) => setProyeccionMesesAtras(Number(e.target.value))}
                className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Meses adelante</label>
              <input
                type="number"
                min="0"
                max="24"
                value={proyeccionMesesAdelante}
                onChange={(e) => setProyeccionMesesAdelante(Number(e.target.value))}
                className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={buscarProyeccion}
              disabled={cargandoProyeccion || !proyeccionIdCliente}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {cargandoProyeccion && <Spinner />}
              Generar proyeccion
            </button>
            <button
              onClick={exportarProyeccion}
              disabled={exportando || !buscoProyeccion || filasProyeccion.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {exportando && <Spinner />}
              Exportar Excel
            </button>
          </div>

          {buscoProyeccion && !cargandoProyeccion && (
            <p className="text-xs text-gray-500">
              Lo planificado usa la tarifa vigente hoy de cada talento, aplicada de forma consistente en
              todos los meses (pasados y futuros). Para el monto exacto a facturar de un mes ya cerrado, usa
              el reporte de Costos.
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
            {cargandoProyeccion ? (
              <CargandoInline texto="Calculando proyeccion..." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Mes</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium text-right">Horas planificadas</th>
                    <th className="px-4 py-2 font-medium text-right">Ingreso planificado</th>
                    <th className="px-4 py-2 font-medium text-right">Horas reales</th>
                    <th className="px-4 py-2 font-medium text-right">Ingreso real</th>
                    <th className="px-4 py-2 font-medium text-right">Variacion horas</th>
                    <th className="px-4 py-2 font-medium text-right">Variacion ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resumenProyeccionPorMes.map((m) => {
                    const variacionHoras = m.horas_reales === null ? null : m.horas_reales - m.horas_planificadas;
                    const variacionIngreso =
                      m.ingreso_real === null ? null : m.ingreso_real - m.ingreso_planificado;
                    return (
                      <tr key={`${m.anio}-${m.mes}-${m.codigo_moneda}`}>
                        <td className="px-4 py-2">
                          {MESES[m.mes - 1]} {m.anio}
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {m.es_ejecutado === 1 ? "Ejecutado" : m.horas_reales !== null ? "En curso" : "Futuro"}
                        </td>
                        <td className="px-4 py-2 text-right">{m.horas_planificadas.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          {m.codigo_moneda ? `${formatearMoneda(m.ingreso_planificado)} ${m.codigo_moneda}` : "-"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {m.horas_reales === null ? "-" : m.horas_reales.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {m.ingreso_real === null
                            ? "-"
                            : `${formatearMoneda(m.ingreso_real)} ${m.codigo_moneda}`}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${
                            variacionHoras === null
                              ? ""
                              : variacionHoras < 0
                                ? "text-red-600"
                                : "text-green-600"
                          }`}
                        >
                          {variacionHoras === null ? "-" : variacionHoras.toFixed(2)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right ${
                            variacionIngreso === null
                              ? ""
                              : variacionIngreso < 0
                                ? "text-red-600"
                                : "text-green-600"
                          }`}
                        >
                          {variacionIngreso === null
                            ? "-"
                            : `${formatearMoneda(variacionIngreso)} ${m.codigo_moneda}`}
                        </td>
                      </tr>
                    );
                  })}
                  {buscoProyeccion && resumenProyeccionPorMes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                        Sin talentos asignados a proyectos de este cliente
                      </td>
                    </tr>
                  )}
                  {!buscoProyeccion && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                        Selecciona un cliente y genera la proyeccion
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {vista === "clases" && esAdmin && tieneClases && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Desde</label>
              <input
                type="date"
                value={clasesFechaInicio}
                onChange={(e) => setClasesFechaInicio(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Hasta</label>
              <input
                type="date"
                value={clasesFechaFin}
                onChange={(e) => setClasesFechaFin(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={buscarClases}
              disabled={cargandoClases}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primario)] text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {cargandoClases && <Spinner />}
              Generar reporte
            </button>
            <button
              onClick={exportarClases}
              disabled={exportando || !buscoClases}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {exportando && <Spinner />}
              Exportar Excel
            </button>
          </div>

          {cargandoClases ? (
            <CargandoInline />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                <p className="px-4 py-2 text-sm font-medium border-b border-gray-200">Por profesor</p>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Profesor</th>
                      <th className="px-4 py-2 font-medium text-right">Sesiones</th>
                      <th className="px-4 py-2 font-medium text-right">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filasClasesPorProfesor.map((f) => (
                      <tr key={f.id_profesor}>
                        <td className="px-4 py-2">{f.profesor}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{f.sesiones_dictadas}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {(Number(f.total_segundos) / 3600).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {buscoClases && filasClasesPorProfesor.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                          Sin sesiones dictadas en este rango
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                <p className="px-4 py-2 text-sm font-medium border-b border-gray-200">Por grupo</p>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Grupo</th>
                      <th className="px-4 py-2 font-medium text-right">Sesiones</th>
                      <th className="px-4 py-2 font-medium text-right">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filasClasesPorGrupo.map((f) => (
                      <tr key={f.id_grupo}>
                        <td className="px-4 py-2">
                          {f.grupo}
                          <span className="text-gray-400"> · {f.proyecto}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{f.sesiones_dictadas}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {(Number(f.total_segundos) / 3600).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {buscoClases && filasClasesPorGrupo.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                          Sin sesiones dictadas en este rango
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
