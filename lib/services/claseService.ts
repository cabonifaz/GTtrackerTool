import { executeProcedure } from "@/lib/db";
import {
  CodigoRol,
  GrupoClase,
  HorarioGrupo,
  RegistroClaseActivo,
  ReporteClasesPorGrupo,
  ReporteClasesPorProfesor,
  SesionClase,
} from "@/lib/types";

// ------------------------------ Grupos --------------------------------
export function crearGrupoClase(
  idProyecto: number,
  nombre: string,
  idProfesor: number,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_grupo: number }>("sp_grupo_clase_crear", [
    idProyecto,
    nombre,
    idProfesor,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function editarGrupoClase(
  idGrupo: number,
  nombre: string,
  idProfesor: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_grupo_clase_editar", [idGrupo, nombre, idProfesor, idEmpresaActor, modificadoPor]);
}

export function desactivarGrupoClase(idGrupo: number, idEmpresaActor: number, modificadoPor: string) {
  return executeProcedure("sp_grupo_clase_desactivar", [idGrupo, idEmpresaActor, modificadoPor]);
}

export function listarGruposClase(idUsuarioActor: number, codigoRolActor: CodigoRol, idEmpresaActor: number) {
  return executeProcedure<GrupoClase>("sp_grupo_clase_listar", [idUsuarioActor, codigoRolActor, idEmpresaActor]);
}

// ----------------------------- Horarios --------------------------------
export function definirHorarioGrupo(
  idGrupo: number,
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure("sp_horario_grupo_definir", [
    idGrupo,
    diaSemana,
    horaInicio,
    horaFin,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function quitarHorarioGrupo(
  idGrupo: number,
  diaSemana: number,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_horario_grupo_quitar", [idGrupo, diaSemana, idEmpresaActor, modificadoPor]);
}

export function listarHorarioGrupo(idGrupo: number, idEmpresaActor: number) {
  return executeProcedure<HorarioGrupo>("sp_horario_grupo_listar", [idGrupo, idEmpresaActor]);
}

// ----------------------------- Sesiones ---------------------------------
export function generarSesionesClase(
  idGrupo: number,
  fechaDesde: string,
  fechaHasta: string,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ sesiones_creadas: number }>("sp_sesion_clase_generar", [
    idGrupo,
    fechaDesde,
    fechaHasta,
    codigoRolActor,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function crearSesionSuelta(
  idGrupo: number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
  tema: string | null,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure<{ id_sesion: number }>("sp_sesion_clase_crear_suelta", [
    idGrupo,
    fecha,
    horaInicio,
    horaFin,
    tema,
    codigoRolActor,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function reprogramarSesionClase(
  idSesion: number,
  nuevaFecha: string,
  nuevaHoraInicio: string,
  nuevaHoraFin: string,
  tema: string | null,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_sesion_clase_reprogramar", [
    idSesion,
    nuevaFecha,
    nuevaHoraInicio,
    nuevaHoraFin,
    tema,
    codigoRolActor,
    idEmpresaActor,
    modificadoPor,
  ]);
}

export function cancelarSesionClase(
  idSesion: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  modificadoPor: string
) {
  return executeProcedure("sp_sesion_clase_cancelar", [idSesion, codigoRolActor, idEmpresaActor, modificadoPor]);
}

export function listarSesionesClase(
  idGrupo: number | null,
  fechaDesde: string,
  fechaHasta: string,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number
) {
  return executeProcedure<SesionClase>("sp_sesion_clase_listar", [
    idGrupo,
    fechaDesde,
    fechaHasta,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
  ]);
}

// -------------------------- Cronometro de sesion --------------------------
export function iniciarSesionClase(
  idSesion: number,
  idUsuarioActor: number,
  codigoRolActor: CodigoRol,
  idEmpresaActor: number,
  creadoPor: string,
  fechaInicio: string | null
) {
  return executeProcedure<{ id_registro: number }>("sp_sesion_clase_iniciar", [
    idSesion,
    idUsuarioActor,
    codigoRolActor,
    idEmpresaActor,
    creadoPor,
    fechaInicio,
  ]);
}

export function detenerSesionClase(idUsuarioActor: number, modificadoPor: string, fechaFin: string | null) {
  return executeProcedure<{ id_registro: number; duracion_segundos: number }>("sp_sesion_clase_detener", [
    idUsuarioActor,
    modificadoPor,
    fechaFin,
  ]);
}

export function obtenerSesionClaseActiva(idUsuarioActor: number) {
  return executeProcedure<RegistroClaseActivo>("sp_registro_clase_obtener_activo", [idUsuarioActor]);
}

// ------------------------------ Reportes ---------------------------------
export function reporteClasesPorProfesor(fechaDesde: string, fechaHasta: string, idEmpresaActor: number) {
  return executeProcedure<ReporteClasesPorProfesor>("sp_reporte_clases_por_profesor", [
    fechaDesde,
    fechaHasta,
    idEmpresaActor,
  ]);
}

export function reporteClasesPorGrupo(fechaDesde: string, fechaHasta: string, idEmpresaActor: number) {
  return executeProcedure<ReporteClasesPorGrupo>("sp_reporte_clases_por_grupo", [
    fechaDesde,
    fechaHasta,
    idEmpresaActor,
  ]);
}
