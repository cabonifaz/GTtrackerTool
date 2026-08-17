import { executeProcedure } from "@/lib/db";
import { CodigoRol, MiProyecto, Proyecto, UsuarioAsignado } from "@/lib/types";

export function crearProyecto(
  idCliente: number | null,
  nombre: string,
  descripcion: string | null,
  creadoPor: string
) {
  return executeProcedure<{ id_proyecto: number }>("sp_proyecto_crear", [
    idCliente,
    nombre,
    descripcion,
    creadoPor,
  ]);
}

export function editarProyecto(
  idProyecto: number,
  nombre: string,
  descripcion: string | null,
  codigoEstado: string,
  modificadoPor: string
) {
  return executeProcedure("sp_proyecto_editar", [
    idProyecto,
    nombre,
    descripcion,
    codigoEstado,
    modificadoPor,
  ]);
}

export function desactivarProyecto(idProyecto: number, modificadoPor: string) {
  return executeProcedure("sp_proyecto_desactivar", [idProyecto, modificadoPor]);
}

export function listarProyectos(idUsuarioActor: number, codigoRolActor: CodigoRol) {
  return executeProcedure<Proyecto>("sp_proyecto_listar", [idUsuarioActor, codigoRolActor]);
}

export function asignarTalento(
  idUsuario: number,
  idProyecto: number,
  idPaisCalendario: number | null,
  creadoPor: string
) {
  return executeProcedure("sp_usuario_proyecto_asignar", [
    idUsuario,
    idProyecto,
    idPaisCalendario,
    creadoPor,
  ]);
}

export function asignarPerfilTalento(
  idUsuario: number,
  idProyecto: number,
  idPerfil: number | null,
  modificadoPor: string
) {
  return executeProcedure("sp_usuario_proyecto_asignar_perfil", [
    idUsuario,
    idProyecto,
    idPerfil,
    modificadoPor,
  ]);
}

export function actualizarPaisCalendarioAsignacion(
  idUsuario: number,
  idProyecto: number,
  idPaisCalendario: number | null,
  modificadoPor: string
) {
  return executeProcedure("sp_usuario_proyecto_actualizar_pais_calendario", [
    idUsuario,
    idProyecto,
    idPaisCalendario,
    modificadoPor,
  ]);
}

export function desasignarTalento(idUsuario: number, idProyecto: number, modificadoPor: string) {
  return executeProcedure("sp_usuario_proyecto_desasignar", [idUsuario, idProyecto, modificadoPor]);
}

export function listarAsignados(idProyecto: number) {
  return executeProcedure<UsuarioAsignado>("sp_usuario_proyecto_listar_por_proyecto", [idProyecto]);
}

export function listarMisProyectos(idUsuario: number) {
  return executeProcedure<MiProyecto>("sp_usuario_proyecto_listar_mios", [idUsuario]);
}

export function marcarProyectoPredeterminado(
  idUsuario: number,
  idProyecto: number,
  modificadoPor: string
) {
  return executeProcedure("sp_usuario_proyecto_marcar_predeterminado", [
    idUsuario,
    idProyecto,
    modificadoPor,
  ]);
}
