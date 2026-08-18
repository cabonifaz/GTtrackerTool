import { executeProcedure } from "@/lib/db";
import { CodigoRol, Tarea } from "@/lib/types";

export function crearTarea(
  idProyecto: number,
  nombre: string,
  descripcion: string | null,
  creadoPor: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number
) {
  return executeProcedure<{ id_tarea: number }>("sp_tarea_crear", [
    idProyecto,
    nombre,
    descripcion,
    creadoPor,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
  ]);
}

export function editarTarea(
  idTarea: number,
  nombre: string,
  descripcion: string | null,
  codigoEstado: string,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_tarea_editar", [
    idTarea,
    nombre,
    descripcion,
    codigoEstado,
    idEmpresaActor,
    modificadoPor,
  ]);
}

export function desactivarTarea(
  idTarea: number,
  idEmpresaActor: number,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  modificadoPor: string
) {
  return executeProcedure("sp_tarea_desactivar", [
    idTarea,
    idEmpresaActor,
    idUsuarioActor,
    codigoRolActor,
    modificadoPor,
  ]);
}

export function finalizarTarea(
  idTarea: number,
  modificadoPor: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number
) {
  return executeProcedure("sp_tarea_finalizar", [
    idTarea,
    modificadoPor,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
  ]);
}

export function listarTareas(
  idProyecto: number | null,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number
) {
  return executeProcedure<Tarea>("sp_tarea_listar", [idProyecto, idUsuarioActor, codigoRolActor, idEmpresaActor]);
}

export function listarTareasPorTalentos(idsUsuario: number[], idEmpresaActor: number) {
  const idsCsv = idsUsuario.join(",");
  return executeProcedure<Tarea>("sp_tarea_listar_por_talentos", [idsCsv, idEmpresaActor]);
}
