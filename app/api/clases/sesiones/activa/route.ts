import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerSesionClaseActiva } from "@/lib/services/claseService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const activa = await obtenerSesionClaseActiva(session.user.idUsuario);
    return NextResponse.json(activa[0] ?? null);
  } catch (err) {
    return handleApiError(err);
  }
}
