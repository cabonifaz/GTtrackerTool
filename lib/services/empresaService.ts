import { executeProcedure } from "@/lib/db";
import { CodigoTipoPlanEmpresa, Empresa } from "@/lib/types";

export interface PlanEmpresaInput {
  codigoTipoPlan: CodigoTipoPlanEmpresa;
  limiteUsuarios: number | null;
  tarifaPorUsuario: number | null;
  codigoMoneda: string | null;
  publicidadActiva: boolean;
}

export function crearEmpresa(
  nombre: string,
  slug: string,
  colorPrimario: string | null,
  colorSecundario: string | null,
  plan: PlanEmpresaInput,
  ocultarNombre: boolean,
  ocultarCredito: boolean,
  dominioCorreo: string | null,
  creadoPor: string
) {
  return executeProcedure<{ id_empresa: number }>("sp_empresa_crear", [
    nombre,
    slug,
    colorPrimario,
    colorSecundario,
    plan.codigoTipoPlan,
    plan.limiteUsuarios,
    plan.tarifaPorUsuario,
    plan.codigoMoneda,
    plan.publicidadActiva ? 1 : 0,
    ocultarNombre ? 1 : 0,
    ocultarCredito ? 1 : 0,
    dominioCorreo,
    creadoPor,
  ]);
}

export function editarEmpresa(
  idEmpresa: number,
  nombre: string,
  colorPrimario: string | null,
  colorSecundario: string | null,
  plan: PlanEmpresaInput,
  ocultarNombre: boolean,
  ocultarCredito: boolean,
  dominioCorreo: string | null,
  modificadoPor: string
) {
  return executeProcedure("sp_empresa_editar", [
    idEmpresa,
    nombre,
    colorPrimario,
    colorSecundario,
    plan.codigoTipoPlan,
    plan.limiteUsuarios,
    plan.tarifaPorUsuario,
    plan.codigoMoneda,
    plan.publicidadActiva ? 1 : 0,
    ocultarNombre ? 1 : 0,
    ocultarCredito ? 1 : 0,
    dominioCorreo,
    modificadoPor,
  ]);
}

export function actualizarLogoEmpresa(idEmpresa: number, logo: Buffer, logoTipo: string, modificadoPor: string) {
  return executeProcedure("sp_empresa_logo_actualizar", [idEmpresa, logo, logoTipo, modificadoPor]);
}

export async function obtenerLogoEmpresa(slug: string) {
  const rows = await executeProcedure<{ logo: Buffer | null; logo_tipo: string | null }>(
    "sp_empresa_obtener_logo",
    [slug]
  );
  return rows[0] ?? null;
}

export function suspenderEmpresa(idEmpresa: number, modificadoPor: string) {
  return executeProcedure("sp_empresa_suspender", [idEmpresa, modificadoPor]);
}

export function reactivarEmpresa(idEmpresa: number, modificadoPor: string) {
  return executeProcedure("sp_empresa_reactivar", [idEmpresa, modificadoPor]);
}

export function listarEmpresas() {
  return executeProcedure<Empresa>("sp_empresa_listar", []);
}

export async function obtenerEmpresaPorSlug(slug: string) {
  const rows = await executeProcedure<Empresa>("sp_empresa_obtener_por_slug", [slug]);
  return rows[0] ?? null;
}
