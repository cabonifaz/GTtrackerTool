import { executeProcedure } from "@/lib/db";
import { UsuarioSistema } from "@/lib/types";

interface UsuarioSistemaValidacion extends UsuarioSistema {
  api_secret_hash: string;
  id_empresa: number;
}

export function crearUsuarioSistema(
  nombreSistema: string,
  apiKey: string,
  apiSecretHash: string,
  idEmpresa: number,
  creadoPor: string
) {
  return executeProcedure<{ id_usuario_sistema: number }>("sp_usuario_sistema_crear", [
    nombreSistema,
    apiKey,
    apiSecretHash,
    idEmpresa,
    creadoPor,
  ]);
}

export function revocarUsuarioSistema(idUsuarioSistema: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_usuario_sistema_revocar", [idUsuarioSistema, idEmpresaActor, modificadoPor]);
}

export function listarUsuariosSistema(idEmpresaActor: number) {
  return executeProcedure<UsuarioSistema>("sp_usuario_sistema_listar", [idEmpresaActor]);
}

export async function validarApiKey(apiKey: string) {
  const rows = await executeProcedure<UsuarioSistemaValidacion>("sp_usuario_sistema_validar", [
    apiKey,
  ]);
  return rows[0] ?? null;
}
