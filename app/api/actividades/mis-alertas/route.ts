import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { listarAlertasTalento } from "@/lib/services/actividadService";

// Datos en vivo para el banner de alertas de Actividades por vencer (no
// depende del job periodico -- se recalcula en cada carga de pantalla).
export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const alertas = await listarAlertasTalento(session.user.idUsuario, session.user.idEmpresa!);
    return NextResponse.json(alertas);
  } catch (err) {
    return handleApiError(err);
  }
}
