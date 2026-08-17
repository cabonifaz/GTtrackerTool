import { executeProcedure } from "@/lib/db";
import { CodigoRol, Usuario, UsuarioConHash } from "@/lib/types";

export function crearUsuario(
  nombres: string,
  apellidos: string,
  email: string,
  passwordHash: string,
  codigoRol: CodigoRol,
  creadoPor: string
) {
  return executeProcedure<{ id_usuario: number }>("sp_usuario_crear", [
    nombres,
    apellidos,
    email,
    passwordHash,
    codigoRol,
    creadoPor,
  ]);
}

export function editarUsuario(
  idUsuario: number,
  nombres: string,
  apellidos: string,
  codigoRol: CodigoRol,
  modificadoPor: string
) {
  return executeProcedure("sp_usuario_editar", [
    idUsuario,
    nombres,
    apellidos,
    codigoRol,
    modificadoPor,
  ]);
}

export function activarUsuario(idUsuario: number, modificadoPor: string) {
  return executeProcedure("sp_usuario_activar", [idUsuario, modificadoPor]);
}

export function desactivarUsuario(idUsuario: number, modificadoPor: string) {
  return executeProcedure("sp_usuario_desactivar", [idUsuario, modificadoPor]);
}

export function listarUsuarios() {
  return executeProcedure<Usuario>("sp_usuario_listar", []);
}

export function cambiarPassword(idUsuario: number, nuevoPasswordHash: string, modificadoPor: string) {
  return executeProcedure("sp_usuario_cambiar_password", [idUsuario, nuevoPasswordHash, modificadoPor]);
}

export async function obtenerUsuarioPorEmail(email: string) {
  const rows = await executeProcedure<UsuarioConHash>("sp_usuario_obtener_por_email", [email]);
  return rows[0] ?? null;
}
