import { executeProcedure } from "@/lib/db";
import {
  ProyeccionRow,
  ReporteCostoRow,
  ReporteDetalleRow,
  ReporteTareaRow,
  ResumenAvanceRow,
} from "@/lib/types";

export function reporteHorasDetalle(idsUsuario: number[], fechaInicio: string, fechaFin: string) {
  const idsCsv = idsUsuario.length > 0 ? idsUsuario.join(",") : null;
  return executeProcedure<ReporteDetalleRow>("sp_reporte_horas_detalle", [
    idsCsv,
    fechaInicio,
    fechaFin,
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

export function reporteTiempoPorTarea(idsUsuario: number[], fechaInicio: string, fechaFin: string) {
  const idsCsv = idsUsuario.length > 0 ? idsUsuario.join(",") : null;
  return executeProcedure<ReporteTareaRow>("sp_reporte_tiempo_por_tarea", [
    idsCsv,
    fechaInicio,
    fechaFin,
  ]);
}

export function reporteCostosMensual(idProyecto: number, anio: number, mes: number) {
  return executeProcedure<ReporteCostoRow>("sp_reporte_costos_mensual", [idProyecto, anio, mes]);
}

export function reporteResumenAvance(idProyecto: number, anio: number, mes: number) {
  return executeProcedure<ResumenAvanceRow>("sp_reporte_resumen_avance", [idProyecto, anio, mes]);
}

export function reporteProyeccionCliente(idCliente: number, mesesAtras: number, mesesAdelante: number) {
  return executeProcedure<ProyeccionRow>("sp_reporte_proyeccion_cliente", [
    idCliente,
    mesesAtras,
    mesesAdelante,
  ]);
}
