import { executeProcedure } from "@/lib/db";
import { UsuarioSistema } from "@/lib/types";

interface UsuarioSistemaValidacion extends UsuarioSistema {
  api_secret_hash: string;
}

export function crearUsuarioSistema(
  nombreSistema: string,
  apiKey: string,
  apiSecretHash: string,
  creadoPor: string
) {
  return executeProcedure<{ id_usuario_sistema: number }>("sp_usuario_sistema_crear", [
    nombreSistema,
    apiKey,
    apiSecretHash,
    creadoPor,
  ]);
}

export function revocarUsuarioSistema(idUsuarioSistema: number, modificadoPor: string) {
  return executeProcedure("sp_usuario_sistema_revocar", [idUsuarioSistema, modificadoPor]);
}

export function listarUsuariosSistema() {
  return executeProcedure<UsuarioSistema>("sp_usuario_sistema_listar", []);
}

export async function validarApiKey(apiKey: string) {
  const rows = await executeProcedure<UsuarioSistemaValidacion>("sp_usuario_sistema_validar", [
    apiKey,
  ]);
  return rows[0] ?? null;
}
