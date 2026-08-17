import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { listarMisProyectos } from "@/lib/services/proyectoService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const proyectos = await listarMisProyectos(session.user.idUsuario);
    return NextResponse.json(proyectos);
  } catch (err) {
    return handleApiError(err);
  }
}
