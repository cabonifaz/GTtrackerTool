import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarAusenciasTodas } from "@/lib/services/ausenciaService";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idUsuarioParam = req.nextUrl.searchParams.get("idUsuario");
  const estado = req.nextUrl.searchParams.get("estado");

  try {
    const ausencias = await listarAusenciasTodas(
      idUsuarioParam ? Number(idUsuarioParam) : null,
      estado,
      session.user.idEmpresa!
    );
    return NextResponse.json(ausencias);
  } catch (err) {
    return handleApiError(err);
  }
}
