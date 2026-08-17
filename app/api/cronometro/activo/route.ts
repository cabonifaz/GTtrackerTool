import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerCronometroActivo } from "@/lib/services/cronometroService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const activo = await obtenerCronometroActivo(session.user.idUsuario);
    return NextResponse.json(activo);
  } catch (err) {
    return handleApiError(err);
  }
}
