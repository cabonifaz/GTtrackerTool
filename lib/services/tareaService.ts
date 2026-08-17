import { executeProcedure } from "@/lib/db";
import { CodigoRol, Tarea } from "@/lib/types";

export function crearTarea(
  idProyecto: number,
  nombre: string,
  descripcion: string | null,
  creadoPor: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol
) {
  return executeProcedure<{ id_tarea: number }>("sp_tarea_crear", [
    idProyecto,
    nombre,
    descripcion,
    creadoPor,
    idUsuarioActor,
    codigoRolActor,
  ]);
}

export function editarTarea(
  idTarea: number,
  nombre: string,
  descripcion: string | null,
  codigoEstado: string,
  modificadoPor: string
) {
  return executeProcedure("sp_tarea_editar", [
    idTarea,
    nombre,
    descripcion,
    codigoEstado,
    modificadoPor,
  ]);
}

export function desactivarTarea(idTarea: number, modificadoPor: string) {
  return executeProcedure("sp_tarea_desactivar", [idTarea, modificadoPor]);
}

export function finalizarTarea(
  idTarea: number,
  modificadoPor: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol
) {
  return executeProcedure("sp_tarea_finalizar", [idTarea, modificadoPor, idUsuarioActor, codigoRolActor]);
}

export function listarTareas(
  idProyecto: number | null,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol
) {
  return executeProcedure<Tarea>("sp_tarea_listar", [idProyecto, idUsuarioActor, codigoRolActor]);
}
