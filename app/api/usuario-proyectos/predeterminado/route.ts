import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { marcarProyectoPredeterminado } from "@/lib/services/proyectoService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { idProyecto } = await req.json();

  try {
    await marcarProyectoPredeterminado(session.user.idUsuario, Number(idProyecto), session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
