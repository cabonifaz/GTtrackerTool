import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarTareasPorTalentos } from "@/lib/services/tareaService";

// Busca las tareas en las que ya trabajaron uno o varios talentos
// puntuales. Panel de busqueda del Admin -- siempre exige al menos un
// talento (no existe un "traer todo" en esta ruta).
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idsUsuarioParam = req.nextUrl.searchParams.get("idsUsuario");
  const idsUsuario = (idsUsuarioParam ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  if (idsUsuario.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un talento" }, { status: 400 });
  }

  try {
    const tareas = await listarTareasPorTalentos(idsUsuario, session.user.idEmpresa!);
    return NextResponse.json(tareas);
  } catch (err) {
    return handleApiError(err);
  }
}
