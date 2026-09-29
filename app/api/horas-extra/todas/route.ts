import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarHorasExtraTodas } from "@/lib/services/horaExtraService";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idsUsuarioParam = params.get("idsUsuario");
  const estado = params.get("estado");

  try {
    const idsUsuario = (idsUsuarioParam ?? "").split(",").filter(Boolean).map(Number);
    const horasExtra = await listarHorasExtraTodas(idsUsuario, estado || null, session.user.idEmpresa!);
    return NextResponse.json(horasExtra);
  } catch (err) {
    return handleApiError(err);
  }
}
