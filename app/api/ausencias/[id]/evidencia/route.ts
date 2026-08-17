import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerEvidenciaAusencia } from "@/lib/services/ausenciaService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const fila = await obtenerEvidenciaAusencia(Number(params.id));
    if (!fila || !fila.evidencia) {
      return NextResponse.json({ error: "Sin evidencia" }, { status: 404 });
    }
    if (session.user.rol !== "ADMIN" && fila.id_usuario !== session.user.idUsuario) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return new NextResponse(new Uint8Array(fila.evidencia), {
      status: 200,
      headers: {
        "Content-Type": fila.evidencia_tipo ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
