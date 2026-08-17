import { executeProcedure } from "@/lib/db";
import { Perfil, PerfilTarifaHistorico } from "@/lib/types";

export function crearPerfil(
  idCliente: number,
  nombre: string,
  tarifa: number,
  idMoneda: number,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_perfil: number }>("sp_perfil_crear", [
    idCliente,
    nombre,
    tarifa,
    idMoneda,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function editarTarifaPerfil(
  idPerfil: number,
  tarifa: number,
  idMoneda: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_perfil_editar_tarifa", [idPerfil, tarifa, idMoneda, idEmpresaActor, modificadoPor]);
}

export function editarNombrePerfil(idPerfil: number, nombre: string, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_perfil_editar_nombre", [idPerfil, nombre, idEmpresaActor, modificadoPor]);
}

export function desactivarPerfil(idPerfil: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_perfil_desactivar", [idPerfil, idEmpresaActor, modificadoPor]);
}

export function listarPerfiles(idCliente: number | null, idEmpresaActor: number) {
  return executeProcedure<Perfil>("sp_perfil_listar", [idCliente, idEmpresaActor]);
}

export function historialTarifasPerfil(idPerfil: number, idEmpresaActor: number) {
  return executeProcedure<PerfilTarifaHistorico>("sp_perfil_historial_tarifas", [idPerfil, idEmpresaActor]);
}
