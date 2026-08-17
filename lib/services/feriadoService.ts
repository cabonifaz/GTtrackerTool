import { executeProcedure } from "@/lib/db";
import { Feriado, FeriadoAdmin } from "@/lib/types";

export function crearFeriado(idPais: number, fecha: string, nombre: string, creadoPor: string) {
  return executeProcedure<{ id_feriado: number }>("sp_feriado_crear", [
    idPais,
    fecha,
    nombre,
    creadoPor,
  ]);
}

export function eliminarFeriado(idFeriado: number, modificadoPor: string) {
  return executeProcedure("sp_feriado_eliminar", [idFeriado, modificadoPor]);
}

export function reemplazarFeriadosAnio(idPais: number, anio: number, modificadoPor: string) {
  return executeProcedure("sp_feriado_reemplazar_anio", [idPais, anio, modificadoPor]);
}

export function listarFeriadosProximos(idPais: number, limite: number) {
  return executeProcedure<Feriado>("sp_feriado_listar_proximos", [idPais, limite]);
}

export function listarFeriadosAnio(idPais: number, anio: number) {
  return executeProcedure<Feriado>("sp_feriado_listar_anio", [idPais, anio]);
}

export function listarFeriadosTodos() {
  return executeProcedure<FeriadoAdmin>("sp_feriado_listar_todos", []);
}
