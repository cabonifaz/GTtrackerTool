import { executeProcedure } from "@/lib/db";
import { CodigoRol, Usuario, UsuarioConHash } from "@/lib/types";

export function crearUsuario(
  nombres: string,
  apellidos: string,
  email: string,
  passwordHash: string,
  codigoRol: CodigoRol,
  idEmpresa: number | null,
  numeroDocumento: string | null,
  creadoPor: string
) {
  return executeProcedure<{ id_usuario: number }>("sp_usuario_crear", [
    nombres,
    apellidos,
    email,
    passwordHash,
    codigoRol,
    idEmpresa,
    numeroDocumento,
    creadoPor,
  ]);
}

export function editarUsuario(
  idUsuario: number,
  nombres: string,
  apellidos: string,
  codigoRol: CodigoRol,
  numeroDocumento: string | null,
  idEmpresaActor: number | null,
  modificadoPor: string
) {
  return executeProcedure("sp_usuario_editar", [
    idUsuario,
    nombres,
    apellidos,
    codigoRol,
    numeroDocumento,
    idEmpresaActor,
    modificadoPor,
  ]);
}

export function activarUsuario(idUsuario: number, idEmpresaActor: number | null, modificadoPor: string) {
  return executeProcedure("sp_usuario_activar", [idUsuario, idEmpresaActor, modificadoPor]);
}

export function desactivarUsuario(idUsuario: number, idEmpresaActor: number | null, modificadoPor: string) {
  return executeProcedure("sp_usuario_desactivar", [idUsuario, idEmpresaActor, modificadoPor]);
}

export function listarUsuarios(idEmpresaActor: number | null) {
  return executeProcedure<Usuario>("sp_usuario_listar", [idEmpresaActor]);
}

export function cambiarPassword(idUsuario: number, nuevoPasswordHash: string, modificadoPor: string) {
  return executeProcedure("sp_usuario_cambiar_password", [idUsuario, nuevoPasswordHash, modificadoPor]);
}

export function resetearPassword(idUsuario: number, nuevoPasswordHash: string, modificadoPor: string) {
  return executeProcedure("sp_usuario_resetear_password", [idUsuario, nuevoPasswordHash, modificadoPor]);
}

export async function obtenerUsuarioPorEmail(email: string) {
  const rows = await executeProcedure<UsuarioConHash>("sp_usuario_obtener_por_email", [email]);
  return rows[0] ?? null;
}
