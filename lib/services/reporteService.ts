import { executeProcedure } from "@/lib/db";
import {
  EstadoCierreFacturacion,
  ProyeccionRow,
  ReporteCostoRow,
  ReporteDetalleRow,
  ReporteFacturacionRow,
  ReporteTareaRow,
  ResumenAvanceRow,
} from "@/lib/types";

export function reporteHorasDetalle(
  idsUsuario: number[],
  fechaInicio: string,
  fechaFin: string,
  idEmpresaActor: number
) {
  const idsCsv = idsUsuario.length > 0 ? idsUsuario.join(",") : null;
  return executeProcedure<ReporteDetalleRow>("sp_reporte_horas_detalle", [
    idsCsv,
    fechaInicio,
    fechaFin,
    idEmpresaActor,
  ]);
}

interface ResumenMensualRow {
  colaborador: string;
  fecha: string;
  proyecto: string;
  tarea: string;
  duracion_segundos: number;
  horas: number;
}

export function reporteHorasResumenMensual(
  idUsuario: number,
  fechaInicio: string,
  fechaFin: string
) {
  return executeProcedure<ResumenMensualRow>("sp_reporte_horas_resumen_mensual", [
    idUsuario,
    fechaInicio,
    fechaFin,
  ]);
}

export function reporteTiempoPorTarea(
  idsUsuario: number[],
  fechaInicio: string,
  fechaFin: string,
  idEmpresaActor: number
) {
  const idsCsv = idsUsuario.length > 0 ? idsUsuario.join(",") : null;
  return executeProcedure<ReporteTareaRow>("sp_reporte_tiempo_por_tarea", [
    idsCsv,
    fechaInicio,
    fechaFin,
    idEmpresaActor,
  ]);
}

export function reporteCostosMensual(idProyecto: number, anio: number, mes: number, idEmpresaActor: number) {
  return executeProcedure<ReporteCostoRow>("sp_reporte_costos_mensual", [idProyecto, anio, mes, idEmpresaActor]);
}

export function reporteResumenAvance(idProyecto: number, anio: number, mes: number, idEmpresaActor: number) {
  return executeProcedure<ResumenAvanceRow>("sp_reporte_resumen_avance", [idProyecto, anio, mes, idEmpresaActor]);
}

export function reporteFacturacionMensual(idProyecto: number, anio: number, mes: number, idEmpresaActor: number) {
  return executeProcedure<ReporteFacturacionRow>("sp_reporte_facturacion_mensual", [
    idProyecto,
    anio,
    mes,
    idEmpresaActor,
  ]);
}

export interface FacturacionDetalleHorasRow {
  id_registro: number;
  colaborador: string;
  tarea: string;
  fecha_inicio: string;
  fecha_fin: string;
  horas: number;
  descripcion: string | null;
}

export function reporteFacturacionDetalleHoras(idProyecto: number, anio: number, mes: number, idEmpresaActor: number) {
  return executeProcedure<FacturacionDetalleHorasRow>("sp_reporte_facturacion_detalle_horas", [
    idProyecto,
    anio,
    mes,
    idEmpresaActor,
  ]);
}

// Variante de reporteFacturacionMensual que usa el perfil/tarifa vigente
// HOY para todo el mes, en vez del vigente historicamente a la fecha de
// corte -- para el boton "Regenerar con tarifas actuales".
export function reporteFacturacionMensualTarifaActual(
  idProyecto: number,
  anio: number,
  mes: number,
  idEmpresaActor: number
) {
  return executeProcedure<ReporteFacturacionRow>("sp_reporte_facturacion_mensual_tarifa_actual", [
    idProyecto,
    anio,
    mes,
    idEmpresaActor,
  ]);
}

export async function estadoCierreFacturacion(idProyecto: number, anio: number, mes: number) {
  const rows = await executeProcedure<EstadoCierreFacturacion>("sp_facturacion_mes_estado", [
    idProyecto,
    anio,
    mes,
  ]);
  return rows[0] ?? null;
}

export function cerrarMesFacturacion(
  idProyecto: number,
  anio: number,
  mes: number,
  idEmpresaActor: number,
  cerradoPor: string
) {
  return executeProcedure<{ id_cierre: number }>("sp_facturacion_mes_cerrar", [
    idProyecto,
    anio,
    mes,
    idEmpresaActor,
    cerradoPor,
  ]);
}

export function reabrirMesFacturacion(
  idProyecto: number,
  anio: number,
  mes: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_facturacion_mes_reabrir", [idProyecto, anio, mes, idEmpresaActor, modificadoPor]);
}

export function reporteFacturacionCierreDetalle(idProyecto: number, anio: number, mes: number) {
  return executeProcedure<ReporteFacturacionRow>("sp_facturacion_cierre_detalle_listar", [idProyecto, anio, mes]);
}

export function reporteProyeccionCliente(
  idCliente: number,
  mesesAtras: number,
  mesesAdelante: number,
  idEmpresaActor: number
) {
  return executeProcedure<ProyeccionRow>("sp_reporte_proyeccion_cliente", [
    idCliente,
    mesesAtras,
    mesesAdelante,
    idEmpresaActor,
  ]);
}
