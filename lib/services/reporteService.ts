import { executeProcedure } from "@/lib/db";
import {
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
