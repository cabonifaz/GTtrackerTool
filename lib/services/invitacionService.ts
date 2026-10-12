import { executeProcedure } from "@/lib/db";
import { InvitacionAdmin, InvitacionPublica } from "@/lib/types";

export async function crearInvitacion(
  idUsuario: number,
  idProyecto: number | null,
  token: string,
  diasExpiracion: number,
  idEmpresaActor: number,
  creadoPor: string
) {
  const rows = await executeProcedure<{ id_invitacion: number; token: string }>("sp_invitacion_crear", [
    idUsuario,
    idProyecto,
    token,
    diasExpiracion,
    idEmpresaActor,
    creadoPor,
  ]);
  return rows[0];
}

export function listarInvitaciones(idEmpresaActor: number) {
  return executeProcedure<InvitacionAdmin>("sp_invitacion_listar", [idEmpresaActor]);
}

export async function reenviarInvitacion(
  idInvitacion: number,
  tokenNuevo: string,
  diasExpiracion: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  const rows = await executeProcedure<{ token: string }>("sp_invitacion_reenviar", [
    idInvitacion,
    tokenNuevo,
    diasExpiracion,
    idEmpresaActor,
    modificadoPor,
  ]);
  return rows[0];
}

export function revocarInvitacion(idInvitacion: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_invitacion_revocar", [idInvitacion, idEmpresaActor, modificadoPor]);
}

export async function obtenerInvitacionPorToken(token: string) {
  const rows = await executeProcedure<InvitacionPublica>("sp_invitacion_obtener_por_token", [token]);
  return rows[0] ?? null;
}

export async function aceptarInvitacion(token: string, passwordHash: string) {
  const rows = await executeProcedure<{ empresa_slug: string; email: string }>("sp_invitacion_aceptar", [
    token,
    passwordHash,
  ]);
  return rows[0];
}
