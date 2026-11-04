import { executeProcedure } from "@/lib/db";
import { TalentoCostoHistorico } from "@/lib/types";

export function asignarCostoTalento(
  idUsuario: number,
  costoMensual: number,
  idMoneda: number,
  idEmpresaActor: number,
  modificadoPor: string,
  fechaDesde: string | null = null
) {
  return executeProcedure("sp_talento_costo_asignar", [
    idUsuario,
    costoMensual,
    idMoneda,
    idEmpresaActor,
    modificadoPor,
    fechaDesde,
  ]);
}

export function historialCostoTalento(idUsuario: number, idEmpresaActor: number) {
  return executeProcedure<TalentoCostoHistorico>("sp_talento_costo_historial", [idUsuario, idEmpresaActor]);
}
