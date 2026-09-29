import { executeProcedure } from "@/lib/db";
import { HoraExtra, HoraExtraAdmin, SaldoCompensatorio } from "@/lib/types";

export function crearHoraExtra(
  idUsuario: number,
  fecha: string,
  horas: number,
  motivo: string | null,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_hora_extra: number }>("sp_hora_extra_crear", [
    idUsuario,
    fecha,
    horas,
    motivo,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function crearHoraExtraAdmin(
  idUsuario: number,
  fecha: string,
  horas: number,
  motivo: string | null,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_hora_extra: number }>("sp_hora_extra_crear_admin", [
    idUsuario,
    fecha,
    horas,
    motivo,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function listarHorasExtraPorUsuario(idUsuario: number) {
  return executeProcedure<HoraExtra>("sp_hora_extra_listar_por_usuario", [idUsuario]);
}

export function listarHorasExtraTodas(
  idsUsuario: number[] | null,
  codigoEstado: string | null,
  idEmpresaActor: number
) {
  return executeProcedure<HoraExtraAdmin>("sp_hora_extra_listar_todas", [
    idsUsuario && idsUsuario.length > 0 ? idsUsuario.join(",") : null,
    codigoEstado,
    idEmpresaActor,
  ]);
}

export function aprobarHoraExtra(idHoraExtra: number, idEmpresaActor: number, aprobadoPor: string) {
  return executeProcedure("sp_hora_extra_aprobar", [idHoraExtra, idEmpresaActor, aprobadoPor]);
}

export function rechazarHoraExtra(
  idHoraExtra: number,
  motivoRechazo: string | null,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_hora_extra_rechazar", [idHoraExtra, motivoRechazo, idEmpresaActor, modificadoPor]);
}

export async function obtenerSaldoCompensatorio(idUsuario: number, idEmpresaActor: number) {
  const rows = await executeProcedure<SaldoCompensatorio>("sp_saldo_compensatorio_listar", [
    idUsuario,
    idEmpresaActor,
  ]);
  return rows[0] ?? null;
}
