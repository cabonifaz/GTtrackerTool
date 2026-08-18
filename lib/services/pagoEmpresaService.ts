import { executeProcedure } from "@/lib/db";
import { PagoEmpresa } from "@/lib/types";

export function crearPagoEmpresa(
  idEmpresa: number,
  monto: number,
  codigoMoneda: string,
  fechaPago: string,
  periodoDesde: string | null,
  periodoHasta: string | null,
  referencia: string | null,
  notas: string | null,
  creadoPor: string
) {
  return executeProcedure<{ id_pago: number }>("sp_pago_empresa_crear", [
    idEmpresa,
    monto,
    codigoMoneda,
    fechaPago,
    periodoDesde,
    periodoHasta,
    referencia,
    notas,
    creadoPor,
  ]);
}

export function eliminarPagoEmpresa(idPago: number, idEmpresa: number, modificadoPor: string) {
  return executeProcedure("sp_pago_empresa_eliminar", [idPago, idEmpresa, modificadoPor]);
}

export function listarPagosPorEmpresa(idEmpresa: number) {
  return executeProcedure<PagoEmpresa>("sp_pago_empresa_listar_por_empresa", [idEmpresa]);
}
