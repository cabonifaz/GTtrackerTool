import { executeProcedure } from "@/lib/db";
import { Ausencia, AusenciaAdmin, SaldoVacaciones } from "@/lib/types";

export function crearAusencia(
  idUsuario: number,
  idTipo: number,
  fechaInicio: string,
  fechaFin: string,
  motivo: string | null,
  evidencia: Buffer | null,
  evidenciaTipo: string | null,
  creadoPor: string
) {
  return executeProcedure<{ id_ausencia: number }>("sp_ausencia_crear", [
    idUsuario,
    idTipo,
    fechaInicio,
    fechaFin,
    motivo,
    evidencia,
    evidenciaTipo,
    creadoPor,
  ]);
}

export function listarAusenciasPorUsuario(idUsuario: number) {
  return executeProcedure<Ausencia>("sp_ausencia_listar_por_usuario", [idUsuario]);
}

export function listarAusenciasTodas(idUsuario: number | null, codigoEstado: string | null) {
  return executeProcedure<AusenciaAdmin>("sp_ausencia_listar_todas", [idUsuario, codigoEstado]);
}

interface EvidenciaRow {
  id_usuario: number;
  evidencia: Buffer | null;
  evidencia_tipo: string | null;
}

export async function obtenerEvidenciaAusencia(idAusencia: number) {
  const rows = await executeProcedure<EvidenciaRow>("sp_ausencia_obtener_evidencia", [idAusencia]);
  return rows[0] ?? null;
}

export function aprobarAusencia(
  idAusencia: number,
  evidencia: Buffer | null,
  evidenciaTipo: string | null,
  aprobadoPor: string
) {
  return executeProcedure("sp_ausencia_aprobar", [idAusencia, evidencia, evidenciaTipo, aprobadoPor]);
}

export function rechazarAusencia(idAusencia: number, motivoRechazo: string | null, modificadoPor: string) {
  return executeProcedure("sp_ausencia_rechazar", [idAusencia, motivoRechazo, modificadoPor]);
}

export function asignarSaldoVacaciones(
  idUsuario: number,
  anio: number,
  diasAsignados: number,
  creadoPor: string
) {
  return executeProcedure("sp_saldo_vacaciones_asignar", [idUsuario, anio, diasAsignados, creadoPor]);
}

export async function obtenerSaldoVacaciones(idUsuario: number, anio: number) {
  const rows = await executeProcedure<SaldoVacaciones>("sp_saldo_vacaciones_listar", [idUsuario, anio]);
  return rows[0] ?? null;
}
