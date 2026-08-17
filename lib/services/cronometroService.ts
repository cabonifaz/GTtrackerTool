import { executeProcedure } from "@/lib/db";
import { CodigoRol, RegistroActivo, UltimaTarea } from "@/lib/types";

export type ResolverTarea =
  | { idTarea: number; idProyecto?: undefined; nombreTarea?: undefined }
  | { idTarea?: undefined; idProyecto: number; nombreTarea: string };

export function iniciarCronometro(
  idUsuario: number,
  tarea: ResolverTarea,
  descripcion: string | null,
  creadoPor: string,
  codigoRolActor: CodigoRol,
  fechaInicio: string | null = null
) {
  return executeProcedure<{ id_registro: number; id_tarea: number }>("sp_cronometro_iniciar", [
    idUsuario,
    tarea.idTarea ?? null,
    tarea.idProyecto ?? null,
    tarea.nombreTarea ?? null,
    descripcion,
    creadoPor,
    codigoRolActor,
    fechaInicio,
  ]);
}

export function detenerCronometro(
  idUsuario: number,
  modificadoPor: string,
  fechaFin: string | null = null
) {
  return executeProcedure<{ id_registro: number; duracion_segundos: number }>(
    "sp_cronometro_detener",
    [idUsuario, modificadoPor, fechaFin]
  );
}

export function checkpointCronometro(idUsuario: number, modificadoPor: string) {
  return executeProcedure("sp_cronometro_checkpoint", [idUsuario, modificadoPor]);
}

export async function obtenerCronometroActivo(idUsuario: number) {
  const rows = await executeProcedure<RegistroActivo>("sp_cronometro_obtener_activo", [
    idUsuario,
  ]);
  return rows[0] ?? null;
}

export async function obtenerUltimaTarea(idUsuario: number) {
  const rows = await executeProcedure<UltimaTarea>("sp_cronometro_obtener_ultima_tarea", [
    idUsuario,
  ]);
  return rows[0] ?? null;
}

export function crearRegistroManual(
  idUsuario: number,
  tarea: ResolverTarea,
  fechaInicio: string,
  fechaFin: string,
  descripcion: string | null,
  creadoPor: string,
  codigoRolActor: CodigoRol
) {
  return executeProcedure<{ id_registro: number; id_tarea: number; actualizado: number }>(
    "sp_registro_tiempo_crear_manual",
    [
      idUsuario,
      tarea.idTarea ?? null,
      tarea.idProyecto ?? null,
      tarea.nombreTarea ?? null,
      fechaInicio,
      fechaFin,
      descripcion,
      creadoPor,
      codigoRolActor,
    ]
  );
}

export function editarRegistroTiempo(
  idRegistro: number,
  fechaInicio: string,
  fechaFin: string | null,
  descripcion: string | null,
  modificadoPor: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol
) {
  return executeProcedure("sp_registro_tiempo_editar", [
    idRegistro,
    fechaInicio,
    fechaFin,
    descripcion,
    modificadoPor,
    idUsuarioActor,
    codigoRolActor,
  ]);
}

export function eliminarRegistroTiempo(
  idRegistro: number,
  modificadoPor: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol
) {
  return executeProcedure("sp_registro_tiempo_eliminar", [
    idRegistro,
    modificadoPor,
    idUsuarioActor,
    codigoRolActor,
  ]);
}
