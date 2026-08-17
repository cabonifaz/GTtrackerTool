import { executeProcedure } from "@/lib/db";
import { MaestroItem } from "@/lib/types";

export function listarMaestro(tipoMaestro: string) {
  return executeProcedure<MaestroItem>("sp_maestro_listar", [tipoMaestro]);
}
