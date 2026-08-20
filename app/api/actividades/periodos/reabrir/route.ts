import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reabrirPeriodo } from "@/lib/services/actividadService";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idProyecto, periodoDesde, periodoHasta } = await req.json();

  try {
    const result = await reabrirPeriodo(
      Number(idProyecto),
      periodoDesde,
      periodoHasta,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0]);
  } catch (err) {
    return handleApiError(err);
  }
}
