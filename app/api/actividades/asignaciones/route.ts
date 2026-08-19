import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { listarAsignaciones } from "@/lib/services/actividadService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const idProyecto = req.nextUrl.searchParams.get("idProyecto");

  try {
    const asignaciones = await listarAsignaciones(
      idProyecto ? Number(idProyecto) : null,
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!
    );
    return NextResponse.json(asignaciones);
  } catch (err) {
    return handleApiError(err);
  }
}
