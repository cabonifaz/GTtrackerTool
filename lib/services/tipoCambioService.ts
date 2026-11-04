import { executeProcedure } from "@/lib/db";
import { TipoCambio } from "@/lib/types";

export function asignarTipoCambio(
  anio: number,
  mes: number,
  idMonedaOrigen: number,
  idMonedaDestino: number,
  tasa: number,
  idEmpresaActor: number,
  creadoPor: string
) {
  return executeProcedure("sp_tipo_cambio_asignar", [
    anio,
    mes,
    idMonedaOrigen,
    idMonedaDestino,
    tasa,
    idEmpresaActor,
    creadoPor,
  ]);
}

export function listarTiposCambio(idEmpresaActor: number) {
  return executeProcedure<TipoCambio>("sp_tipo_cambio_listar", [idEmpresaActor]);
}
