import { executeProcedure } from "@/lib/db";
import { ActividadProyecto, CodigoRol, ProyectoAsignacion } from "@/lib/types";

export function upsertAsignacion(
  idProyecto: number,
  idUsuario: number,
  proveedor: string | null,
  ocOs: string | null,
  nombreIniciativa: string | null,
  periodoDesde: string,
  periodoHasta: string,
  periodoReferencia: string | null,
  liderTecnico: string | null,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_asignacion: number }>("sp_proyecto_asignacion_upsert", [
    idProyecto,
    idUsuario,
    proveedor,
    ocOs,
    nombreIniciativa,
    periodoDesde,
    periodoHasta,
    periodoReferencia,
    liderTecnico,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function desactivarAsignacion(idAsignacion: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_proyecto_asignacion_desactivar", [idAsignacion, idEmpresaActor, modificadoPor]);
}

export function listarAsignaciones(
  idProyecto: number | null,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number
) {
  return executeProcedure<ProyectoAsignacion>("sp_proyecto_asignacion_listar", [
    idProyecto,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
  ]);
}

export function agregarActividad(
  idAsignacion: number,
  descripcion: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_actividad: number }>("sp_actividad_agregar", [
    idAsignacion,
    descripcion,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function editarActividad(
  idActividad: number,
  descripcion: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_actividad_editar", [
    idActividad,
    descripcion,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
    modificadoPor,
  ]);
}

export function eliminarActividad(
  idActividad: number,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_actividad_eliminar", [
    idActividad,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
    modificadoPor,
  ]);
}

export function listarActividades(
  idAsignacion: number,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number
) {
  return executeProcedure<ActividadProyecto>("sp_actividad_listar", [
    idAsignacion,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
  ]);
}
