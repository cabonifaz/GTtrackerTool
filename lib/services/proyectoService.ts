import { executeProcedure } from "@/lib/db";
import { CodigoRol, MiProyecto, Proyecto, UsuarioAsignado } from "@/lib/types";

export function crearProyecto(
  idCliente: number | null,
  nombre: string,
  descripcion: string | null,
  idEmpresa: number,
  creadoPor: string,
  codigoTipoProyecto: string = "CRONOMETRO"
) {
  return executeProcedure<{ id_proyecto: number }>("sp_proyecto_crear", [
    idCliente,
    nombre,
    descripcion,
    idEmpresa,
    creadoPor,
    codigoTipoProyecto,
  ]);
}

export function tieneProyectoDeTipo(codigoTipoProyecto: string, idEmpresaActor: number) {
  return executeProcedure<{ id_proyecto: number }>("sp_proyecto_listar_por_tipo", [
    codigoTipoProyecto,
    idEmpresaActor,
  ]);
}

export function editarProyecto(
  idProyecto: number,
  nombre: string,
  descripcion: string | null,
  codigoEstado: string,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_proyecto_editar", [
    idProyecto,
    nombre,
    descripcion,
    codigoEstado,
    idEmpresaActor,
    modificadoPor,
  ]);
}

export function desactivarProyecto(idProyecto: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_proyecto_desactivar", [idProyecto, idEmpresaActor, modificadoPor]);
}

export function listarProyectos(idUsuarioActor: number, codigoRolActor: CodigoRol, idEmpresaActor: number) {
  return executeProcedure<Proyecto>("sp_proyecto_listar", [idUsuarioActor, codigoRolActor, idEmpresaActor]);
}

export function asignarTalento(
  idUsuario: number,
  idProyecto: number,
  idPaisCalendario: number | null,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure("sp_usuario_proyecto_asignar", [
    idUsuario,
    idProyecto,
    idPaisCalendario,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function asignarPerfilTalento(
  idUsuario: number,
  idProyecto: number,
  idPerfil: number | null,
  idEmpresaActor: number,
  modificadoPor: string,
  fechaDesde: string | null = null
) {
  return executeProcedure("sp_usuario_proyecto_asignar_perfil", [
    idUsuario,
    idProyecto,
    idPerfil,
    idEmpresaActor,
    modificadoPor,
    fechaDesde,
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

export function desasignarTalento(
  idUsuario: number,
  idProyecto: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_usuario_proyecto_desasignar", [idUsuario, idProyecto, idEmpresaActor, modificadoPor]);
}

export function listarAsignados(idProyecto: number, idEmpresaActor: number) {
  return executeProcedure<UsuarioAsignado>("sp_usuario_proyecto_listar_por_proyecto", [idProyecto, idEmpresaActor]);
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
