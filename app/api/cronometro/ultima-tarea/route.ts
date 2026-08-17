import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerUltimaTarea } from "@/lib/services/cronometroService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const ultima = await obtenerUltimaTarea(session.user.idUsuario);
    return NextResponse.json(ultima);
  } catch (err) {
    return handleApiError(err);
  }
}
