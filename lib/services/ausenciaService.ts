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
  idEmpresaActor: number,
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
    idEmpresaActor,
    creadoPor,
  ]);
}

export function crearAusenciaAdmin(
  idUsuario: number,
  idTipo: number,
  fechaInicio: string,
  fechaFin: string,
  motivo: string | null,
  evidencia: Buffer | null,
  evidenciaTipo: string | null,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_ausencia: number }>("sp_ausencia_crear_admin", [
    idUsuario,
    idTipo,
    fechaInicio,
    fechaFin,
    motivo,
    evidencia,
    evidenciaTipo,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function listarAusenciasPorUsuario(idUsuario: number) {
  return executeProcedure<Ausencia>("sp_ausencia_listar_por_usuario", [idUsuario]);
}

export function listarAusenciasTodas(
  idsUsuario: number[] | null,
  codigoEstado: string | null,
  idEmpresaActor: number
) {
  return executeProcedure<AusenciaAdmin>("sp_ausencia_listar_todas", [
    idsUsuario && idsUsuario.length > 0 ? idsUsuario.join(",") : null,
    codigoEstado,
    idEmpresaActor,
  ]);
}

interface EvidenciaRow {
  id_usuario: number;
  evidencia: Buffer | null;
  evidencia_tipo: string | null;
}

export async function obtenerEvidenciaAusencia(idAusencia: number, idEmpresaActor: number) {
  const rows = await executeProcedure<EvidenciaRow>("sp_ausencia_obtener_evidencia", [idAusencia, idEmpresaActor]);
  return rows[0] ?? null;
}

export function aprobarAusencia(
  idAusencia: number,
  evidencia: Buffer | null,
  evidenciaTipo: string | null,
  idEmpresaActor: number,
  aprobadoPor: string
) {
  return executeProcedure("sp_ausencia_aprobar", [idAusencia, evidencia, evidenciaTipo, idEmpresaActor, aprobadoPor]);
}

export function rechazarAusencia(
  idAusencia: number,
  motivoRechazo: string | null,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_ausencia_rechazar", [idAusencia, motivoRechazo, idEmpresaActor, modificadoPor]);
}

export function asignarSaldoVacaciones(
  idUsuario: number,
  anio: number,
  diasAsignados: number,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure("sp_saldo_vacaciones_asignar", [idUsuario, anio, diasAsignados, idEmpresaActor, creadoPor]);
}

export async function obtenerSaldoVacaciones(idUsuario: number, anio: number, idEmpresaActor: number) {
  const rows = await executeProcedure<SaldoVacaciones>("sp_saldo_vacaciones_listar", [
    idUsuario,
    anio,
    idEmpresaActor,
  ]);
  return rows[0] ?? null;
}
