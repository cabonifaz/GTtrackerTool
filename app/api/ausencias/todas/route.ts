import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarAusenciasTodas } from "@/lib/services/ausenciaService";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idsUsuarioParam = req.nextUrl.searchParams.get("idsUsuario");
  const estado = req.nextUrl.searchParams.get("estado");

  const idsUsuario = idsUsuarioParam
    ? idsUsuarioParam.split(",").map(Number).filter((n) => !isNaN(n))
    : null;

  try {
    const ausencias = await listarAusenciasTodas(idsUsuario, estado, session.user.idEmpresa!);
    return NextResponse.json(ausencias);
  } catch (err) {
    return handleApiError(err);
  }
}
