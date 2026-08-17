import { executeProcedure } from "@/lib/db";

export interface SuscripcionRow {
  id_push_suscripcion: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function guardarSuscripcion(
  idUsuario: number,
  endpoint: string,
  p256dh: string,
  auth: string,
  creadoPor: string
) {
  return executeProcedure("sp_push_suscripcion_guardar", [idUsuario, endpoint, p256dh, auth, creadoPor]);
}

export function eliminarSuscripcion(endpoint: string) {
  return executeProcedure("sp_push_suscripcion_eliminar", [endpoint]);
}

export function listarSuscripcionesPorUsuario(idUsuario: number) {
  return executeProcedure<SuscripcionRow>("sp_push_suscripcion_listar_por_usuario", [idUsuario]);
}
