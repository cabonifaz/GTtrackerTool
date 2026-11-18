import { BusinessError } from "@/lib/db";
import { ProgramaExterno } from "@/lib/types";

// Cliente de la API externa de solo lectura "Control Programa
// Entrenamientos" (horas dictadas por profesores). Nunca se expone el
// token al navegador -- solo se usa server-side.
export interface ClaseDictadaExterna {
  date: string;
  start: string | null;
  end: string | null;
  minutes: number | null;
  plannedMinutes: number | null;
  instructorId: number | null;
  instructorName: string | null;
  instructorEmail: string | null;
  substitute: boolean;
  componentId: number;
  componentName: string;
  groupId: number;
  groupName: string;
  topicId: number;
  topicTitle: string;
}

function configuracion() {
  const baseUrl = process.env.TRAINING_API_URL;
  const token = process.env.TRAINING_API_TOKEN;
  if (!baseUrl || !token) {
    throw new BusinessError(
      "Integracion de entrenamiento no configurada: faltan TRAINING_API_URL / TRAINING_API_TOKEN"
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

export async function listarProgramasExternos(): Promise<ProgramaExterno[]> {
  const { baseUrl, token } = configuracion();
  const res = await fetch(`${baseUrl}/programs`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new BusinessError(`No se pudo listar los programas de entrenamiento (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { data: ProgramaExterno[] };
  return json.data;
}

export async function listarHorasDictadasExternas(
  programId: number,
  from: string,
  to: string
): Promise<ClaseDictadaExterna[]> {
  const { baseUrl, token } = configuracion();
  const params = new URLSearchParams({ programId: String(programId), from, to });
  const res = await fetch(`${baseUrl}/instructor-hours?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new BusinessError(body?.message ?? `No se pudo obtener las horas dictadas (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { data: { classes: ClaseDictadaExterna[] } };
  return json.data.classes;
}
