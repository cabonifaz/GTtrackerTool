import { executeProcedure } from "@/lib/db";
import { Perfil, PerfilTarifaHistorico } from "@/lib/types";

export function crearPerfil(
  idCliente: number,
  nombre: string,
  tarifa: number,
  idMoneda: number,
  creadoPor: string
) {
  return executeProcedure<{ id_perfil: number }>("sp_perfil_crear", [
    idCliente,
    nombre,
    tarifa,
    idMoneda,
    creadoPor,
  ]);
}

export function editarTarifaPerfil(
  idPerfil: number,
  tarifa: number,
  idMoneda: number,
  modificadoPor: string
) {
  return executeProcedure("sp_perfil_editar_tarifa", [idPerfil, tarifa, idMoneda, modificadoPor]);
}

export function editarNombrePerfil(idPerfil: number, nombre: string, modificadoPor: string) {
  return executeProcedure("sp_perfil_editar_nombre", [idPerfil, nombre, modificadoPor]);
}

export function desactivarPerfil(idPerfil: number, modificadoPor: string) {
  return executeProcedure("sp_perfil_desactivar", [idPerfil, modificadoPor]);
}

export function listarPerfiles(idCliente: number | null) {
  return executeProcedure<Perfil>("sp_perfil_listar", [idCliente]);
}

export function historialTarifasPerfil(idPerfil: number) {
  return executeProcedure<PerfilTarifaHistorico>("sp_perfil_historial_tarifas", [idPerfil]);
}
