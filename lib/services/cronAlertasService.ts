import { executeProcedure } from "@/lib/db";

export interface SlotAlertaPendiente {
  id_asignacion: number;
  id_usuario: number;
  empresa_slug: string;
  proyecto: string;
  nombre_iniciativa: string | null;
  periodo_hasta: string;
  actividades_cargadas: number;
  clave_alerta: string;
}

export function obtenerSlotsPendientes() {
  return executeProcedure<SlotAlertaPendiente>("sp_alerta_actividades_slots_pendientes", []);
}

export async function marcarAlertaEnviada(idAsignacion: number, claveAlerta: string) {
  const rows = await executeProcedure<{ insertada: number }>("sp_alerta_actividades_marcar_enviada", [
    idAsignacion,
    claveAlerta,
  ]);
  return rows[0].insertada === 1;
}

export async function cerrarAutomaticoVencidas() {
  const rows = await executeProcedure<{ asignaciones_cerradas: number }>(
    "sp_asignacion_cerrar_automatico_vencidas",
    []
  );
  return rows[0].asignaciones_cerradas;
}
